/** yi-back-end 根地址（与仓库 yi-back-end 对应），勿尾斜杠 */

import Taro from '@tarojs/taro'

const DEFAULT_API_BASE = '/api'

function stripTrailingSlash (s: string): string {
    return s.replace(/\/+$/, '')
}

function readProcessEnv (key: 'NODE_ENV' | 'TARO_APP_API_BASE'): string | undefined {
    try {
        if (typeof process !== 'undefined' && process.env) {
            const value = process.env[key]
            return typeof value === 'string' ? value : undefined
        }
    } catch {
        /* H5 运行时可能无 process */
    }
    return undefined
}

/** H5 开发态是否应走 devServer 同源代理（/api -> yi-back-end） */
function shouldUseH5DevProxy (): boolean {
    try {
        if (Taro.getEnv() !== Taro.ENV_TYPE.WEB) return false
    } catch {
        return false
    }

    // 优先用页面地址判断，避免浏览器无 process 时抛错
    if (typeof window !== 'undefined' && window.location) {
        const { hostname, port } = window.location
        if (/^(localhost|127\.0\.0\.1)$/i.test(hostname)) return true
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) && port === '10086') {
            return true
        }
    }

    return readProcessEnv('NODE_ENV') === 'development'
}

/**
 * - 已配置 `TARO_APP_API_BASE` 时优先使用（生产 / 小程序真机联调等）。
 * - H5 开发：走相对路径 `''`，由 webpack devServer 将 `/api` 代理到 yi-back-end。
 * - 否则回退 `/api`。
 */
export function getApiBaseUrl (): string {
    const configured = readProcessEnv('TARO_APP_API_BASE')
    if (configured && configured.trim() !== '') {
        return stripTrailingSlash(configured.trim())
    }

    if (shouldUseH5DevProxy()) {
        return ''
    }

    return DEFAULT_API_BASE
}
