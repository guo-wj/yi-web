import Taro, { useLoad } from '@tarojs/taro'
import { View } from '@tarojs/components'

/** 入口页统一跳转功能壳，避免首页异步 CSS 分片在部分环境下未加载 */
export default function Index () {
    useLoad(() => {
        void Taro.reLaunch({ url: '/pages/feature/index' })
    })

    // 跳转完成前占位，避免 return null 白屏
    return <View className='index-redirect' />
}
