import { View, Text } from '@tarojs/components'

import FeatureIcon from '@/components/FeatureIcon'
import iconQian from '@/assets/icons/qian.svg'
import iconLiuyao from '@/assets/icons/liuyao.svg'
import iconHuangli from '@/assets/icons/huangli.svg'
import inviteIcon from '@/assets/icons/invite.svg'
import { openInviteShareModal } from '@/utils/inviteShareModal'
import { isLoggedIn } from '@/utils/auth'
import { openLoginModal } from '@/utils/requireAuth'
import { navigateToFeature } from '../utils/navigateFeature'

const ACTIONS = [
    {
        key: 'qian',
        label: '今日灵签',
        desc: '一日一签',
        icon: iconQian,
        tone: 'purple',
        onClick: () => navigateToFeature('qian')
    },
    {
        key: 'liuyao',
        label: '六爻起卦',
        desc: '即时起卦',
        icon: iconLiuyao,
        tone: 'blue',
        onClick: () => navigateToFeature('liuyao')
    },
    {
        key: 'checkin',
        label: '每日签到',
        desc: '领积分',
        icon: iconHuangli,
        tone: 'gold',
        onClick: () => {
            if (!isLoggedIn()) {
                openLoginModal('login', () => navigateToFeature('member', 'checkin'))
                return
            }
            navigateToFeature('member', 'checkin')
        }
    },
    {
        key: 'invite',
        label: '邀请好友',
        desc: '得积分',
        icon: inviteIcon,
        tone: 'rose',
        onClick: () => {
            void openInviteShareModal()
        }
    }
] as const

export default function HomeQuickActions () {
    return (
        <View className='home-hub__quick'>
            <View className='home-hub__section-head'>
                <Text className='home-hub__section-title'>快捷入口</Text>
            </View>
            <View className='home-hub__quick-row'>
                {ACTIONS.map((action) => (
                    <View
                        key={action.key}
                        className={`home-hub__quick-item home-hub__quick-item--${action.tone}`}
                        onClick={(e) => {
                            e.stopPropagation?.()
                            action.onClick()
                        }}
                    >
                        <View className='home-hub__quick-icon-wrap'>
                            <FeatureIcon className='home-hub__quick-icon' src={action.icon} scale={0.92} />
                        </View>
                        <Text className='home-hub__quick-label'>{action.label}</Text>
                        <Text className='home-hub__quick-desc'>{action.desc}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}
