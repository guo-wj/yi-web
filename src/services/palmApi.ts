import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'

/** 与 yi-back-end POST /api/palm/analyze 对齐 */

export interface PalmAnalyzeRequest {
    /** data URL 或 base64 字符串 */
    left_palm: string
    right_palm: string
}

export interface PalmAnalyzeResponse {
    content: string
    left_summary?: string | null
    right_summary?: string | null
}

/** 掌纹识别含两次视觉 + 一次文本生成，耗时较长 */
const PALM_REQUEST_TIMEOUT_MS = 180_000

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

export async function postPalmAnalyze (
    leftPath: string,
    rightPath: string
): Promise<PalmAnalyzeResponse> {
    const [left_palm, right_palm] = await Promise.all([
        pathToDataUrl(leftPath),
        pathToDataUrl(rightPath)
    ])

    const url = `${getApiBaseUrl()}/api/palm/analyze`
    const res = await Taro.request<PalmAnalyzeResponse>({
        url,
        method: 'POST',
        header: buildAuthHeaders(),
        data: { left_palm, right_palm } satisfies PalmAnalyzeRequest,
        timeout: PALM_REQUEST_TIMEOUT_MS
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

/** 将完整解读正文按块输出，模拟流式阅读体验 */
export async function streamPalmText (
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
