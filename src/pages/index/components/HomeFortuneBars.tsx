import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'

import type { FortuneItem } from '../utils/homeFortune'

interface HomeFortuneBarsProps {
    items: FortuneItem[]
    loading?: boolean
}

export default function HomeFortuneBars ({ items, loading }: HomeFortuneBarsProps) {
    const [animate, setAnimate] = useState(false)

    useEffect(() => {
        if (loading || !items.length) {
            setAnimate(false)
            return
        }
        const id = window.setTimeout(() => setAnimate(true), 80)
        return () => window.clearTimeout(id)
    }, [loading, items])

    if (loading) {
        return (
            <View className='home-hub__fortune home-hub__fortune--loading'>
                <Text className='home-hub__fortune-loading'>运势加载中…</Text>
            </View>
        )
    }

    if (!items.length) return null

    return (
        <View className={`home-hub__fortune${animate ? ' home-hub__fortune--animate' : ''}`}>
            <View className='home-hub__section-head'>
                <Text className='home-hub__section-title'>今日指数</Text>
                <Text className='home-hub__section-hint'>基于黄历宜忌推算</Text>
            </View>
            <View className='home-hub__fortune-grid'>
                {items.map((item, index) => (
                    <View key={item.key} className='home-hub__fortune-item'>
                        <View className='home-hub__fortune-head'>
                            <Text className='home-hub__fortune-label'>{item.label}</Text>
                            <Text className='home-hub__fortune-score'>{item.score}</Text>
                        </View>
                        <View className='home-hub__fortune-track'>
                            <View
                                className='home-hub__fortune-fill'
                                style={{
                                    width: animate ? `${item.score}%` : '0%',
                                    background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`,
                                    transitionDelay: `${index * 70}ms`
                                }}
                            />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    )
}
