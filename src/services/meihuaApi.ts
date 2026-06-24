import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'

/** 与 yiBackend POST /api/meihua/divine 对齐 */

export interface MeihuaGua {
    number: number
    name: string
    lower_trigram: string
    upper_trigram: string
    bits: number[]
}

export interface MeihuaDivineRequest {
    method: 'time' | 'number'
    question: string
    number?: number
}

/** 起数成卦结果（不含解读），秒级返回，供前端演数动画与卦象展示 */
export interface MeihuaCastResponse {
    method: string
    method_label: string
    method_detail: string
    lower_trigram: string
    upper_trigram: string
    moving_line: number
    ti_trigram: string
    yong_trigram: string
    ben_gua: MeihuaGua
    bian_gua: MeihuaGua
    hu_gua: MeihuaGua
}

export interface MeihuaDivineResponse extends MeihuaCastResponse {
    interpretation: string
}

function parseDetail (data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const d = (data as { detail?: unknown }).detail
    return typeof d === 'string' ? d : null
}

/** 仅起数成卦（不含解读），用于即时演数动画与卦象展示 */
export async function postMeihuaCast (body: MeihuaDivineRequest): Promise<MeihuaCastResponse> {
    const url = `${getApiBaseUrl()}/api/meihua/cast`
    const res = await Taro.request<MeihuaCastResponse>({
        url,
        method: 'POST',
        header: buildAuthHeaders(),
        data: body
    })

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseDetail(res.data) ?? `请求失败（${status}）`)
    }

    if (!res.data || typeof res.data !== 'object' || !('ben_gua' in res.data)) {
        throw new Error('返回数据格式异常')
    }

    return res.data
}

export async function postMeihuaDivine (body: MeihuaDivineRequest): Promise<MeihuaDivineResponse> {
    const url = `${getApiBaseUrl()}/api/meihua/divine`
    const res = await Taro.request<MeihuaDivineResponse>({
        url,
        method: 'POST',
        header: buildAuthHeaders(),
        data: body
    })

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseDetail(res.data) ?? `请求失败（${status}）`)
    }

    if (!res.data || typeof res.data !== 'object' || !('ben_gua' in res.data)) {
        throw new Error('返回数据格式异常')
    }

    return res.data
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function streamInterpretationText (
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
