import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'

import PendingText from '@/components/LoadingDots'
import type { AlmanacResponse } from '@/services/almanacApi'
import { formatSolarLine } from '../utils/homeFortune'
import { navigateToFeature } from '../utils/navigateFeature'

interface HomeTodayCardProps {
    loading: boolean
    error: string | null
    data: AlmanacResponse | null
    todayScore: number
}

export default function HomeTodayCard ({
    loading,
    error,
    data,
    todayScore
}: HomeTodayCardProps) {
    const [displayScore, setDisplayScore] = useState(0)
    const yiPreview = data?.yi.slice(0, 3).join(' · ') ?? '加载今日宜忌…'

    useEffect(() => {
        if (loading) {
            setDisplayScore(0)
            return
        }

        let frame = 0
        const from = 0
        const to = todayScore
        const duration = 780
        const start = performance.now()

        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration)
            const eased = 1 - (1 - t) ** 3
            setDisplayScore(Math.round(from + (to - from) * eased))
            if (t < 1) {
                frame = window.requestAnimationFrame(tick)
            }
        }

        frame = window.requestAnimationFrame(tick)
        return () => window.cancelAnimationFrame(frame)
    }, [loading, todayScore])

    return (
        <View
            className='home-hub__today'
            onClick={() => navigateToFeature('huangli')}
        >
            <View className='home-hub__today-shine' />
            <View className='home-hub__today-top'>
                <View className='home-hub__today-copy'>
                    <Text className='home-hub__today-kicker'>今日运势</Text>
                    {loading ? (
                        <PendingText className='home-hub__today-date'>加载中</PendingText>
                    ) : error ? (
                        <Text className='home-hub__today-date'>点击查看老黄历</Text>
                    ) : data ? (
                        <>
                            <Text className='home-hub__today-date'>{formatSolarLine(data)}</Text>
                            <Text className='home-hub__today-meta'>
                                {data.lunar.year_ganzhi}年 · {data.lunar.shengxiao} · {data.lunar.day_ganzhi}日
                            </Text>
                        </>
                    ) : null}
                </View>
                <View className={`home-hub__today-score${!loading ? ' home-hub__today-score--ready' : ''}`}>
                    <Text className='home-hub__today-score-num'>{displayScore}</Text>
                    <Text className='home-hub__today-score-unit'>分</Text>
                </View>
            </View>

            <Text className='home-hub__today-yi'>
                {loading ? '正在同步今日黄历…' : error ? '黄历暂不可用，仍可进入查看' : `宜 ${yiPreview}`}
            </Text>

            <View className='home-hub__today-cta'>
                <Text>查看完整黄历</Text>
                <Text className='home-hub__today-cta-arrow'>→</Text>
            </View>
        </View>
    )
}
