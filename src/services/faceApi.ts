import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'

/** 与 yi-back-end POST /api/face/extract、/interpret 对齐 */

export type FaceSlot = 'front' | 'side' | 'extra'

export interface FaceAnalyzeRequest {
    /** 1～3 张面部照片 data URL 或 base64 */
    faces: string[]
    /** 与 faces 一一对应：front=正面照 side=侧面照 extra=补充角度 */
    slots: FaceSlot[]
}

export type FaceStopKey = 'upper' | 'middle' | 'lower'
export type FaceOrganKey = 'brow' | 'eye' | 'nose' | 'mouth' | 'ear'

export interface FaceStopDetail {
    key: FaceStopKey
    name_cn: string
    /** 部位与主运，如 发际至眉 · 主早年 */
    region: string
    /** 2-4 字特征词 */
    attribute: string
    /** 形质参考分 1-5 */
    score: number
    description: string
}

export interface FaceOrganDetail {
    key: FaceOrganKey
    name_cn: string
    /** 图标单字：眉眼鼻口耳 */
    icon_text: string
    /** 传统官名，如 保寿官 */
    office: string
    /** 两个主题词 */
    keywords: string[]
    /** 旺|盛|匀|平|弱 */
    status: string
    description: string
}

export interface FaceStopPreview {
    key: FaceStopKey
    name_cn: string
    region: string
    attribute: string
    hint: string
}

export interface FaceOrganPreview {
    key: FaceOrganKey
    name_cn: string
    icon_text: string
    office: string
    keywords: string[]
    status: string
    attribute: string
    hint: string
}

export interface FaceExtractResponse {
    face_type: string
    face_shape: string
    complexion: string
    summary: string
    summaries: string[]
    extract_overview: string
    preview_stops: FaceStopPreview[]
    preview_organs: FaceOrganPreview[]
    features: Record<string, unknown>
}

export interface FaceInterpretRequest {
    features: Record<string, unknown>
}

export interface FaceStructuredBody {
    content: string
    face_type: string
    complexion: string
    overview: string
    closing_summary: string
    advice_items: string[]
    stops: FaceStopDetail[]
    organs: FaceOrganDetail[]
}

export interface FaceAnalyzeResponse extends FaceStructuredBody {
    /** 面相解读正文（Markdown，兼容旧版） */
    content: string
    /** 五行面型，如 木形面 */
    face_type: string
    /** 气色，如 明润 */
    complexion: string
    /** 面相综述 */
    overview: string
    /** 三停结构化解读 */
    stops: FaceStopDetail[]
    /** 五官结构化解读 */
    organs: FaceOrganDetail[]
    summary?: string | null
    summaries?: string[] | null
    extract_overview?: string | null
    preview_stops?: FaceStopPreview[] | null
    preview_organs?: FaceOrganPreview[] | null
}

const FACE_EXTRACT_TIMEOUT_MS = 120_000
const FACE_INTERPRET_TIMEOUT_MS = 90_000

function parseApiError (data: unknown, status: number): string {
    if (status === 429) {
        const detail = data && typeof data === 'object'
            ? (data as { detail?: unknown }).detail
            : null
        if (typeof detail === 'string' && detail) return detail
        return '今日识别次数已达上限，明日再来。'
    }
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

async function postFaceJson<T> (
    path: '/extract' | '/interpret',
    data: unknown,
    timeout: number
): Promise<T> {
    const url = `${getApiBaseUrl()}/api/face${path}`
    const res = await Taro.request<T>({
        url,
        method: 'POST',
        header: buildAuthHeaders(),
        data,
        timeout
    })

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseApiError(res.data, status))
    }

    if (!res.data || typeof res.data !== 'object') {
        throw new Error('返回数据格式异常')
    }

    return res.data
}

async function buildFacePayload (
    imagePaths: string[],
    slots: FaceSlot[]
): Promise<FaceAnalyzeRequest> {
    const faces = await Promise.all(imagePaths.map(pathToDataUrl))
    return { faces, slots }
}

export async function postFaceExtract (
    imagePaths: string[],
    slots: FaceSlot[]
): Promise<FaceExtractResponse> {
    if (imagePaths.length < 1 || imagePaths.length > 3) {
        throw new Error('请上传 1～3 张面部图片')
    }
    if (slots.length !== imagePaths.length) {
        throw new Error('图片与槽位数量不一致')
    }
    const data = await buildFacePayload(imagePaths, slots)
    return postFaceJson<FaceExtractResponse>('/extract', data, FACE_EXTRACT_TIMEOUT_MS)
}

export async function postFaceInterpret (
    body: FaceInterpretRequest
): Promise<FaceStructuredBody> {
    return postFaceJson<FaceStructuredBody>('/interpret', body, FACE_INTERPRET_TIMEOUT_MS)
}

export async function postFaceAnalyze (
    imagePaths: string[],
    slots: FaceSlot[],
    options?: {
        onExtracted?: (extracted: FaceExtractResponse) => void
    }
): Promise<FaceAnalyzeResponse> {
    if (imagePaths.length < 1 || imagePaths.length > 3) {
        throw new Error('请上传 1～3 张面部图片')
    }
    if (slots.length !== imagePaths.length) {
        throw new Error('图片与槽位数量不一致')
    }

    const extracted = await postFaceExtract(imagePaths, slots)
    options?.onExtracted?.(extracted)

    const interpreted = await postFaceInterpret({ features: extracted.features })

    return {
        ...interpreted,
        summary: extracted.summary,
        summaries: extracted.summaries
    }
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
