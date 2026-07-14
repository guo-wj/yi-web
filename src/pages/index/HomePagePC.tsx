import { View, Text } from '@tarojs/components'
import { useSyncExternalStore } from 'react'

import UserMenu from '@/components/UserMenu'
import InviteQuickEntry from '@/components/InviteQuickEntry'
import {
    getShellSettingsState,
    subscribeShellSettings
} from '@/utils/shellSettings'
import HomeHubContent from './components/HomeHubContent'
import './pc.scss'

export default function HomePagePC () {
    const { theme } = useSyncExternalStore(
        subscribeShellSettings,
        getShellSettingsState,
        getShellSettingsState
    )

    return (
        <View className={`home-page home-page--pc home-page--theme-${theme}`}>
            <View className='home-page__topbar'>
                <View className='home-page__brand-block'>
                    <View className='home-page__brand-mark'>
                        <Text>易</Text>
                    </View>
                    <View>
                        <Text className='home-page__brand'>易AI</Text>
                        <Text className='home-page__brand-tagline'>易学参阅 · AI 相伴</Text>
                    </View>
                </View>
                <View className='home-page__topbar-actions'>
                    <InviteQuickEntry variant='topbar' />
                    <UserMenu dock='topbar-inline' uiMode='pc' />
                </View>
            </View>

            <View className='home-page__main'>
                <HomeHubContent pageMode='pc' />
            </View>

            <View className='home-page__footer'>
                <Text className='home-page__footer-disclaimer'>
                    弘扬传统文化，娱乐参考，理性看待。
                </Text>
            </View>
        </View>
    )
}
