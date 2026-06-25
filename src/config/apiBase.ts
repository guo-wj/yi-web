/** yi-back-end 根地址（与仓库 yi-back-end 对应），勿尾斜杠 */

import Taro from '@tarojs/taro'

function stripTrailingSlash (s: string): string {
    return s.replace(/\/+$/, '')
}

function readProcessEnv (key: 'NODE_ENV' | 'TARO_APP_API_BASE' | 'TARO_APP_API_URL'): string | undefined {
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
        const { hostname } = window.location
        if (/^(localhost|127\.0\.0\.1)$/i.test(hostname)) return true
        // 局域网调试（如 10.x.x.x:10087）同样走 devServer 代理
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) return true
    }

    return readProcessEnv('NODE_ENV') === 'development'
}

function isLocalBackendHost (url: string): boolean {
    try {
        const { hostname } = new URL(url.includes('://') ? url : `http://${url}`)
        return /^(localhost|127\.0\.0\.1)$/i.test(hostname)
    } catch {
        return false
    }
}

/**
 * API 根地址（不含 /api 前缀；接口 path 已自带 `/api/...`）。
 * - 已配置 `TARO_APP_API_BASE`：生产 / 小程序真机直连，如 `https://your-api.example.com`
 * - H5 开发 + 本地 `TARO_APP_API_URL`：直连 `http://127.0.0.1:8000`，避免 devServer 代理被系统 HTTP 代理劫持
 * - H5 开发 + 远程 `TARO_APP_API_URL`：返回 `''`，由 devServer 将 `/api` 代理到远程
 */
export function getApiBaseUrl (): string {
    const configured = readProcessEnv('TARO_APP_API_BASE')
    if (configured && configured.trim() !== '') {
        const base = stripTrailingSlash(configured.trim())
        // 兼容误配 `/api`，避免叠成 `/api/api/...`
        if (base === '/api') return ''
        return base
    }

    const devBackend = readProcessEnv('TARO_APP_API_URL')
    if (shouldUseH5DevProxy() && devBackend && devBackend.trim() !== '') {
        const base = stripTrailingSlash(devBackend.trim())
        if (isLocalBackendHost(base)) {
            return base
        }
        return ''
    }

    if (shouldUseH5DevProxy()) {
        return ''
    }

    return ''
}

/** 拼接完整接口 URL，path 须以 `/api/` 开头 */
export function buildApiUrl (path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `${getApiBaseUrl()}${normalized}`
}
