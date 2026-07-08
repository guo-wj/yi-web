import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'

/** 与 yiBackend POST /api/lottery/* 对齐 */

export interface LotteryAspect {
    label: string
    value: string
}

export interface LotterySlip {
    id: number
    tier: string
    title: string
    poem: string
    gist: string
    palace?: string
}

export interface LotteryDrawResponse {
    solar_date: string
    lunar_summary: string
    slip: LotterySlip
}

export interface LotterySlipResult extends LotteryDrawResponse {
    interpretation?: string
    aspects?: LotteryAspect[]
}

export interface LotteryInterpretResponse {
    interpretation: string
}

export interface LotteryDrawRequest {
    name?: string
    focus?: string
    question?: string
    solar_date?: string
}

export interface LotteryInterpretRequest {
    slip_id: number
    name?: string
    focus?: string
    question?: string
    solar_date?: string
}

function parseDetail (data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const d = (data as { detail?: unknown }).detail
    if (typeof d === 'string') return d
    return null
}

/** 摇签：仅出签，不含 AI 解签 */
export async function postLotteryDraw (
    body: LotteryDrawRequest = {}
): Promise<LotteryDrawResponse> {
    const url = `${getApiBaseUrl()}/api/lottery/draw`
    const res = await Taro.request<LotteryDrawResponse>({
        url,
        method: 'POST',
        header: buildAuthHeaders(),
        data: body
    })

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseDetail(res.data) ?? `请求失败（${status}）`)
    }

    if (!res.data || typeof res.data !== 'object' || !('slip' in res.data)) {
        throw new Error('返回数据格式异常')
    }

    return res.data
}

/** AI 解签 */
export async function postLotteryInterpret (
    body: LotteryInterpretRequest
): Promise<LotteryInterpretResponse> {
    const url = `${getApiBaseUrl()}/api/lottery/interpret`
    const res = await Taro.request<LotteryInterpretResponse>({
        url,
        method: 'POST',
        header: buildAuthHeaders(),
        data: body
    })

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseDetail(res.data) ?? `解签失败（${status}）`)
    }

    if (!res.data || typeof res.data !== 'object' || !('interpretation' in res.data)) {
        throw new Error('返回数据格式异常')
    }

    return res.data
}
