import Taro from '@tarojs/taro'
import { useEffect } from 'react'
import HomePageMobile from './HomePageMobile'
import { isMobile } from '@/utils/device'

export default function Index () {
  const mobile = isMobile()

  useEffect(() => {
    if (!mobile) {
      void Taro.reLaunch({ url: '/pages/feature/index' })
    }
  }, [mobile])

  if (!mobile) {
    return null
  }

  return <HomePageMobile />
}
