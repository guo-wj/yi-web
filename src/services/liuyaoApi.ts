import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { buildAuthHeaders } from '@/services/http'

/** 与 yiBackend POST /api/liuyao/cast 对齐 */

export interface LiuyaoGua {
    number: number
    name: string
    lower_trigram: string
    upper_trigram: string
    /** 六爻阴阳，自下而上，1=阳 0=阴 */
    bits: number[]
}

export interface LiuyaoLineOut {
    /** 爻位：1=初爻（最下），6=上爻 */
    position: number
    yao_value: number
    name: string
    is_yang: boolean
    is_moving: boolean
    symbol: string
}

export interface LiuyaoCastRequest {
    question: string
    /** 六次摇钱结果，自下而上，每爻 6/7/8/9 */
    yao_values: number[]
}

export interface LiuyaoCastResponse {
    lines: LiuyaoLineOut[]
    ben_gua: LiuyaoGua
    bian_gua: LiuyaoGua | null
    /** 动爻爻位（1~6，自下而上） */
    moving_positions: number[]
    interpretation: string
}

function parseDetail (data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const d = (data as { detail?: unknown }).detail
    return typeof d === 'string' ? d : null
}

/** 提交六爻，由后端推算本卦/变卦并生成解卦 */
export async function postLiuyaoCast (body: LiuyaoCastRequest): Promise<LiuyaoCastResponse> {
    const url = `${getApiBaseUrl()}/api/liuyao/cast`
    const res = await Taro.request<LiuyaoCastResponse>({
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

/** 将完整解卦正文按块输出，模拟流式阅读体验 */
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
