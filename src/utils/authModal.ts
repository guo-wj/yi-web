export type AuthModalMode = 'login' | 'register'

export interface AuthModalState {
    open: boolean
    mode: AuthModalMode
    onSuccess: (() => void) | null
}

let state: AuthModalState = {
    open: false,
    mode: 'login',
    onSuccess: null
}

const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribeAuthModal (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getAuthModalState (): AuthModalState {
    return state
}

export function openAuthModal (
    mode: AuthModalMode = 'login',
    onSuccess?: () => void
): void {
    state = {
        open: true,
        mode,
        onSuccess: onSuccess ?? null
    }
    emit()
}

export function closeAuthModal (): void {
    state = {
        open: false,
        mode: 'login',
        onSuccess: null
    }
    emit()
}

export function consumeAuthModalSuccess (): (() => void) | null {
    const cb = state.onSuccess
    closeAuthModal()
    return cb
}
