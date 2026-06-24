import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'

/** 与 yi-back-end POST /api/face/analyze 对齐 */

export type FaceSlot = 'front' | 'side' | 'extra'

export interface FaceAnalyzeRequest {
    /** 1～3 张面部照片 data URL 或 base64 */
    faces: string[]
    /** 与 faces 一一对应：front=正面照 side=侧面照 extra=补充角度 */
    slots: FaceSlot[]
}

export interface FaceAnalyzeResponse {
    content: string
    summary?: string | null
    summaries?: string[] | null
}

const FACE_REQUEST_TIMEOUT_MS = 180_000

function parseApiError (data: unknown, status: number): string {
    if (!data || typeof data !== 'object') return `请求失败（${status}）`
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
        const msgs = detail
            .map((item) => {
                if (!item || typeof item !== 'object') return null
                const msg = (item as { msg?: unknown }).msg
                return typeof msg === 'string' ? msg : null
            })
            .filter(Boolean)
        if (msgs.length) return msgs.join('；')
    }
    return `请求失败（${status}）`
}

function mimeFromPath (path: string): string {
    const lower = path.toLowerCase()
    if (lower.includes('.png')) return 'image/png'
    if (lower.includes('.webp')) return 'image/webp'
    if (lower.includes('.gif')) return 'image/gif'
    return 'image/jpeg'
}

async function compressImagePath (path: string): Promise<string> {
    try {
        const { tempFilePath } = await Taro.compressImage({ src: path, quality: 75 })
        return tempFilePath || path
    } catch {
        return path
    }
}

async function pathToDataUrl (path: string): Promise<string> {
    const filePath = await compressImagePath(path)

    if (typeof window !== 'undefined' && (filePath.startsWith('blob:') || filePath.startsWith('http'))) {
        const res = await fetch(filePath)
        const blob = await res.blob()
        const mime = blob.type?.startsWith('image/') ? blob.type : mimeFromPath(filePath)
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('图片读取失败'))
            reader.readAsDataURL(blob)
        })
    }

    const mime = mimeFromPath(filePath)
    return new Promise((resolve, reject) => {
        Taro.getFileSystemManager().readFile({
            filePath,
            encoding: 'base64',
            success: (r) => {
                const raw = r.data
                if (typeof raw !== 'string') {
                    reject(new Error('图片读取失败'))
                    return
                }
                resolve(`data:${mime};base64,${raw}`)
            },
            fail: () => reject(new Error('图片读取失败'))
        })
    })
}

export async function postFaceAnalyze (
    imagePaths: string[],
    slots: FaceSlot[]
): Promise<FaceAnalyzeResponse> {
    if (imagePaths.length < 1 || imagePaths.length > 3) {
        throw new Error('请上传 1～3 张面部图片')
    }
    if (slots.length !== imagePaths.length) {
        throw new Error('图片与槽位数量不一致')
    }

    const faces = await Promise.all(imagePaths.map(pathToDataUrl))

    const url = `${getApiBaseUrl()}/api/face/analyze`
    const res = await Taro.request<FaceAnalyzeResponse>({
        url,
        method: 'POST',
        header: buildAuthHeaders(),
        data: { faces, slots } satisfies FaceAnalyzeRequest,
        timeout: FACE_REQUEST_TIMEOUT_MS
    })

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseApiError(res.data, status))
    }

    if (!res.data || typeof res.data !== 'object' || typeof res.data.content !== 'string') {
        throw new Error('返回数据格式异常')
    }

    return res.data
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function streamFaceText (
    text: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
): Promise<void> {
    const chars = [...text]
    for (let i = 0; i < chars.length; i += 3) {
        if (signal?.aborted) return
        onChunk(chars.slice(i, i + 3).join(''))
        await sleep(18)
    }
}
