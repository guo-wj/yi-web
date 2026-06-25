import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ensureLoggedIn } from '@/utils/requireAuth'
import {
    postLotteryDraw,
    type LotteryDrawResponse
} from '@/services/lotteryApi'

// 摇签最短时长：接口秒回也至少让晃动播这么久；接口慢则晃动循环等它。
export const SHAKE_MIN_MS = 1150
// 签飞出筒（sway）到定格的时长，与 keyframes 对齐。
export const SWAY_MS = 1500

// idle 待机 / shaking 摇签+请求中 / drawn 签正飞出 / settled 签定格可点
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

// 把签诗按换行/句读拆成若干竖排列
export function splitPoem (poem: string): string[] {
    return poem
        .split(/[\n，。、；！？,.;!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
}

/** 抽签面板的全部状态与交互逻辑，PC 与移动端视图共用 */
export function useLottery () {
    const [phase, setPhase] = useState<Phase>('idle')
    const [result, setResult] = useState<LotteryDrawResponse | null>(null)
    const [openSheet, setOpenSheet] = useState(false)

    const timers = useRef<ReturnType<typeof setTimeout>[]>([])
    const drawingRef = useRef(false)

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
            // 接口与最短摇签并行；接口慢则晃动动画循环等它返回。
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

    const reset = useCallback(() => {
        clearTimers()
        setOpenSheet(false)
        setResult(null)
        setPhase('idle')
    }, [clearTimers])

    return { phase, result, openSheet, setOpenSheet, onDraw, reset }
}
