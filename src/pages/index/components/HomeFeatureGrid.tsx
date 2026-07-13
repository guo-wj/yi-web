import { View, Text } from '@tarojs/components'

import FeatureIcon from '@/components/FeatureIcon'
import { FEATURE_ITEMS, type FeatureItem } from '@/constants/features'
import { navigateToFeature } from '../utils/navigateFeature'

const FEATURE_TONES: Record<string, string> = {
    huangli: 'amber',
    qian: 'violet',
    liuyao: 'sky',
    ziwei: 'rose',
    bazi: 'teal',
    zhangwen: 'orange',
    mianxiang: 'green'
}

function FeatureGridItem ({ item }: { item: FeatureItem }) {
    const tone = FEATURE_TONES[item.key] ?? 'amber'

    return (
        <View
            className={`home-hub__grid-item home-hub__grid-item--${tone}`}
            onClick={() => navigateToFeature(item.key)}
        >
            {item.badge && (
                <Text className={`home-hub__grid-badge home-hub__grid-badge--${item.badge.toLowerCase()}`}>
                    {item.badge}
                </Text>
            )}
            <View className='home-hub__grid-icon-wrap'>
                <FeatureIcon
                    className='home-hub__grid-icon'
                    src={item.icon}
                    scale={item.iconScale}
                />
            </View>
            <Text className='home-hub__grid-title'>{item.title}</Text>
            <Text className='home-hub__grid-desc'>{item.desc}</Text>
        </View>
    )
}

export default function HomeFeatureGrid () {
    return (
        <View className='home-hub__grid-section'>
            <View className='home-hub__section-head'>
                <Text className='home-hub__section-title'>探索工具</Text>
                <Text className='home-hub__section-hint'>点击进入对应模块</Text>
            </View>
            <View className='home-hub__grid'>
                {FEATURE_ITEMS.map((item) => (
                    <FeatureGridItem key={item.key} item={item} />
                ))}
            </View>
        </View>
    )
}
