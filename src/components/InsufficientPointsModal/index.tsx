import { View, Text } from '@tarojs/components'
import { useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import {
    closeInsufficientPointsModal,
    getInsufficientPointsModalState,
    openMemberCenter,
    subscribeInsufficientPointsModal
} from '@/utils/insufficientPointsModal'
import { openInviteShareModal } from '@/utils/inviteShareModal'

import '../PointsConfirmModal/index.scss'

function InsufficientPointsModalForm () {
    const modal = useSyncExternalStore(
        subscribeInsufficientPointsModal,
        getInsufficientPointsModalState,
        getInsufficientPointsModalState
    )

    const handleClose = useCallback(() => {
        closeInsufficientPointsModal()
    }, [])

    if (!modal.open) return null

    return (
        <View className='insufficient-modal'>
            <View className='insufficient-modal__mask' onClick={handleClose} />
            <View
                className='insufficient-modal__panel'
                catchMove
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='insufficient-modal__close' onClick={handleClose}>
                    <Text>×</Text>
                </View>
                <Text className='insufficient-modal__title'>积分不足</Text>
                <Text className='insufficient-modal__content'>
                    「{modal.featureLabel}」需要 {modal.required} 积分，当前余额 {modal.balance} 积分。
                    可通过签到、邀请好友或充值获取积分。
                </Text>
                <View className='insufficient-modal__actions'>
                    <View
                        className='insufficient-modal__btn insufficient-modal__btn--primary'
                        onClick={() => openMemberCenter('checkin')}
                    >
                        <Text>去签到</Text>
                    </View>
                    <View
                        className='insufficient-modal__btn insufficient-modal__btn--secondary'
                        onClick={() => openMemberCenter('recharge')}
                    >
                        <Text>去充值</Text>
                    </View>
                    <View
                        className='insufficient-modal__btn insufficient-modal__btn--secondary'
                        onClick={() => {
                            closeInsufficientPointsModal()
                            void openInviteShareModal()
                        }}
                    >
                        <Text>邀请好友</Text>
                    </View>
                    <View
                        className='insufficient-modal__btn insufficient-modal__btn--secondary'
                        onClick={() => openMemberCenter('member')}
                    >
                        <Text>开通会员</Text>
                    </View>
                    <View
                        className='insufficient-modal__btn insufficient-modal__btn--ghost'
                        onClick={handleClose}
                    >
                        <Text>稍后再说</Text>
                    </View>
                </View>
            </View>
        </View>
    )
}

export default function InsufficientPointsModal () {
    const modal = useSyncExternalStore(
        subscribeInsufficientPointsModal,
        getInsufficientPointsModalState,
        getInsufficientPointsModalState
    )

    if (!modal.open) return null

    const node = <InsufficientPointsModalForm />

    if (typeof document !== 'undefined') {
        return createPortal(node, document.body)
    }

    return node
}
