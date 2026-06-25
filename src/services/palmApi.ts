import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'
import { pathToDataUrl } from '@/utils/imageUpload'

export interface PalmImagesRequest {
    /** data URL 或 base64 字符串 */
    left_palm: string
    right_palm: string
}

export type PalmLineKey = 'life' | 'head' | 'heart'
export type PalmMountKey = 'venus' | 'jupiter' | 'saturn' | 'apollo' | 'mercury'
export type PalmPrimaryHand = 'left' | 'right'

export interface PalmLineDetail {
    key: PalmLineKey
    name_cn: string
    name_en: string
    /** 2-4 字特征词，如 深长、清晰、柔缓 */
    attribute: string
    /** 形质参考分 1-5 */
    score: number
    description: string
}

export interface PalmMountDetail {
    key: PalmMountKey
    name_cn: string
    /** 图标单字：金木土日水 */
    icon_text: string
    /** 两个主题词 */
    keywords: string[]
    /** 旺|盛|匀|平|弱 */
    status: string
    description: string
}

/** /extract 返回：先展示头部标签 */
export interface PalmExtractResponse {
    left_features: Record<string, unknown>
    right_features: Record<string, unknown>
    left_summary: string
    right_summary: string
    palm_type: string
    complexion: string
    primary_hand: PalmPrimaryHand
}

/** /interpret 请求 */
export interface PalmInterpretRequest {
    left_features: Record<string, unknown>
    right_features: Record<string, unknown>
    primary_hand?: PalmPrimaryHand | null
}

/** /interpret 返回：三线五丘正文 */
export interface PalmStructuredBody {
    content: string
    palm_type: string
    complexion: string
    primary_hand: PalmPrimaryHand
    overview: string
    lines: PalmLineDetail[]
    mounts: PalmMountDetail[]
}

export interface PalmAnalyzeResponse extends PalmStructuredBody {
    left_summary?: string | null
    right_summary?: string | null
}

const PALM_EXTRACT_TIMEOUT_MS = 120_000
const PALM_INTERPRET_TIMEOUT_MS = 90_000

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

async function postPalmJson<T> (
    path: '/extract' | '/interpret' | '/analyze',
    data: unknown,
    timeout: number
): Promise<T> {
    const url = `${getApiBaseUrl()}/api/palm${path}`
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

async function buildPalmImages (leftPath: string, rightPath: string): Promise<PalmImagesRequest> {
    const [left_palm, right_palm] = await Promise.all([
        pathToDataUrl(leftPath),
        pathToDataUrl(rightPath)
    ])
    return { left_palm, right_palm }
}

/** 并行视觉提取左右掌特征（约 5–10s） */
export async function postPalmExtract (
    leftPath: string,
    rightPath: string
): Promise<PalmExtractResponse> {
    const data = await buildPalmImages(leftPath, rightPath)
    return postPalmJson<PalmExtractResponse>('/extract', data, PALM_EXTRACT_TIMEOUT_MS)
}

/** 基于特征生成三线五丘解读（约 3–6s） */
export async function postPalmInterpret (
    body: PalmInterpretRequest
): Promise<PalmStructuredBody> {
    return postPalmJson<PalmStructuredBody>('/interpret', body, PALM_INTERPRET_TIMEOUT_MS)
}

/** 分段解析：先 extract 回调头部，再 interpret 返回完整结果 */
export async function postPalmAnalyze (
    leftPath: string,
    rightPath: string,
    options?: {
        onExtracted?: (extracted: PalmExtractResponse) => void
    }
): Promise<PalmAnalyzeResponse> {
    const extracted = await postPalmExtract(leftPath, rightPath)
    options?.onExtracted?.(extracted)

    const interpreted = await postPalmInterpret({
        left_features: extracted.left_features,
        right_features: extracted.right_features,
        primary_hand: extracted.primary_hand
    })

    return {
        ...interpreted,
        left_summary: extracted.left_summary,
        right_summary: extracted.right_summary
    }
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
