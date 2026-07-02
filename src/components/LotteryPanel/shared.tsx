import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'

import { isLoggedIn } from '@/utils/auth'
import { fetchPointsQuota, type PointsQuota } from '@/services/pointsApi'

import { ensureLoggedIn } from '@/utils/requireAuth'
import { ensurePoints, refundOnFailure } from '@/utils/ensurePoints'
import {
    postLotteryDraw,
    postLotteryInterpret,
    type LotterySlipResult
} from '@/services/lotteryApi'

export const SHAKE_MIN_MS = 1150
export const SWAY_MS = 1500

export type Phase = 'idle' | 'shaking' | 'drawn' | 'settled'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function numberToChinese (n: number): string {
    if (n <= 0) return String(n)
    if (n < 10) return CN_DIGITS[n]
    if (n === 10) return '十'
    if (n < 20) return `十${CN_DIGITS[n % 10]}`
    if (n < 100) {
        const tens = Math.floor(n / 10)
        const ones = n % 10
        return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ''}`
    }
    return String(n)
}

export function formatSlipHeading (id: number): string {
    return `第${numberToChinese(id)}签`
}

export function splitPoem (poem: string): string[] {
    return poem
        .split(/[\n，。、；！？,.;!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
}

async function refreshQuota (setter: (q: PointsQuota | null) => void) {
    if (!isLoggedIn()) {
        setter(null)
        return
    }
    try {
        const q = await fetchPointsQuota('qian')
        setter(q)
    } catch {
        /* noop */
    }
}

/** 抽签面板的全部状态与交互逻辑，PC 与移动端视图共用 */
export function useLottery () {
    const [phase, setPhase] = useState<Phase>('idle')
    const [result, setResult] = useState<LotterySlipResult | null>(null)
    const [openSheet, setOpenSheet] = useState(false)
    const [quota, setQuota] = useState<PointsQuota | null>(null)
    const [interpreting, setInterpreting] = useState(false)

    const timers = useRef<ReturnType<typeof setTimeout>[]>([])
    const drawingRef = useRef(false)
    const interpretingRef = useRef(false)

    useEffect(() => {
        void refreshQuota(setQuota)
    }, [])

    const clearTimers = useCallback(() => {
        timers.current.forEach(clearTimeout)
        timers.current = []
    }, [])

    useEffect(() => () => clearTimers(), [clearTimers])

    const onDraw = useCallback(async () => {
        if (phase !== 'idle' || drawingRef.current) return
        if (!ensureLoggedIn()) return
        drawingRef.current = true
        clearTimers()
        setOpenSheet(false)
        setResult(null)
        setPhase('shaking')

        try {
            const [data] = await Promise.all([
                postLotteryDraw({}),
                sleep(SHAKE_MIN_MS)
            ])
            setResult(data)
            setPhase('drawn')
            timers.current.push(setTimeout(() => setPhase('settled'), SWAY_MS))
        } catch (e) {
            const msg = e instanceof Error ? e.message : '抽签失败，请稍后重试'
            setPhase('idle')
            void Taro.showToast({
                title: msg.length > 20 ? '抽签失败' : msg,
                icon: 'none'
            })
        } finally {
            drawingRef.current = false
        }
    }, [phase, clearTimers])

    const onInterpret = useCallback(async () => {
        if (!result || interpretingRef.current) return
        if (!ensureLoggedIn()) return

        if (result.interpretation) {
            setOpenSheet(true)
            return
        }

        let txId: number | undefined
        try {
            const { quoteForFeature } = await import('@/hooks/usePoints')
            const quote = await quoteForFeature({ feature: 'qian' })
            const skipConfirm = quote.uses_free_quota

            const points = await ensurePoints({
                feature: 'qian',
                idempotency_key: `qian:interpret:${result.slip.id}:${Date.now()}`,
                skipConfirm
            })
            if (!points) return

            interpretingRef.current = true
            setInterpreting(true)

            txId = points.transaction_id

            const resp = await postLotteryInterpret({
                slip_id: result.slip.id,
                solar_date: result.solar_date
            })

            setResult((prev) => prev ? { ...prev, interpretation: resp.interpretation } : prev)
            setOpenSheet(true)
            void refreshQuota(setQuota)
        } catch (e) {
            await refundOnFailure(txId)
            const msg = e instanceof Error ? e.message : '解签失败'
            void Taro.showToast({
                title: msg.length > 20 ? '解签失败' : msg,
                icon: 'none'
            })
        } finally {
            interpretingRef.current = false
            setInterpreting(false)
        }
    }, [result])

    const reset = useCallback(() => {
        clearTimers()
        setOpenSheet(false)
        setResult(null)
        setInterpreting(false)
        setPhase('idle')
    }, [clearTimers])

    return {
        phase,
        result,
        openSheet,
        setOpenSheet,
        onDraw,
        onInterpret,
        reset,
        quota,
        interpreting
    }
}
