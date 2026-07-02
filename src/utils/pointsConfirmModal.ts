import type { PointsFeature } from '@/constants/pointsFeatures'

export interface PointsConfirmModalState {
    open: boolean
    feature: PointsFeature | null
    baseCost: number
    cost: number
    memberDiscount: number
    usesFreeQuota: boolean
    onConfirm: (() => void) | null
    onCancel: (() => void) | null
}

let state: PointsConfirmModalState = {
    open: false,
    feature: null,
    baseCost: 0,
    cost: 0,
    memberDiscount: 1,
    usesFreeQuota: false,
    onConfirm: null,
    onCancel: null
}

const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribePointsConfirmModal (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getPointsConfirmModalState (): PointsConfirmModalState {
    return state
}

export interface OpenPointsConfirmModalOptions {
    feature: PointsFeature
    baseCost: number
    cost: number
    memberDiscount: number
    usesFreeQuota: boolean
    onConfirm?: () => void
    onCancel?: () => void
}

export function openPointsConfirmModal (options: OpenPointsConfirmModalOptions): void {
    state = {
        open: true,
        feature: options.feature,
        baseCost: options.baseCost,
        cost: options.cost,
        memberDiscount: options.memberDiscount,
        usesFreeQuota: options.usesFreeQuota,
        onConfirm: options.onConfirm ?? null,
        onCancel: options.onCancel ?? null
    }
    emit()
}

export function closePointsConfirmModal (): void {
    const onCancel = state.onCancel
    state = {
        open: false,
        feature: null,
        baseCost: 0,
        cost: 0,
        memberDiscount: 1,
        usesFreeQuota: false,
        onConfirm: null,
        onCancel: null
    }
    emit()
    onCancel?.()
}

export function confirmPointsAndClose (): void {
    const cb = state.onConfirm
    state = {
        open: false,
        feature: null,
        baseCost: 0,
        cost: 0,
        memberDiscount: 1,
        usesFreeQuota: false,
        onConfirm: null,
        onCancel: null
    }
    emit()
    cb?.()
}

const INTERPRET_ACTION: Partial<Record<PointsFeature, string>> = {
    qian: '解签',
    liuyao: '解卦',
    meihua: '解卦',
    bazi: '断语',
    palm: '解读',
    face: '解读'
}

function interpretAction (feature: PointsFeature): string {
    return INTERPRET_ACTION[feature] ?? 'AI 解读'
}

export function buildPointsConfirmContent (s: PointsConfirmModalState): string {
    if (!s.feature) return ''
    const action = interpretAction(s.feature)

    if (s.usesFreeQuota) {
        return s.feature === 'qian'
            ? '本次将使用今日免费解签额度，不消耗积分。'
            : `本次将使用今日免费${action}额度，不消耗积分。`
    }

    const freeUsedPrefix = s.feature === 'qian' && !s.usesFreeQuota && s.cost > 0
        ? '今日免费次数已用完，'
        : ''
    const noTrailingPeriod = s.feature === 'qian'

    if (s.memberDiscount < 1 && s.baseCost > s.cost) {
        const text = `${freeUsedPrefix}本次${action}将消耗 ${s.cost} 积分（原价 ${s.baseCost}，会员 ${Math.round(s.memberDiscount * 10)} 折）`
        return noTrailingPeriod ? text : `${text}。`
    }
    const text = `${freeUsedPrefix}本次${action}将消耗 ${s.cost} 积分`
    return noTrailingPeriod ? text : `${text}。`
}

export function buildPointsConfirmLabel (s: PointsConfirmModalState): string {
    if (!s.feature) return '确认'
    const action = interpretAction(s.feature)
    if (s.usesFreeQuota) {
        return s.feature === 'qian' ? '确认解签' : `确认${action}`
    }
    if (s.feature === 'qian') return '确认解签'
    if (s.feature === 'liuyao' || s.feature === 'meihua') return '确认解卦'
    if (s.feature === 'bazi') return '确认断语'
    return `消耗 ${s.cost} 积分`
}
