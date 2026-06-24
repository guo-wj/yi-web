import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'

/** 与 yiBackend POST /api/lottery/draw 对齐 */

export interface LotteryAspect {
    label: string
    value: string
}

export interface LotterySlip {
    id: number
    tier: string
    title: string
    poem: string
    /** 签位，如「午宫」 */
    palace?: string
}

export interface LotteryDrawResponse {
    solar_date: string
    lunar_summary: string
    slip: LotterySlip
    interpretation: string
    /** 分项运势，缺省时前端展示占位文案 */
    aspects?: LotteryAspect[]
}

export interface LotteryDrawRequest {
    name?: string
    focus?: string
    question?: string
    /** 占问日 YYYY-MM-DD，不传则由后端用当天 */
    solar_date?: string
}

function parseDetail (data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const d = (data as { detail?: unknown }).detail
    if (typeof d === 'string') return d
    return null
}

/**
  * 抽签并解签。H5 直连本机后端即可；微信小程序需配置合法域名或走服务端转发。
  */
export async function postLotteryDraw (
    body: LotteryDrawRequest
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
        const msg =
            parseDetail(res.data) ?? `请求失败（${status}）`
        throw new Error(msg)
    }

    if (!res.data || typeof res.data !== 'object' || !('slip' in res.data)) {
        throw new Error('返回数据格式异常')
    }

    return res.data
}
