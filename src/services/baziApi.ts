import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'

/** 与 yiBackend POST /api/bazi/analyze 对齐 */

export interface BaziAnalyzeRequest {
    gender: string
    birth_place: string
    calendar: 'solar' | 'lunar'
    birth_year: number
    birth_month: number
    birth_day: number
    is_leap_month?: boolean
    birth_hour: string
    sexual_orientation: string
    focus: string[]
}

export interface BaziAnalyzeResponse {
    birth_solar: string
    birth_hour_label: string
    lunar_summary: string
    pillars_hint: string
    focus: string[]
    content: string
}

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

export async function postBaziAnalyze (body: BaziAnalyzeRequest): Promise<BaziAnalyzeResponse> {
    const url = `${getApiBaseUrl()}/api/bazi/analyze`
    const res = await Taro.request<BaziAnalyzeResponse>({
        url,
        method: 'POST',
        header: buildAuthHeaders(),
        data: body
    })

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseApiError(res.data, status))
    }

    if (!res.data || typeof res.data !== 'object' || !('content' in res.data)) {
        throw new Error('返回数据格式异常')
    }

    return res.data
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function streamBaziText (
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
