import { View, Text, Navigator } from '@tarojs/components'
import { FEATURE_ITEMS } from '@/constants/features'

interface HomeFeatureCardsProps {
    pageMode: 'mobile' | 'pc'
}

export default function HomeFeatureCards ({ pageMode }: HomeFeatureCardsProps) {
    return (
        <View className='home-page__cards'>
            {FEATURE_ITEMS.map((item) => (
                <Navigator
                    key={item.key}
                    className={`home-page__card home-page__card--${pageMode}`}
                    url={`/pages/feature/index?key=${encodeURIComponent(item.key)}`}
                    hoverClass='home-page__card--hover'
                >
                    <View className='home-page__card-icon-ring'>
                        <Text className='home-page__card-icon'>{item.icon}</Text>
                    </View>
                    <View className='home-page__card-body'>
                        <View className='home-page__card-title-row'>
                            <Text className='home-page__card-title'>{item.title}</Text>
                            {item.badge && (
                                <Text
                                    className={
                                        item.badge === 'HOT'
                                            ? 'home-page__pill home-page__pill--hot'
                                            : 'home-page__pill home-page__pill--new'
                                    }
                                >
                                    {item.badge}
                                </Text>
                            )}
                        </View>
                        <Text className='home-page__card-desc'>{item.desc}</Text>
                    </View>
                    <Text className='home-page__card-arrow'>›</Text>
                </Navigator>
            ))}
        </View>
    )
}
