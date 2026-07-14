import { View } from '@tarojs/components'
import { useEffect, useState } from 'react'

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
    const [entered, setEntered] = useState(false)

    useEffect(() => {
        const id = window.requestAnimationFrame(() => setEntered(true))
        return () => window.cancelAnimationFrame(id)
    }, [])

    return (
        <View
            className={[
                'home-hub',
                `home-hub--${pageMode}`,
                entered ? 'home-hub--entered' : ''
            ].filter(Boolean).join(' ')}
        >
            <View className='home-hub__reveal home-hub__reveal--1'>
                <HomeUserStrip />
            </View>
            <View className='home-hub__reveal home-hub__reveal--2'>
                <HomeTodayCard
                    loading={loading}
                    error={error}
                    data={data}
                    todayScore={todayScore}
                />
            </View>
            <View className='home-hub__reveal home-hub__reveal--3'>
                <HomeFortuneBars items={fortuneItems} loading={loading} />
            </View>
            <View className='home-hub__reveal home-hub__reveal--4'>
                <HomeQuickActions />
            </View>
            <View className='home-hub__reveal home-hub__reveal--5'>
                <HomeFeatureGrid />
            </View>
        </View>
    )
}
