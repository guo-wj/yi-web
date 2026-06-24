import { useSyncExternalStore } from 'react'

import { getAuthState, subscribe, type AuthState } from '@/utils/auth'

export interface UseAuthResult extends AuthState {
    isLoggedIn: boolean
}

/** 订阅全局登录态，登录/退出后自动重渲染。 */
export function useAuth (): UseAuthResult {
    const stateSnapshot = useSyncExternalStore(subscribe, getAuthState, getAuthState)
    return {
        token: stateSnapshot.token,
        user: stateSnapshot.user,
        isLoggedIn: !!stateSnapshot.token
    }
}
