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
        selectFeature,
        syncFeatureKey,
        goHome
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
                    <Text className='feature-page-mobile__topbar-title'>易AI</Text>
                </View>
            </View>

            <UserMenu
                dock='top-right'
                uiMode='mobile'
                topOffset={statusBarHeight + 12}
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

            <FeatureMainBlock activeKey={activeKey} />
        </View>
    )
}
