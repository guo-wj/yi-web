import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { useCallback, useState } from 'react'
import UserMenu from '@/components/UserMenu'
import { useStatusBarHeight } from '@/utils/useStatusBarHeight'
import type { FeatureKey } from '@/constants/features'
import { FeatureMainBlock, FeatureSidebar, useFeatureState } from './components/shared'
import './mobile.scss'

export default function FeaturePageMobile () {
    const statusBarHeight = useStatusBarHeight()
    const {
        activeKey,
        today,
        selectFeature,
        syncFeatureKey,
        goHome,
        onPrimaryAction
    } = useFeatureState()
    const [drawerOpen, setDrawerOpen] = useState(false)

    useLoad((options) => {
        const raw = options?.key as string | undefined
        syncFeatureKey(raw)
    })

    const closeDrawer = useCallback(() => setDrawerOpen(false), [])

    const selectAndClose = useCallback((key: FeatureKey) => {
        selectFeature(key)
        closeDrawer()
    }, [closeDrawer, selectFeature])

    return (
        <View className='feature-page-mobile'>
            <View className='feature-page-mobile__topbar' style={{ paddingTop: statusBarHeight }}>
                <View className='feature-page-mobile__topbar-row'>
                    <View
                        className='feature-page-mobile__menu-btn'
                        onClick={() => setDrawerOpen(true)}
                    >
                        <Text className='feature-page-mobile__menu-icon'>☰</Text>
                    </View>
                    <Text className='feature-page-mobile__topbar-title'>易鉴</Text>
                </View>
            </View>

            <UserMenu
                dock='top-right'
                uiMode='mobile'
                topOffset={statusBarHeight + 18}
            />

            {drawerOpen && (
                <View
                    className='feature-page-mobile__drawer-mask'
                    onClick={closeDrawer}
                    catchMove
                />
            )}

            <View
                className={`feature-page-mobile__drawer ${drawerOpen ? 'feature-page-mobile__drawer--open' : ''}`}
                catchMove
                onClick={(e) => e.stopPropagation?.()}
            >
                <FeatureSidebar
                    activeKey={activeKey}
                    onSelect={selectAndClose}
                    onGoHome={() => {
                        closeDrawer()
                        goHome()
                    }}
                    drawerMode
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
