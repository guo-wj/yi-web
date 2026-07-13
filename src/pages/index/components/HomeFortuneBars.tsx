import { View, Text } from '@tarojs/components'

import type { FortuneItem } from '../utils/homeFortune'

interface HomeFortuneBarsProps {
    items: FortuneItem[]
    loading?: boolean
}

export default function HomeFortuneBars ({ items, loading }: HomeFortuneBarsProps) {
    if (loading) {
        return (
            <View className='home-hub__fortune home-hub__fortune--loading'>
                <Text className='home-hub__fortune-loading'>运势加载中…</Text>
            </View>
        )
    }

    if (!items.length) return null

    return (
        <View className='home-hub__fortune'>
            <View className='home-hub__section-head'>
                <Text className='home-hub__section-title'>今日指数</Text>
                <Text className='home-hub__section-hint'>基于黄历宜忌推算</Text>
            </View>
            <View className='home-hub__fortune-grid'>
                {items.map((item) => (
                    <View key={item.key} className='home-hub__fortune-item'>
                        <View className='home-hub__fortune-head'>
                            <Text className='home-hub__fortune-label'>{item.label}</Text>
                            <Text className='home-hub__fortune-score'>{item.score}</Text>
                        </View>
                        <View className='home-hub__fortune-track'>
                            <View
                                className='home-hub__fortune-fill'
                                style={{
                                    width: `${item.score}%`,
                                    background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`
                                }}
                            />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    )
}
