import { View, Text, Image } from '@tarojs/components'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { WECHAT_QR_IMAGE } from '@/constants/contact'
import {
    closeContactModal,
    getContactModalOpen,
    subscribeContactModal
} from '@/utils/contactModal'

import './index.scss'

function ContactModalForm () {
    const open = useSyncExternalStore(subscribeContactModal, getContactModalOpen, getContactModalOpen)
    const [qrFailed, setQrFailed] = useState(false)
    const showQr = Boolean(WECHAT_QR_IMAGE) && !qrFailed

    useEffect(() => {
        if (open) setQrFailed(false)
    }, [open])

    const handleClose = useCallback(() => {
        closeContactModal()
    }, [])

    if (!open) return null

    return (
        <View className='contact-modal'>
            <View className='contact-modal__mask' onClick={handleClose} />
            <View
                className='contact-modal__panel'
                catchMove
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='contact-modal__close' onClick={handleClose}>
                    <Text>×</Text>
                </View>

                <Text className='contact-modal__title'>联系客服</Text>
                <Text className='contact-modal__subtitle'>请使用手机微信扫一扫，添加客服微信</Text>

                <View className='contact-modal__qr-wrap'>
                    {showQr
                        ? (
                            <Image
                                key={WECHAT_QR_IMAGE}
                                className='contact-modal__qr'
                                src={WECHAT_QR_IMAGE}
                                mode='aspectFit'
                                onError={() => setQrFailed(true)}
                            />
                        )
                        : (
                            <View className='contact-modal__qr-placeholder'>
                                <View className='contact-modal__qr-frame'>
                                    <Text className='contact-modal__qr-icon'>微</Text>
                                </View>
                                <Text className='contact-modal__qr-tip'>微信二维码</Text>
                                <Text className='contact-modal__qr-hint'>待配置客服二维码</Text>
                            </View>
                        )}
                </View>

                <Text className='contact-modal__foot'>打开微信 · 扫一扫 · 添加客服</Text>
            </View>
        </View>
    )
}

export default function ContactModal () {
    const open = useSyncExternalStore(subscribeContactModal, getContactModalOpen, getContactModalOpen)
    if (!open) return null

    const node = <ContactModalForm />
    if (typeof document !== 'undefined') {
        return createPortal(node, document.body)
    }
    return node
}
