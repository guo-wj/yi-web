import { useLoad } from '@tarojs/taro'

import { isMobile } from '@/utils/device'
import { captureInviteFromQuery } from '@/utils/inviteCode'
import HomePageMobile from './HomePageMobile'
import HomePagePC from './HomePagePC'

export default function Index () {
    useLoad((options) => {
        captureInviteFromQuery(options as Record<string, string | undefined>)
    })

    return isMobile() ? <HomePageMobile /> : <HomePagePC />
}
