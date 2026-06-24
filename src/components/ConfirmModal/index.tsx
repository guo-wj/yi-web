import { View, Text } from '@tarojs/components'
import { useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import {
    closeConfirmModal,
    confirmAndClose,
    getConfirmModalState,
    subscribeConfirmModal
} from '@/utils/confirmModal'

import './index.scss'

function ConfirmModalForm () {
    const modal = useSyncExternalStore(
        subscribeConfirmModal,
        getConfirmModalState,
        getConfirmModalState
    )

    const handleClose = useCallback(() => {
        closeConfirmModal()
    }, [])

    if (!modal.open) return null

    return (
        <View className='confirm-modal'>
            <View className='confirm-modal__mask' onClick={handleClose} />
            <View
                className='confirm-modal__panel'
                catchMove
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='confirm-modal__close' onClick={handleClose}>
                    <Text>×</Text>
                </View>

                <Text className='confirm-modal__title'>{modal.title}</Text>
                <Text className='confirm-modal__content'>{modal.content}</Text>

                <View
                    className={`confirm-modal__actions ${modal.showCancel ? '' : 'confirm-modal__actions--alert'}`}
                >
                    {modal.showCancel && (
                        <View className='confirm-modal__cancel' onClick={handleClose}>
                            <Text className='confirm-modal__cancel-txt'>{modal.cancelText}</Text>
                        </View>
                    )}
                    <View className='confirm-modal__confirm' onClick={confirmAndClose}>
                        <Text>{modal.confirmText}</Text>
                    </View>
                </View>
            </View>
        </View>
    )
}

/** 全局确认弹窗，风格与登录/注册弹窗一致 */
export default function ConfirmModal () {
    const modal = useSyncExternalStore(
        subscribeConfirmModal,
        getConfirmModalState,
        getConfirmModalState
    )

    if (!modal.open) return null

    const node = <ConfirmModalForm />

    if (typeof document !== 'undefined') {
        return createPortal(node, document.body)
    }

    return node
}
