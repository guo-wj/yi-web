import { View } from '@tarojs/components'

import HomeTodayCard from './HomeTodayCard'
import HomeFortuneBars from './HomeFortuneBars'
import HomeQuickActions from './HomeQuickActions'
import HomeFeatureGrid from './HomeFeatureGrid'
import HomeUserStrip from './HomeUserStrip'
import { useHomeAlmanac } from '../hooks/useHomeAlmanac'

interface HomeHubContentProps {
    pageMode: 'mobile' | 'pc'
}

export default function HomeHubContent ({ pageMode }: HomeHubContentProps) {
    const { loading, error, data, fortuneItems, todayScore } = useHomeAlmanac()

    return (
        <View className={`home-hub home-hub--${pageMode}`}>
            <HomeUserStrip />
            <HomeTodayCard
                loading={loading}
                error={error}
                data={data}
                todayScore={todayScore}
            />
            <HomeFortuneBars items={fortuneItems} loading={loading} />
            <HomeQuickActions />
            <HomeFeatureGrid />
        </View>
    )
}
