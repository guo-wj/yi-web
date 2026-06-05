import { useLoad } from '@tarojs/taro'
import { View } from '@tarojs/components'
import { FeatureMainBlock, FeatureSidebar, useFeatureState } from './components/shared'
import './pc.scss'

export default function FeaturePagePC () {
    const {
        activeKey,
        today,
        selectFeature,
        syncFeatureKey,
        goHome,
        onPrimaryAction
    } = useFeatureState()

    useLoad((options) => {
        const raw = options?.key as string | undefined
        syncFeatureKey(raw)
    })

    return (
        <View className='feature-page-pc feature-page-pc--theme-dark'>
            <View className='feature-page-pc__sidebar'>
                <FeatureSidebar
                    activeKey={activeKey}
                    onSelect={selectFeature}
                    onGoHome={goHome}
                    pcMode
                />
            </View>

            <FeatureMainBlock
                activeKey={activeKey}
                onPrimaryAction={onPrimaryAction}
                today={today}
            />
        </View>
    )
}
