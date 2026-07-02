import type { PointsFeature } from '@/constants/pointsFeatures'

import { apiRequest } from './http'

export interface PointsBalance {
    balance: number
    member_tier: string
    member_label: string
    member_discount: number
    member_expire_at?: string | null
    referral_code?: string | null
    checkin_streak?: number
    last_checkin_date?: string | null
}

export interface PointsQuota {
    feature: string
    free_daily: number
    free_remaining: number
    used_today: number
    reset_at: string
}

export interface PointsQuote {
    feature: string
    base_cost: number
    cost: number
    member_discount: number
    uses_free_quota: boolean
    balance: number
    sufficient: boolean
}

export interface PointsConsumeResult {
    transaction_id: number
    balance: number
    cost: number
    uses_free_quota?: boolean
}

export interface PointsLedgerItem {
    id: number
    type: string
    amount: number
    feature?: string | null
    note?: string | null
    balance_after: number
    created_at: string
}

export interface PointsLedgerResponse {
    items: PointsLedgerItem[]
    total: number
    page: number
    page_size: number
}

export interface MemberPlan {
    id: string
    label: string
    price_cents: number
    monthly_points: number
    discount: number
    qian_free_daily: number
    liuyao_free_daily: number
    meihua_free_daily: number
    bazi_free_daily: number
    palm_free_daily: number
    face_free_daily: number
}

export interface RechargePlan {
    id: string
    label: string
    price_cents: number
    points: number
    bonus_pct: number
}

export interface MemberPlansResponse {
    members: MemberPlan[]
    recharge: RechargePlan[]
}

export class InsufficientPointsError extends Error {
    required: number
    balance: number

    constructor (required: number, balance: number, message?: string) {
        super(message ?? `积分不足，需要 ${required} 点，当前 ${balance} 点。`)
        this.name = 'InsufficientPointsError'
        this.required = required
        this.balance = balance
    }
}

export async function fetchPointsBalance (): Promise<PointsBalance> {
    return apiRequest<PointsBalance>('/api/points/balance', {
        auth: true,
        fallbackError: '获取积分失败'
    })
}

export async function fetchPointsQuota (feature: PointsFeature): Promise<PointsQuota> {
    return apiRequest<PointsQuota>(`/api/points/quota?feature=${encodeURIComponent(feature)}`, {
        auth: true,
        fallbackError: '获取额度失败'
    })
}

export async function fetchPointsQuote (opts: {
    feature: PointsFeature
    focus_count?: number
    is_redo?: boolean
}): Promise<PointsQuote> {
    const params = new URLSearchParams({
        feature: opts.feature,
        focus_count: String(opts.focus_count ?? 1),
        is_redo: String(!!opts.is_redo)
    })
    return apiRequest<PointsQuote>(`/api/points/quote?${params}`, {
        auth: true,
        fallbackError: '获取报价失败'
    })
}

export async function postPointsConsume (body: {
    feature: PointsFeature
    focus_count?: number
    is_redo?: boolean
    idempotency_key?: string
    meta?: Record<string, unknown>
}): Promise<PointsConsumeResult> {
    try {
        return await apiRequest<PointsConsumeResult>('/api/points/consume', {
            method: 'POST',
            auth: true,
            data: body,
            fallbackError: '扣减积分失败'
        })
    } catch (e) {
        const err = e as Error & { code?: string; required?: number; balance?: number }
        if (err.code === 'INSUFFICIENT_POINTS') {
            throw new InsufficientPointsError(
                err.required ?? 0,
                err.balance ?? 0,
                err.message
            )
        }
        throw e
    }
}

export async function postPointsRefund (transactionId: number): Promise<{ balance: number }> {
    return apiRequest('/api/points/refund', {
        method: 'POST',
        auth: true,
        data: { transaction_id: transactionId },
        fallbackError: '退还积分失败'
    })
}

export async function postPointsCheckin (): Promise<{
    balance: number
    streak: number
    reward: number
}> {
    return apiRequest('/api/points/checkin', {
        method: 'POST',
        auth: true,
        fallbackError: '签到失败'
    })
}

export async function fetchPointsLedger (page = 1, pageSize = 20): Promise<PointsLedgerResponse> {
    return apiRequest<PointsLedgerResponse>(
        `/api/points/ledger?page=${page}&page_size=${pageSize}`,
        { auth: true, fallbackError: '获取流水失败' }
    )
}

export async function fetchMemberPlans (): Promise<MemberPlansResponse> {
    return apiRequest<MemberPlansResponse>('/api/member/plans', {
        fallbackError: '获取套餐失败'
    })
}

export async function postRechargeOrder (productId: string): Promise<{ order_id: number }> {
    return apiRequest('/api/payment/recharge', {
        method: 'POST',
        auth: true,
        data: { product_id: productId },
        fallbackError: '创建充值订单失败'
    })
}

export async function postMemberOrder (tier: string): Promise<{ order_id: number }> {
    return apiRequest('/api/payment/member', {
        method: 'POST',
        auth: true,
        data: { tier },
        fallbackError: '创建会员订单失败'
    })
}

export async function postPaymentConfirm (orderId: number): Promise<{ balance: number }> {
    return apiRequest('/api/payment/confirm', {
        method: 'POST',
        auth: true,
        data: { order_id: orderId },
        fallbackError: '支付确认失败'
    })
}
