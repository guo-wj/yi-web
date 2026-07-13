import { View, Text } from '@tarojs/components'
import { useCallback, useRef } from 'react'

import FeatureIcon from '@/components/FeatureIcon'
import inviteIcon from '@/assets/icons/invite.svg'
import { openInviteShareModal } from '@/utils/inviteShareModal'

import './index.scss'

interface InviteQuickEntryProps {
    variant: 'topbar' | 'sidebar'
    /** 点击后回调，如关闭移动端抽屉 */
    onAfterClick?: () => void
}

export default function InviteQuickEntry ({
    variant,
    onAfterClick
}: InviteQuickEntryProps) {
    const rootRef = useRef<HTMLElement | null>(null)

    const onClick = useCallback(() => {
        void openInviteShareModal({ anchorEl: rootRef.current })
        onAfterClick?.()
    }, [onAfterClick])

    return (
        <View
            ref={rootRef}
            className={`invite-entry invite-entry--${variant}`}
            onClick={(e) => {
                e.stopPropagation?.()
                onClick()
            }}
        >
            <FeatureIcon
                className='invite-entry__icon'
                src={inviteIcon}
                scale={variant === 'topbar' ? 0.88 : 0.9}
            />
            <Text className='invite-entry__label'>邀请</Text>
        </View>
    )
}
