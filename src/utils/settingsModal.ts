let open = false
const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribeSettingsModal (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getSettingsModalOpen (): boolean {
    return open
}

export function openSettingsModal (): void {
    open = true
    emit()
}

export function closeSettingsModal (): void {
    open = false
    emit()
}
