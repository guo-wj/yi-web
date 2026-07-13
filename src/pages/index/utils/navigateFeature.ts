import Taro from '@tarojs/taro'

import type { FeatureKey } from '@/constants/features'

export function navigateToFeature (key: FeatureKey, tab?: string): void {
    const params = new URLSearchParams({ key })
    if (tab) params.set('tab', tab)
    void Taro.navigateTo({
        url: `/pages/feature/index?${params.toString()}`
    })
}
