let open = false
const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribeFeedbackModal (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getFeedbackModalOpen (): boolean {
    return open
}

export function openFeedbackModal (): void {
    open = true
    emit()
}

export function closeFeedbackModal (): void {
    open = false
    emit()
}
