import { View, Text } from '@tarojs/components'
import { useCallback } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { usePoints } from '@/hooks/usePoints'
import { formatUserLabel } from '@/constants/user'
import { openLoginModal } from '@/utils/requireAuth'
import { navigateToFeature } from '../utils/navigateFeature'

export default function HomeUserStrip () {
    const { isLoggedIn, user } = useAuth()
    const { balance, loading } = usePoints()
    const displayName = formatUserLabel(user)

    const onLogin = useCallback(() => {
        openLoginModal('login')
    }, [])

    const onMember = useCallback(() => {
        if (!isLoggedIn) {
            openLoginModal('login', () => navigateToFeature('member'))
            return
        }
        navigateToFeature('member')
    }, [isLoggedIn])

    if (!isLoggedIn) {
        return (
            <View className='home-hub__user-strip home-hub__user-strip--guest' onClick={onLogin}>
                <View className='home-hub__user-copy'>
                    <Text className='home-hub__user-title'>登录解锁个人运势</Text>
                    <Text className='home-hub__user-sub'>签到领积分 · 解锁 AI 解读</Text>
                </View>
                <View className='home-hub__user-btn'>
                    <Text>去登录</Text>
                </View>
            </View>
        )
    }

    return (
        <View className='home-hub__user-strip' onClick={onMember}>
            <View className='home-hub__user-avatar'>
                <Text>{displayName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View className='home-hub__user-copy'>
                <Text className='home-hub__user-title'>{displayName}</Text>
                <Text className='home-hub__user-sub'>
                    {loading
                        ? '积分同步中…'
                        : `积分 ${balance?.balance ?? 0} · 连续签到 ${balance?.checkin_streak ?? 0} 天`}
                </Text>
            </View>
            <View className='home-hub__user-btn home-hub__user-btn--ghost'>
                <Text>会员中心</Text>
            </View>
        </View>
    )
}
