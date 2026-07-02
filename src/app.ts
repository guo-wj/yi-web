import { PropsWithChildren, createElement } from 'react'
import { useLaunch } from '@tarojs/taro'

import AuthGate from '@/components/AuthGate'

import './app.scss'
import '@/pages/index/mobile.scss'

function App({ children }: PropsWithChildren<any>) {
    useLaunch(() => {
        console.log('App launched.')
    })

    // children 是将要会渲染的页面
    return createElement(AuthGate, null, children)
}
    


export default App
