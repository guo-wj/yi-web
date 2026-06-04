import { View, Text } from '@tarojs/components'
import UserMenu from '@/components/UserMenu'
import HomeFeatureCards from './components/HomeFeatureCards'
import './pc.scss'

export default function HomePagePC () {
  return (
    <View className='home-page home-page--pc'>
      <View className='home-page__header'>
        <View className='home-page__header-inner'>
          <Text className='home-page__brand'>易鉴</Text>
          <Text className='home-page__brand-tagline'>易学参阅 · AI 相伴</Text>
        </View>
      </View>

      <UserMenu dock='top-right' uiMode='pc' topOffset={18} />

      <View className='home-page__main'>
        <HomeFeatureCards pageMode='pc' />
      </View>

      <View className='home-page__footer'>
        <Text className='home-page__footer-disclaimer'>
          本平台内容为传统文化娱乐参考，非科学结论或专业建议，请尊重科学，理性鉴别。
        </Text>
      </View>
    </View>
  )
}
