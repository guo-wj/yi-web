import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import FeatureIcon from '@/components/FeatureIcon'
import { FEATURE_ITEMS } from '@/constants/features'

interface HomeFeatureCardsProps {
    pageMode: 'mobile' | 'pc'
}

export default function HomeFeatureCards ({ pageMode }: HomeFeatureCardsProps) {
    return (
        <View className='home-page__cards'>
            {FEATURE_ITEMS.map((item) => (
                <View
                    key={item.key}
                    className={`home-page__card home-page__card--${pageMode}`}
                    onClick={() => {
                        void Taro.navigateTo({
                            url: `/pages/feature/index?key=${encodeURIComponent(item.key)}`
                        })
                    }}
                >
                    <View className='home-page__card-icon-ring'>
                        <FeatureIcon
                            className='home-page__card-icon'
                            src={item.icon}
                            scale={item.iconScale}
                        />
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
                </View>
            ))}
        </View>
    )
}
