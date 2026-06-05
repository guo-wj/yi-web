/** yiBackend 根地址（与仓库 yiBackend 对应），勿尾斜杠 */

import Taro from '@tarojs/taro'

function stripTrailingSlash (s: string): string {
    return s.replace(/\/+$/, '')
}

/** 避免 H5 运行时未注入 `process` 导致 `process is not defined` */
function nodeEnv (): NodeJS.ProcessEnv | undefined {
    if (typeof process === 'undefined' || !process.env) {
        return undefined
    }
    return process.env
}

function isBrowserLocalDev (): boolean {
    if (typeof window === 'undefined' || !window.location) {
        return false
    }
    return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
}

/**
  * - 已配置 `TARO_APP_API_BASE` 时优先使用（生产 / 小程序真机联调等）。
  * - H5 在本地开发域名下：走相对路径 `''`，由 webpack devServer 将 `/api` 代理到 yiBackend。
  * - 否则回退 `http://127.0.0.1:8000`。
  */
export function getApiBaseUrl (): string {
    const env = nodeEnv()
    const raw = env?.TARO_APP_API_BASE
    if (typeof raw === 'string' && raw.trim() !== '') {
        return stripTrailingSlash(raw.trim())
    }
    try {
        const isH5 = Taro.getEnv() === Taro.ENV_TYPE.WEB
        const isDevBuild = env?.NODE_ENV === 'development'
        if (isH5 && (isDevBuild || isBrowserLocalDev())) {
            return ''
        }
    } catch {
        /* 非 Taro 环境等 */
    }
    return 'http://127.0.0.1:8000'
}
