import Taro from '@tarojs/taro'
import type { MemberPanelTabKey } from '@/components/MemberPanel'
import { isLoggedIn } from '@/utils/auth'
import { openLoginModal } from '@/utils/requireAuth'
import { closeInsufficientPointsModal } from '@/utils/insufficientPointsModal'

type OpenMemberHandler = (tab?: MemberPanelTabKey) => void

let handler: OpenMemberHandler | null = null

export function registerMemberNavHandler (fn: OpenMemberHandler | null): void {
    handler = fn
}

export function openMemberCenter (tab?: string): void {
    closeInsufficientPointsModal()
    const memberTab = tab as MemberPanelTabKey | undefined
    if (handler) {
        handler(memberTab)
        return
    }
    const query = [`key=member`, tab ? `tab=${encodeURIComponent(tab)}` : ''].filter(Boolean).join('&')
    const navigate = () => {
        void Taro.reLaunch({ url: `/pages/feature/index?${query}` })
    }
    if (isLoggedIn()) {
        navigate()
        return
    }
    openLoginModal('login', navigate)
}

export function selectMemberTab (
    selectFeature: (key: 'member') => void,
    tab?: MemberPanelTabKey,
    onAfter?: () => void
): void {
    const go = () => {
        selectFeature('member')
        onAfter?.()
    }
    if (isLoggedIn()) {
        go()
        return
    }
    openLoginModal('login', go)
}
