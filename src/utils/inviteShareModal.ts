import { fetchInviteStats } from '@/services/inviteApi'
import { isLoggedIn } from '@/utils/auth'
import { buildInviteLink } from '@/utils/inviteCode'
import { getPointsState, refreshPointsBalance } from '@/hooks/usePoints'
import { openLoginModal } from '@/utils/requireAuth'

export type InviteShareModalMode = 'center' | 'popover'

export interface InviteShareModalState {
    open: boolean
    mode: InviteShareModalMode
    anchorEl: HTMLElement | null
    loading: boolean
    referralCode: string
    inviteLink: string
    error: string | null
}

export interface OpenInviteShareOptions {
    anchorEl?: HTMLElement | null
}

let state: InviteShareModalState = {
    open: false,
    mode: 'center',
    anchorEl: null,
    loading: false,
    referralCode: '',
    inviteLink: '',
    error: null
}

const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribeInviteShareModal (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getInviteShareModalState (): InviteShareModalState {
    return state
}

export function closeInviteShareModal (): void {
    state = {
        open: false,
        mode: 'center',
        anchorEl: null,
        loading: false,
        referralCode: '',
        inviteLink: '',
        error: null
    }
    emit()
}

async function resolveReferralCode (): Promise<string> {
    const cached = getPointsState().balance?.referral_code
    if (cached) return cached

    const balance = await refreshPointsBalance()
    if (balance?.referral_code) return balance.referral_code

    const stats = await fetchInviteStats()
    return stats.referral_code
}

export async function openInviteShareModal (options?: OpenInviteShareOptions): Promise<void> {
    const anchorEl = options?.anchorEl ?? null
    const mode: InviteShareModalMode = anchorEl ? 'popover' : 'center'

    if (!isLoggedIn()) {
        openLoginModal('login', () => {
            void openInviteShareModal(options)
        })
        return
    }

    state = {
        open: true,
        mode,
        anchorEl,
        loading: true,
        referralCode: '',
        inviteLink: '',
        error: null
    }
    emit()

    try {
        const referralCode = await resolveReferralCode()
        if (!referralCode) {
            throw new Error('暂无邀请码，请稍后再试')
        }
        state = {
            ...state,
            open: true,
            loading: false,
            referralCode,
            inviteLink: buildInviteLink(referralCode),
            error: null
        }
        emit()
    } catch (e) {
        state = {
            ...state,
            open: true,
            loading: false,
            referralCode: '',
            inviteLink: '',
            error: e instanceof Error ? e.message : '获取邀请信息失败'
        }
        emit()
    }
}
