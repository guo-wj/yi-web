import { View, Text } from '@tarojs/components'
import { useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import {
    buildPointsConfirmContent,
    buildPointsConfirmLabel,
    closePointsConfirmModal,
    confirmPointsAndClose,
    getPointsConfirmModalState,
    subscribePointsConfirmModal
} from '@/utils/pointsConfirmModal'

import './index.scss'

function PointsConfirmModalForm () {
    const modal = useSyncExternalStore(
        subscribePointsConfirmModal,
        getPointsConfirmModalState,
        getPointsConfirmModalState
    )

    const handleClose = useCallback(() => {
        closePointsConfirmModal()
    }, [])

    if (!modal.open || !modal.feature) return null

    const title = modal.usesFreeQuota ? '使用免费额度' : '确认消耗积分'
    const content = buildPointsConfirmContent(modal)
    const confirmLabel = buildPointsConfirmLabel(modal)

    return (
        <View className='points-modal'>
            <View className='points-modal__mask' onClick={handleClose} />
            <View
                className='points-modal__panel'
                catchMove
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='points-modal__close' onClick={handleClose}>
                    <Text>×</Text>
                </View>
                <Text className='points-modal__title'>{title}</Text>
                <Text className='points-modal__content'>{content}</Text>
                <View className='points-modal__actions'>
                    <View className='points-modal__cancel' onClick={handleClose}>
                        <Text className='points-modal__cancel-txt'>取消</Text>
                    </View>
                    <View className='points-modal__confirm' onClick={confirmPointsAndClose}>
                        <Text>{confirmLabel}</Text>
                    </View>
                </View>
            </View>
        </View>
    )
}

export default function PointsConfirmModal () {
    const modal = useSyncExternalStore(
        subscribePointsConfirmModal,
        getPointsConfirmModalState,
        getPointsConfirmModalState
    )

    if (!modal.open) return null

    const node = <PointsConfirmModalForm />

    if (typeof document !== 'undefined') {
        return createPortal(node, document.body)
    }

    return node
}
