import { View, Text } from '@tarojs/components'

import PendingText from '@/components/LoadingDots'

import './index.scss'

interface PanelExtractOverlayProps {
    /** 如「识象分析中」「掌象识别中」 */
    label: string
    /** 步骤文案，默认三步 */
    steps?: [string, string, string]
    /** 移动端紧凑布局，适配矮网格 */
    compact?: boolean
}

const DEFAULT_STEPS: [string, string, string] = ['采象', '识读', '整理']

/** 上传区识别中的扫描遮罩（面相/掌纹共用） */
export default function PanelExtractOverlay ({
    label,
    steps = DEFAULT_STEPS,
    compact = false
}: PanelExtractOverlayProps) {
    const rootClass = [
        'panel-extract-overlay',
        compact ? 'panel-extract-overlay--compact' : ''
    ].filter(Boolean).join(' ')

    return (
        <View className={rootClass} aria-busy='true'>
            <View className='panel-extract-overlay__veil' />
            <View className='panel-extract-overlay__scan-line' />
            <View className='panel-extract-overlay__body'>
                <View className='panel-extract-overlay__pulse'>
                    <View className='panel-extract-overlay__ring panel-extract-overlay__ring--outer' />
                    <View className='panel-extract-overlay__ring panel-extract-overlay__ring--inner' />
                    <View className='panel-extract-overlay__core' />
                </View>
                <PendingText className='panel-extract-overlay__label'>{label}</PendingText>
                <View className='panel-extract-overlay__steps'>
                    {steps.map((step, i) => (
                        <View
                            key={step}
                            className={`panel-extract-overlay__step ${i === 1 ? 'panel-extract-overlay__step--active' : ''} ${i === 0 ? 'panel-extract-overlay__step--done' : ''}`}
                        >
                            <Text className='panel-extract-overlay__step-n'>{i + 1}</Text>
                            <Text className='panel-extract-overlay__step-t'>{step}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    )
}
