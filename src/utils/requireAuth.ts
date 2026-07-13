import { isLoggedIn } from '@/utils/auth'
import { openAuthModal, type AuthModalMode } from '@/utils/authModal'
import { getPendingInviteCode } from '@/utils/inviteCode'

/** 未登录时弹出登录/注册弹窗；已登录返回 true */
export function ensureLoggedIn (onAuthed?: () => void): boolean {
    if (isLoggedIn()) return true
    openAuthModal('login', onAuthed)
    return false
}

export function openLoginModal (mode: AuthModalMode = 'login', onSuccess?: () => void): void {
    openAuthModal(mode, onSuccess)
}

/** 携带 URL 邀请码时，未登录用户自动打开注册弹窗 */
export function maybeOpenInviteRegister (): void {
    if (isLoggedIn()) return
    if (!getPendingInviteCode()) return
    openAuthModal('register')
}
