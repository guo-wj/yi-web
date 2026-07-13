import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import PendingText from '@/components/LoadingDots'
import { formatUserLabel } from '@/constants/user'
import { useAuth } from '@/hooks/useAuth'
import {
    closeInviteShareModal,
    getInviteShareModalState,
    subscribeInviteShareModal
} from '@/utils/inviteShareModal'
import { computeAnchoredPopoverPosition, getPageViewportInsets, rectFromElement } from '@/utils/anchoredPopover'

import './index.scss'

interface InviteSharePanelProps {
    onClose: () => void
    variant?: 'center' | 'popover'
    className?: string
    style?: Record<string, string | number>
    panelRef?: React.RefObject<HTMLElement | null>
}

function InviteSharePanel ({
    onClose,
    variant = 'center',
    className,
    style,
    panelRef
}: InviteSharePanelProps) {
    const modal = useSyncExternalStore(
        subscribeInviteShareModal,
        getInviteShareModalState,
        getInviteShareModalState
    )
    const { user } = useAuth()
    const displayName = formatUserLabel(user)

    const copyText = useCallback(async (text: string, okTitle: string) => {
        if (!text) return
        try {
            await Taro.setClipboardData({ data: text })
            void Taro.showToast({ title: okTitle, icon: 'none' })
        } catch {
            void Taro.showToast({ title: '复制失败', icon: 'none' })
        }
    }, [])

    return (
        <View
            ref={panelRef}
            className={className}
            style={style}
            catchMove
            onClick={(e) => e.stopPropagation?.()}
        >
            <Text className={`invite-share-modal__title ${variant === 'popover' ? 'invite-share-modal__title--popover' : ''}`}>邀请好友</Text>
            {variant === 'center' && (
                <Text className='invite-share-modal__user'>{displayName}</Text>
            )}
            <Text className={`invite-share-modal__subtitle ${variant === 'popover' ? 'invite-share-modal__subtitle--popover' : ''}`}>
                分享给好友注册，双方均可获得积分奖励
            </Text>

            {modal.loading ? (
                <View className='invite-share-modal__loading'>
                    <PendingText>加载中</PendingText>
                </View>
            ) : modal.error ? (
                <Text className='invite-share-modal__error'>{modal.error}</Text>
            ) : (
                <View className={`invite-share-modal__preview ${variant === 'popover' ? 'invite-share-modal__preview--popover' : ''}`}>
                    <View className={`invite-share-modal__row ${variant === 'popover' ? 'invite-share-modal__row--popover' : ''}`}>
                        <View className='invite-share-modal__row-main'>
                            <Text className={`invite-share-modal__label ${variant === 'popover' ? 'invite-share-modal__label--popover' : ''}`}>邀请码</Text>
                            <Text className={`invite-share-modal__code ${variant === 'popover' ? 'invite-share-modal__code--popover' : ''}`}>{modal.referralCode}</Text>
                        </View>
                        <View
                            className={`invite-share-modal__copy ${variant === 'popover' ? 'invite-share-modal__copy--popover' : ''}`}
                            onClick={() => void copyText(modal.referralCode, '邀请码已复制')}
                        >
                            <Text>复制</Text>
                        </View>
                    </View>
                    <View className={`invite-share-modal__row ${variant === 'popover' ? 'invite-share-modal__row--popover' : ''}`}>
                        <View className='invite-share-modal__row-main'>
                            <Text className={`invite-share-modal__label ${variant === 'popover' ? 'invite-share-modal__label--popover' : ''}`}>邀请链接</Text>
                            <Text className={`invite-share-modal__link ${variant === 'popover' ? 'invite-share-modal__link--popover' : ''}`}>{modal.inviteLink}</Text>
                        </View>
                        <View
                            className={`invite-share-modal__copy ${variant === 'popover' ? 'invite-share-modal__copy--popover' : ''}`}
                            onClick={() => void copyText(modal.inviteLink, '链接已复制')}
                        >
                            <Text>复制</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    )
}

function InviteShareCenterModal () {
    const handleClose = useCallback(() => {
        closeInviteShareModal()
    }, [])

    return (
        <View className='invite-share-modal'>
            <View className='invite-share-modal__mask' onClick={handleClose} />
            <InviteSharePanel
                className='invite-share-modal__panel'
                variant='center'
                onClose={handleClose}
            />
        </View>
    )
}

function InviteSharePopover () {
    const modal = useSyncExternalStore(
        subscribeInviteShareModal,
        getInviteShareModalState,
        getInviteShareModalState
    )
    const panelRef = useRef<HTMLElement | null>(null)
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 })

    const handleClose = useCallback(() => {
        closeInviteShareModal()
    }, [])

    const syncPanelPos = useCallback(() => {
        const anchorEl = modal.anchorEl
        const panelEl = panelRef.current
        if (!anchorEl || !panelEl || typeof window === 'undefined') return

        const anchor = rectFromElement(anchorEl)
        const panelHeight = panelEl.offsetHeight || 280
        const insets = getPageViewportInsets()
        const vw = window.innerWidth
        const maxWidth = vw - insets.left - insets.right
        const width = Math.min(360, maxWidth)
        const { top, left } = computeAnchoredPopoverPosition(
            anchor,
            width,
            panelHeight,
            'end'
        )
        setPanelPos({ top, left, width })
    }, [modal.anchorEl])

    useEffect(() => {
        if (!modal.open || modal.mode !== 'popover') return

        syncPanelPos()
        const id = window.requestAnimationFrame(() => syncPanelPos())
        if (typeof window === 'undefined') return
        window.addEventListener('resize', syncPanelPos)
        window.addEventListener('scroll', syncPanelPos, true)
        return () => {
            window.cancelAnimationFrame(id)
            window.removeEventListener('resize', syncPanelPos)
            window.removeEventListener('scroll', syncPanelPos, true)
        }
    }, [modal.open, modal.mode, modal.loading, modal.error, modal.referralCode, syncPanelPos])

    if (!modal.anchorEl) return null

    return (
        <>
            <View
                className='invite-share-modal__popover-backdrop'
                catchMove
                onClick={handleClose}
            />
            <InviteSharePanel
                panelRef={panelRef}
                variant='popover'
                className='invite-share-modal__panel invite-share-modal__panel--popover'
                style={{
                    top: `${panelPos.top}px`,
                    left: `${panelPos.left}px`,
                    width: panelPos.width > 0 ? `${panelPos.width}px` : undefined
                }}
                onClose={handleClose}
            />
        </>
    )
}

export default function InviteShareModal () {
    const modal = useSyncExternalStore(
        subscribeInviteShareModal,
        getInviteShareModalState,
        getInviteShareModalState
    )

    if (!modal.open) return null

    const node = modal.mode === 'popover'
        ? <InviteSharePopover />
        : <InviteShareCenterModal />

    if (typeof document !== 'undefined') {
        return createPortal(node, document.body)
    }

    return node
}
