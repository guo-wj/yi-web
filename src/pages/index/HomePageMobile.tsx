import { View, Text } from '@tarojs/components'
import UserMenu from '@/components/UserMenu'
import { useStatusBarHeight } from '@/utils/useStatusBarHeight'
import HomeFeatureCards from './components/HomeFeatureCards'
import './mobile.scss'

export default function HomePageMobile () {
    const statusBarHeight = useStatusBarHeight()

    return (
        <View
            className='home-page home-page--mobile'
            style={{ paddingTop: statusBarHeight }}
        >
            <View className='home-page__header'>
                <View className='home-page__header-inner'>
                    <Text className='home-page__brand'>易AI</Text>
                    <Text className='home-page__brand-tagline'>易学参阅 · AI 相伴</Text>
                </View>
            </View>

            <UserMenu
                dock='top-right'
                uiMode='mobile'
                topOffset={statusBarHeight + 18}
            />

            <View className='home-page__main'>
                <HomeFeatureCards pageMode='mobile' />
            </View>

            <View className='home-page__footer'>
                <Text className='home-page__footer-disclaimer'>
                    本平台内容为传统文化娱乐参考，非科学结论或专业建议，请尊重科学，理性鉴别。
                </Text>
            </View>
        </View>
    )
}
