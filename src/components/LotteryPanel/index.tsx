import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import MarkdownView from '@/components/MarkdownView'
import canisterSvg from '@/assets/images/canister.svg'
import { ensureLoggedIn } from '@/utils/requireAuth'
import {
    postLotteryDraw,
    type LotteryDrawResponse
} from '@/services/lotteryApi'

import './index.scss'

// 摇签最短时长：接口秒回也至少让晃动播这么久；接口慢则晃动循环等它。
const SHAKE_MIN_MS = 1150
// 签飞出筒（sway）到定格的时长，与 keyframes 对齐。
const SWAY_MS = 1500

// idle 待机 / shaking 摇签+请求中 / drawn 签正飞出 / settled 签定格可点
type Phase = 'idle' | 'shaking' | 'drawn' | 'settled'

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

function formatSlipHeading (id: number): string {
    return `第${numberToChinese(id)}签`
}

// 把签诗按换行/句读拆成若干竖排列
function splitPoem (poem: string): string[] {
    return poem
        .split(/[\n，。、；！？,.;!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
}

export default function LotteryPanel () {
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

    const drawnVisible = phase === 'drawn' || phase === 'settled'
    const drawnClass = [
        'lottery-panel__drawn',
        phase === 'drawn' ? 'lottery-panel__drawn--sway' : '',
        phase === 'settled' ? 'lottery-panel__drawn--sway lottery-panel__drawn--settled' : ''
    ]
        .filter(Boolean)
        .join(' ')

    const slipLabel = result ? `第${result.slip.id}签` : ''

    return (
        <View className='lottery-panel'>
            <View className='lottery-panel__scroll'>
                <View className='lottery-panel__titleblock'>
                    <Text className='lottery-panel__title'>灵签一动</Text>
                    <Text className='lottery-panel__subtitle'>静心凝神，摇签即得今日指引</Text>
                </View>

                <View className='lottery-panel__canister-stage'>
                    <View className='lottery-panel__glow' />
                    <View
                        className={`lottery-panel__canister ${phase === 'shaking' ? 'lottery-panel__canister--shaking' : ''}`}
                    >
                        <Image
                            className='lottery-panel__canister-img'
                            src={canisterSvg}
                            mode='widthFix'
                        />
                    </View>

                    {drawnVisible && result && (
                        <View
                            className={drawnClass}
                            onClick={() => phase === 'settled' && setOpenSheet(true)}
                        >
                            <View className='lottery-panel__drawn-cap' />
                            <View className='lottery-panel__drawn-body'>
                                <Text className='lottery-panel__drawn-label'>{slipLabel}</Text>
                                <View className='lottery-panel__drawn-seal'>
                                    <Text className='lottery-panel__drawn-seal-txt'>中签</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {phase === 'idle' && (
                    <View className='lottery-panel__cta' onClick={() => void onDraw()}>
                        <Text className='lottery-panel__cta-txt'>摇签求运势</Text>
                    </View>
                )}
                {phase === 'shaking' && (
                    <View className='lottery-panel__cta lottery-panel__cta--disabled'>
                        <Text className='lottery-panel__cta-txt'>诚心摇签中…</Text>
                    </View>
                )}
                {phase === 'drawn' && (
                    <View className='lottery-panel__hint'>
                        <View className='lottery-panel__hint-dot' />
                        <Text className='lottery-panel__hint-txt'>签已出筒</Text>
                    </View>
                )}
                {phase === 'settled' && (
                    <View className='lottery-panel__foot'>
                        <View className='lottery-panel__actions'>
                            <View
                                className='lottery-panel__action lottery-panel__action--primary'
                                onClick={() => setOpenSheet(true)}
                            >
                                <Text className='lottery-panel__action-txt lottery-panel__action-txt--primary'>解签</Text>
                            </View>
                            <View className='lottery-panel__action' onClick={reset}>
                                <Text className='lottery-panel__action-txt'>再抽一次</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {openSheet && result && (
                <ResultSheet
                    result={result}
                    onClose={() => setOpenSheet(false)}
                />
            )}
        </View>
    )
}

interface ResultSheetProps {
    result: LotteryDrawResponse
    onClose: () => void
}

function ResultSheet ({ result, onClose }: ResultSheetProps) {
    const cols = useMemo(() => splitPoem(result.slip.poem), [result.slip.poem])

    return (
        <View className='lottery-panel__scrim' onClick={onClose}>
            <View
                className='lottery-panel__sheet'
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='lottery-panel__sheet-close' onClick={onClose}>
                    <Text className='lottery-panel__sheet-close-txt'>✕</Text>
                </View>

                <View className='lottery-panel__sheet-head'>
                    <Text className='lottery-panel__sheet-n'>{result.slip.title}</Text>
                    <View className='lottery-panel__sheet-tag'>
                        <Text className='lottery-panel__sheet-tag-txt'>{formatSlipHeading(result.slip.id)} · {result.slip.tier}</Text>
                    </View>
                </View>

                <View className='lottery-panel__sheet-body'>
                    <View className='lottery-panel__poem-wrap'>
                        <View className='lottery-panel__poem'>
                            {cols.map((col, i) => (
                                <Text key={i} className='lottery-panel__poem-col'>{col}</Text>
                            ))}
                        </View>
                    </View>

                    <View className='lottery-panel__sect'>
                        <View className='lottery-panel__sect-h'>
                            <Text className='lottery-panel__sect-h-txt'>解 曰</Text>
                        </View>
                        <MarkdownView className='lottery-panel__sect-md' content={result.interpretation} />
                    </View>

                    <Text className='lottery-panel__sheet-note'>云开月出照前程，莫向签文问死生。心若安然，处处是好程</Text>
                </View>
            </View>
        </View>
    )
}
