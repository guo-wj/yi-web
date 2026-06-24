import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'

/** 与 yiBackend GET /api/almanac/day 对齐 */

export interface AlmanacSolar {
    date: string
    year: number
    month: number
    day: number
    weekday: string
    constellation: string
}

export interface AlmanacLunar {
    date: string
    month_day: string
    year_ganzhi: string
    month_ganzhi: string
    day_ganzhi: string
    shengxiao: string
    nayin: string
}

export interface AlmanacJieQi {
    current: string | null
    term: string
    next_name: string
    next_date: string
}

export interface AlmanacDetails {
    chong: string
    sha: string
    zhishen: string
    zhishen_luck: string
    jian_chu: string
    xiu: string
    xiu_luck: string
    ji_shen_yi_qu: string[]
    xiong_sha_yi_ji: string[]
    peng_zu: string[]
    xi_shen: string
    cai_shen: string
    fu_shen: string
    yang_gui: string
    yin_gui: string
    ji_shi: string[]
    tai_shen: string
    nine_star: string
}

export interface AlmanacResponse {
    solar: AlmanacSolar
    lunar: AlmanacLunar
    festivals: string[]
    jieqi: AlmanacJieQi
    yi: string[]
    ji: string[]
    details: AlmanacDetails
}

function parseDetail (data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const d = (data as { detail?: unknown }).detail
    return typeof d === 'string' ? d : null
}

/** 查询某日老黄历；date 省略则取后端当天。 */
export async function getAlmanacDay (date?: string): Promise<AlmanacResponse> {
    const url = `${getApiBaseUrl()}/api/almanac/day`
    const res = await Taro.request<AlmanacResponse>({
        url,
        method: 'GET',
        data: date ? { date } : {}
    })

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseDetail(res.data) ?? `请求失败（${status}）`)
    }
    if (!res.data || typeof res.data !== 'object' || !('solar' in res.data)) {
        throw new Error('返回数据格式异常')
    }
    return res.data
}
