import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useMemo, useState } from 'react'

import lotteryTubeImg from '@/assets/images/lottery-tube.png'
import {
    postLotteryDraw,
    type LotteryDrawResponse
} from '@/services/lotteryApi'

import './index.scss'

export interface LotteryPanelProps {
    today?: { dateLine: string; weekdayLine: string }
}

// 摇签动画的最短展示时长。即便接口秒回，也至少让用户看到这么久的摇签动效。
const SHAKE_MS = 720

// 单一状态机：idle 待机 / drawing 摇签+请求中 / done 出签 / error 失败
type Status = 'idle' | 'drawing' | 'done' | 'error'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function formatTodayCn (): { dateLine: string; weekdayLine: string } {
    const d = new Date()
    const mon = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    return {
        dateLine: `${mon}月${day}日`,
        weekdayLine: `${weekdays[d.getDay()]} · 今日运势`
    }
}

export default function LotteryPanel ({ today: todayProp }: LotteryPanelProps) {
    const today = useMemo(() => todayProp ?? formatTodayCn(), [todayProp])

    const [status, setStatus] = useState<Status>('idle')
    const [result, setResult] = useState<LotteryDrawResponse | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const isDrawing = status === 'drawing'

    const goHome = useCallback(() => {
        void Taro.reLaunch({ url: '/pages/index/index' })
    }, [])

    // 点击摇签：动画与请求并行；用 Promise.all + sleep 保证动画至少播完 SHAKE_MS。
    // status 本身就承担了「请求是否在途」的语义，因此无需额外的 in-flight ref。
    const onShakeDraw = useCallback(async () => {
        if (status === 'drawing') return
        setStatus('drawing')
        setErrorMsg(null)
        try {
            const [data] = await Promise.all([postLotteryDraw({}), sleep(SHAKE_MS)])
            setResult(data)
            setStatus('done')
        } catch (e) {
            const msg = e instanceof Error ? e.message : '抽签失败，请稍后重试'
            setErrorMsg(msg)
            setStatus('error')
            void Taro.showToast({
                title: msg.length > 20 ? '抽签失败' : msg,
                icon: 'none'
            })
        }
    }, [status])

    // 顶部胶囊条：出签前展示占位，出签后展示签号与签等
    const pill = useMemo(() => {
        if (result) {
            return {
                mid: `第 ${result.slip.id} 签 ${result.slip.tier}`,
                right: `${500 + result.slip.id * 7} 人已抽中`
            }
        }
        return { mid: '摇签后揭晓', right: '541 人已抽中' }
    }, [result])

    const ctaLabel =
        isDrawing ? '摇签中…' : status === 'done' ? '再摇一次' : '摇签求运势'

    return (
        <View className='lottery-panel'>
            <View className='lottery-panel__back' onClick={goHome}>
                <Text className='lottery-panel__back-txt'>← 返回首页</Text>
            </View>

            <View className='lottery-panel__date-block'>
                <Text className='lottery-panel__date-big'>{today.dateLine}</Text>
                <Text className='lottery-panel__date-sub'>{today.weekdayLine}</Text>
            </View>

            <View className='lottery-panel__pill'>
                <Text className='lottery-panel__pill-hot'>🔥 今日最热门</Text>
                <Text className='lottery-panel__pill-div'>|</Text>
                <Text className='lottery-panel__pill-mid'>{pill.mid}</Text>
                <Text className='lottery-panel__pill-div'>|</Text>
                <Text className='lottery-panel__pill-right'>{pill.right}</Text>
            </View>

            {/* 摇签动画类直接由 status 驱动，不再维护独立的定时器 */}
            <View
                className={`lottery-panel__tube-stage ${isDrawing ? 'lottery-panel__tube-stage--shake' : ''}`}
            >
                <View className='lottery-panel__tube-shadow' />
                <View className='lottery-panel__tube-img-wrap'>
                    <Image
                        className='lottery-panel__tube-img'
                        src={lotteryTubeImg}
                        mode='widthFix'
                    />
                </View>
            </View>

            <Text className='lottery-panel__title'>观音灵签</Text>
            <Text className='lottery-panel__desc'>静心凝神，摇签即得今日指引</Text>

            <View
                className={`lottery-panel__cta ${isDrawing ? 'lottery-panel__cta--disabled' : ''}`}
                onClick={() => void onShakeDraw()}
            >
                <Text className='lottery-panel__cta-txt'>{ctaLabel}</Text>
            </View>

            {errorMsg && (
                <View className='lottery-panel__err'>
                    <Text>{errorMsg}</Text>
                </View>
            )}

            {result && (
                <View className='lottery-panel__result'>
                    <View className='lottery-panel__result-meta'>
                        <Text>{result.lunar_summary}</Text>
                    </View>

                    <View className='lottery-panel__result-slip'>
                        <View className='lottery-panel__result-head'>
                            <Text className='lottery-panel__result-id'>第 {result.slip.id} 签</Text>
                            <Text className='lottery-panel__result-tier'>{result.slip.tier}</Text>
                        </View>
                        <Text className='lottery-panel__result-title'>{result.slip.title}</Text>
                        <Text className='lottery-panel__result-poem'>{result.slip.poem}</Text>
                    </View>

                    <Text className='lottery-panel__result-sec-title'>解签</Text>
                    <Text className='lottery-panel__result-interpret'>{result.interpretation}</Text>
                </View>
            )}
        </View>
    )
}
