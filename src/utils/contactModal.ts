let open = false
const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribeContactModal (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getContactModalOpen (): boolean {
    return open
}

export function openContactModal (): void {
    open = true
    emit()
}

export function closeContactModal (): void {
    open = false
    emit()
}
