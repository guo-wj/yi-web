import { View, Text, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import PendingText from '@/components/LoadingDots'
import {
    closeFeedbackModal,
    getFeedbackModalOpen,
    subscribeFeedbackModal
} from '@/utils/feedbackModal'

import './index.scss'

const MAX_LEN = 500

interface TextareaDetail {
    detail: { value: string }
}

function FeedbackModalForm () {
    const open = useSyncExternalStore(subscribeFeedbackModal, getFeedbackModalOpen, getFeedbackModalOpen)
    const [content, setContent] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        setContent('')
        setSubmitting(false)
    }, [open])

    const handleClose = useCallback(() => {
        closeFeedbackModal()
    }, [])

    const onSubmit = useCallback(async () => {
        const text = content.trim()
        if (!text) {
            void Taro.showToast({ title: '请描述您遇到的问题', icon: 'none' })
            return
        }
        if (submitting) return

        setSubmitting(true)
        try {
            // 暂无后端接口，先本地提交成功提示
            await new Promise((r) => setTimeout(r, 400))
            closeFeedbackModal()
            void Taro.showToast({ title: '感谢您的反馈', icon: 'success' })
        } finally {
            setSubmitting(false)
        }
    }, [content, submitting])

    if (!open) return null

    return (
        <View className='feedback-modal'>
            <View className='feedback-modal__mask' onClick={handleClose} />
            <View
                className='feedback-modal__panel'
                catchMove
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='feedback-modal__close' onClick={handleClose}>
                    <Text>×</Text>
                </View>

                <View className='feedback-modal__emblem'>
                    <Text className='feedback-modal__emblem-char'>易</Text>
                </View>

                <Text className='feedback-modal__title'>问题反馈</Text>
                <Text className='feedback-modal__subtitle'>描述您在使用中遇到的问题或建议</Text>

                <View className='feedback-modal__field'>
                    <Textarea
                        className='feedback-modal__textarea'
                        value={content}
                        maxlength={MAX_LEN}
                        placeholder='请详细描述问题，便于我们尽快处理…'
                        placeholderClass='feedback-modal__placeholder'
                        onInput={(e: TextareaDetail) => setContent(e.detail.value)}
                    />
                    <Text className='feedback-modal__counter'>
                        {content.length}/{MAX_LEN}
                    </Text>
                </View>

                <View className='feedback-modal__actions'>
                    <View className='feedback-modal__cancel' onClick={handleClose}>
                        <Text className='feedback-modal__cancel-txt'>取消</Text>
                    </View>
                    <View
                        className={`feedback-modal__submit ${submitting ? 'feedback-modal__submit--disabled' : ''}`}
                        onClick={() => void onSubmit()}
                    >
                        {submitting
                            ? <PendingText>提交中</PendingText>
                            : <Text>提交</Text>}
                    </View>
                </View>

                <View className='feedback-modal__brand-foot'>
                    <Text>易AI</Text>
                </View>
            </View>
        </View>
    )
}

export default function FeedbackModal () {
    const open = useSyncExternalStore(subscribeFeedbackModal, getFeedbackModalOpen, getFeedbackModalOpen)
    if (!open) return null

    const node = <FeedbackModalForm />
    if (typeof document !== 'undefined') {
        return createPortal(node, document.body)
    }
    return node
}
