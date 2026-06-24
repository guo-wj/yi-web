import Taro from '@tarojs/taro'

import { getApiBaseUrl } from '@/config/apiBase'
import { getToken } from '@/utils/auth'

export function parseApiDetail (data: unknown): string | null {
    if (!data || typeof data !== 'object') return null
    const d = (data as { detail?: unknown }).detail
    if (typeof d === 'string') return d
    if (Array.isArray(d)) {
        const msgs = d
            .map((item) => {
                if (!item || typeof item !== 'object') return null
                const msg = (item as { msg?: unknown }).msg
                return typeof msg === 'string' ? msg : null
            })
            .filter(Boolean)
        if (msgs.length) return msgs.join('；')
    }
    return null
}

export function buildAuthHeaders (extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extra
    }
    const token = getToken()
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }
    return headers
}

interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: unknown
    auth?: boolean
    fallbackError?: string
}

export async function apiRequest<T> (
    path: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const {
        method = 'GET',
        data,
        auth = false,
        fallbackError = '请求失败'
    } = options

    const url = `${getApiBaseUrl()}${path}`
    let res: Taro.request.SuccessCallbackResult<T>

    try {
        res = await Taro.request<T>({
            url,
            method,
            header: auth ? buildAuthHeaders() : { 'Content-Type': 'application/json' },
            data
        })
    } catch {
        throw new Error('网络请求失败，请确认后端服务已启动')
    }

    const status = res.statusCode ?? 0
    if (status < 200 || status >= 300) {
        throw new Error(parseApiDetail(res.data) ?? `${fallbackError}（${status}）`)
    }

    return res.data
}
