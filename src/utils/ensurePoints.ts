import type { PointsFeature } from '@/constants/pointsFeatures'
import { POINTS_FEATURE_LABELS } from '@/constants/pointsFeatures'
import {
    consumeForFeature,
    InsufficientPointsError,
    quoteForFeature
} from '@/hooks/usePoints'
import { openInsufficientPointsModal } from '@/utils/insufficientPointsModal'
import { openPointsConfirmModal } from '@/utils/pointsConfirmModal'
import { ensureLoggedIn } from '@/utils/requireAuth'

export interface EnsurePointsOptions {
    feature: PointsFeature
    focus_count?: number
    is_redo?: boolean
    idempotency_key?: string
    meta?: Record<string, unknown>
    /** 跳过确认弹窗（如已在外层展示） */
    skipConfirm?: boolean
}

export interface EnsurePointsResult {
    transaction_id: number
    cost: number
    uses_free_quota?: boolean
}

/**
 * 登录校验 → 报价 → 确认 → 扣点。
 * 积分不足时弹引导窗并返回 null。
 */
export async function ensurePoints (opts: EnsurePointsOptions): Promise<EnsurePointsResult | null> {
    if (!ensureLoggedIn()) return null

    let quote
    try {
        quote = await quoteForFeature({
            feature: opts.feature,
            focus_count: opts.focus_count,
            is_redo: opts.is_redo
        })
    } catch (e) {
        throw e
    }

    if (!quote.sufficient && quote.cost > 0) {
        openInsufficientPointsModal({
            required: quote.cost,
            balance: quote.balance,
            featureLabel: POINTS_FEATURE_LABELS[opts.feature]
        })
        return null
    }

    if (!opts.skipConfirm) {
        const confirmed = await new Promise<boolean>((resolve) => {
            openPointsConfirmModal({
                feature: opts.feature,
                baseCost: quote.base_cost,
                cost: quote.cost,
                memberDiscount: quote.member_discount,
                usesFreeQuota: quote.uses_free_quota,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            })
        })
        if (!confirmed) return null
    }

    try {
        const result = await consumeForFeature({
            feature: opts.feature,
            focus_count: opts.focus_count,
            is_redo: opts.is_redo,
            idempotency_key: opts.idempotency_key,
            meta: opts.meta
        })
        return {
            transaction_id: result.transaction_id,
            cost: result.cost,
            uses_free_quota: result.uses_free_quota
        }
    } catch (e) {
        if (e instanceof InsufficientPointsError) {
            openInsufficientPointsModal({
                required: e.required,
                balance: e.balance,
                featureLabel: POINTS_FEATURE_LABELS[opts.feature]
            })
            return null
        }
        throw e
    }
}

/** AI 失败时退还积分 */
export async function refundOnFailure (transactionId: number | undefined): Promise<void> {
    if (!transactionId) return
    try {
        const { postPointsRefund } = await import('@/services/pointsApi')
        const { refreshPointsBalance } = await import('@/hooks/usePoints')
        await postPointsRefund(transactionId)
        void refreshPointsBalance()
    } catch {
        /* 静默失败，用户可申诉 */
    }
}
