import { View, Text } from '@tarojs/components'

import './index.scss'

interface PanelBackButtonProps {
    onClick: () => void
    /** 无障碍说明，默认「返回上一页」 */
    label?: string
}

/** 与会员中心 member-page__back 同款返回箭头 */
export default function PanelBackButton ({ onClick, label = '返回上一页' }: PanelBackButtonProps) {
    return (
        <View className='panel-back'>
            <View
                className='panel-back__btn'
                onClick={onClick}
                aria-label={label}
            >
                <Text>‹</Text>
            </View>
        </View>
    )
}
