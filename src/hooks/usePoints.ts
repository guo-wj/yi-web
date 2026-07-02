import { useCallback, useEffect, useSyncExternalStore } from 'react'

import type { PointsBalance, PointsFeature } from '@/services/pointsApi'
import {
    fetchPointsBalance,
    fetchPointsQuote,
    InsufficientPointsError,
    postPointsConsume
} from '@/services/pointsApi'
import { isLoggedIn, subscribe as subscribeAuth } from '@/utils/auth'

interface PointsState {
    balance: PointsBalance | null
    loading: boolean
    error: string | null
}

let state: PointsState = {
    balance: null,
    loading: false,
    error: null
}

const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribePoints (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getPointsState (): PointsState {
    return state
}

export function setPointsBalance (balance: PointsBalance | null): void {
    state = { ...state, balance, error: null }
    emit()
}

export async function refreshPointsBalance (): Promise<PointsBalance | null> {
    if (!isLoggedIn()) {
        state = { balance: null, loading: false, error: null }
        emit()
        return null
    }

    state = { ...state, loading: true, error: null }
    emit()

    try {
        const balance = await fetchPointsBalance()
        state = { balance, loading: false, error: null }
        emit()
        return balance
    } catch (e) {
        const msg = e instanceof Error ? e.message : '获取积分失败'
        state = { ...state, loading: false, error: msg }
        emit()
        return null
    }
}

export function usePoints () {
    const pointsState = useSyncExternalStore(subscribePoints, getPointsState, getPointsState)
    const loggedIn = useSyncExternalStore(subscribeAuth, () => isLoggedIn(), () => isLoggedIn())

    useEffect(() => {
        if (loggedIn) {
            void refreshPointsBalance()
        } else {
            setPointsBalance(null)
        }
    }, [loggedIn])

    const refresh = useCallback(() => refreshPointsBalance(), [])

    return {
        ...pointsState,
        refresh
    }
}

export interface ConsumeForFeatureOptions {
    feature: PointsFeature
    focus_count?: number
    is_redo?: boolean
    idempotency_key?: string
    meta?: Record<string, unknown>
}

export async function consumeForFeature (opts: ConsumeForFeatureOptions) {
    const result = await postPointsConsume(opts)
    if (state.balance) {
        setPointsBalance({ ...state.balance, balance: result.balance })
    } else {
        void refreshPointsBalance()
    }
    return result
}

export async function quoteForFeature (opts: {
    feature: PointsFeature
    focus_count?: number
    is_redo?: boolean
}) {
    return fetchPointsQuote(opts)
}

export { InsufficientPointsError }
