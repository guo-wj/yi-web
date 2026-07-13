import { apiRequest } from './http'

export interface InviteValidateResult {
    valid: boolean
    message: string
}

export interface InviteStats {
    referral_code: string
    invite_count: number
    points_earned_total: number
    points_earned_this_month: number
    monthly_cap: number
    monthly_cap_remaining: number
    invitee_bonus: number
    inviter_bonus: number
    register_bonus: number
}

export async function validateInviteCode (code: string): Promise<InviteValidateResult> {
    const params = new URLSearchParams({ code: code.trim() })
    return apiRequest<InviteValidateResult>(`/api/invite/validate?${params}`, {
        fallbackError: '校验邀请码失败'
    })
}

export async function fetchInviteStats (): Promise<InviteStats> {
    return apiRequest<InviteStats>('/api/invite/stats', {
        auth: true,
        fallbackError: '获取邀请信息失败'
    })
}
