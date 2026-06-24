export interface ConfirmModalState {
    open: boolean
    title: string
    content: string
    confirmText: string
    cancelText: string
    showCancel: boolean
    onConfirm: (() => void) | null
}

let state: ConfirmModalState = {
    open: false,
    title: '',
    content: '',
    confirmText: '确定',
    cancelText: '取消',
    showCancel: true,
    onConfirm: null
}

const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribeConfirmModal (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getConfirmModalState (): ConfirmModalState {
    return state
}

export interface OpenConfirmModalOptions {
    title: string
    content: string
    confirmText?: string
    cancelText?: string
    showCancel?: boolean
    onConfirm?: () => void
}

export function openConfirmModal (options: OpenConfirmModalOptions): void {
    state = {
        open: true,
        title: options.title,
        content: options.content,
        confirmText: options.confirmText ?? '确定',
        cancelText: options.cancelText ?? '取消',
        showCancel: options.showCancel ?? true,
        onConfirm: options.onConfirm ?? null
    }
    emit()
}

export interface OpenAlertModalOptions {
    title: string
    content: string
    confirmText?: string
    onConfirm?: () => void
}

/** 单按钮提示弹窗，样式与 ConfirmModal 一致 */
export function openAlertModal (options: OpenAlertModalOptions): void {
    openConfirmModal({
        ...options,
        showCancel: false
    })
}

export function closeConfirmModal (): void {
    state = {
        open: false,
        title: '',
        content: '',
        confirmText: '确定',
        cancelText: '取消',
        showCancel: true,
        onConfirm: null
    }
    emit()
}

export function confirmAndClose (): void {
    const cb = state.onConfirm
    closeConfirmModal()
    cb?.()
}
