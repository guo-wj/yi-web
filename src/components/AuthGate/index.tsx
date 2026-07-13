import { PropsWithChildren, useEffect } from 'react'

import LoginModal from '@/components/LoginModal'
import ConfirmModal from '@/components/ConfirmModal'
import SettingsModal from '@/components/SettingsModal'
import ContactModal from '@/components/ContactModal'
import PointsConfirmModal from '@/components/PointsConfirmModal'
import InsufficientPointsModal from '@/components/InsufficientPointsModal'
import InviteShareModal from '@/components/InviteShareModal'
import { restoreAuthSession } from '@/utils/auth'
import { captureInviteFromLocation } from '@/utils/inviteCode'
import { maybeOpenInviteRegister } from '@/utils/requireAuth'

/** 游客可浏览；登录/注册以全局弹窗形式弹出。 */
export default function AuthGate ({ children }: PropsWithChildren) {
    useEffect(() => {
        captureInviteFromLocation()
        void restoreAuthSession().finally(() => {
            maybeOpenInviteRegister()
        })
    }, [])

    return (
        <>
            {children}
            <LoginModal />
            <ConfirmModal />
            <SettingsModal />
            <ContactModal />
            <PointsConfirmModal />
            <InsufficientPointsModal />
            <InviteShareModal />
        </>
    )
}
