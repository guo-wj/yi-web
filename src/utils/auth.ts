import Taro from '@tarojs/taro'

/** 登录态：token 与用户信息持久化到本地存储，并对外暴露订阅以驱动 UI 更新。 */

const TOKEN_KEY = 'yi-web:auth-token'
const USER_KEY = 'yi-web:auth-user'

export interface AuthUser {
    id: number
    phone?: string | null
    email?: string | null
    account_type?: 'phone' | 'email' | null
    created_at?: string
    last_login?: string | null
}

export interface AuthState {
    token: string | null
    user: AuthUser | null
}

function readFromStorage (): AuthState {
    try {
        const token = Taro.getStorageSync(TOKEN_KEY)
        const user = Taro.getStorageSync(USER_KEY)
        return {
            token: typeof token === 'string' && token ? token : null,
            user: user && typeof user === 'object' ? (user as AuthUser) : null
        }
    } catch {
        return { token: null, user: null }
    }
}

let state: AuthState = readFromStorage()
const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

/** 供 useSyncExternalStore 订阅 */
export function subscribe (listener: () => void): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

/** 返回稳定引用：仅在 setAuth/clearAuth 时变化，满足 useSyncExternalStore 要求。 */
export function getAuthState (): AuthState {
    return state
}

export function getToken (): string | null {
    return state.token
}

export function getAuthUser (): AuthUser | null {
    return state.user
}

export function isLoggedIn (): boolean {
    return !!state.token
}

export function setAuth (token: string, user: AuthUser): void {
    state = { token, user }
    try {
        Taro.setStorageSync(TOKEN_KEY, token)
        Taro.setStorageSync(USER_KEY, user)
    } catch {
        /* noop */
    }
    emit()
}

export function clearAuth (): void {
    state = { token: null, user: null }
    try {
        Taro.removeStorageSync(TOKEN_KEY)
        Taro.removeStorageSync(USER_KEY)
    } catch {
        /* noop */
    }
    emit()
}

/** 启动时用本地 token 向后端校验并刷新用户信息 */
export async function restoreAuthSession (): Promise<void> {
    if (!state.token) return

    try {
        const { fetchMe } = await import('@/services/authApi')
        const user = await fetchMe()
        state = { token: state.token, user }
        try {
            Taro.setStorageSync(USER_KEY, user)
        } catch {
            /* noop */
        }
        emit()
    } catch {
        clearAuth()
    }
}
