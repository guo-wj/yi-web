import Taro from '@tarojs/taro'

const STORAGE_KEY = 'yi-web:pending-invite'

function normalizeInviteCode (raw: string): string {
    return raw.trim().toUpperCase()
}

export function setPendingInviteCode (code: string): void {
    const normalized = normalizeInviteCode(code)
    if (!normalized) return
    try {
        Taro.setStorageSync(STORAGE_KEY, normalized)
    } catch { /* noop */ }
}

export function getPendingInviteCode (): string | null {
    try {
        const value = Taro.getStorageSync(STORAGE_KEY)
        if (typeof value === 'string' && value.trim()) {
            return normalizeInviteCode(value)
        }
    } catch { /* noop */ }
    return null
}

export function clearPendingInviteCode (): void {
    try {
        Taro.removeStorageSync(STORAGE_KEY)
    } catch { /* noop */ }
}

export function captureInviteFromQuery (params?: Record<string, string | undefined>): void {
    const code = params?.invite || params?.ref || params?.invite_code
    if (code?.trim()) {
        setPendingInviteCode(code)
    }
}

/** H5 从 window.location 读取邀请参数 */
export function captureInviteFromLocation (): void {
    if (typeof window === 'undefined' || !window.location) return
    const sp = new URLSearchParams(window.location.search)
    const code = sp.get('invite') || sp.get('ref') || sp.get('invite_code')
    if (code?.trim()) {
        setPendingInviteCode(code)
    }
}

export function buildInviteLink (code: string): string {
    const normalized = normalizeInviteCode(code)
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/?invite=${encodeURIComponent(normalized)}`
    }
    return `/?invite=${encodeURIComponent(normalized)}`
}
