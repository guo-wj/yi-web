export interface InsufficientPointsModalState {
    open: boolean
    required: number
    balance: number
    featureLabel: string
}

let state: InsufficientPointsModalState = {
    open: false,
    required: 0,
    balance: 0,
    featureLabel: ''
}

const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribeInsufficientPointsModal (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getInsufficientPointsModalState (): InsufficientPointsModalState {
    return state
}

export interface OpenInsufficientPointsModalOptions {
    required: number
    balance: number
    featureLabel: string
}

export function openInsufficientPointsModal (options: OpenInsufficientPointsModalOptions): void {
    state = {
        open: true,
        required: options.required,
        balance: options.balance,
        featureLabel: options.featureLabel
    }
    emit()
}

export function closeInsufficientPointsModal (): void {
    state = {
        open: false,
        required: 0,
        balance: 0,
        featureLabel: ''
    }
    emit()
}

export function openMemberCenter (tab?: string): void {
    void import('@/utils/memberNav').then(({ openMemberCenter: open }) => open(tab))
}
