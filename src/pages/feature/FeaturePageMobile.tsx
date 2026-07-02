import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { useCallback, useState, useSyncExternalStore } from 'react'
import UserMenu from '@/components/UserMenu'
import { useStatusBarHeight } from '@/utils/useStatusBarHeight'
import {
    getShellSettingsState,
    subscribeShellSettings
} from '@/utils/shellSettings'
import type { FeatureKey } from '@/constants/features'
import { FeatureMainBlock, FeatureSidebar, useFeatureState } from './components/shared'
import './mobile.scss'

/** 与 mobile.scss 中 $mobile-topbar-row-h 保持一致 */
const MOBILE_TOPBAR_ROW_H = 56

export default function FeaturePageMobile () {
    const statusBarHeight = useStatusBarHeight()
    const { theme } = useSyncExternalStore(
        subscribeShellSettings,
        getShellSettingsState,
        getShellSettingsState
    )
    const {
        activeKey,
        memberTab,
        selectFeature,
        syncFeatureKey,
        goHome
    } = useFeatureState()
    const [drawerOpen, setDrawerOpen] = useState(false)

    useLoad((options) => {
        const raw = options?.key as string | undefined
        const tab = options?.tab as string | undefined
        syncFeatureKey(raw, tab)
    })

    const closeDrawer = useCallback(() => setDrawerOpen(false), [])

    const selectAndClose = useCallback((key: FeatureKey) => {
        selectFeature(key)
        closeDrawer()
    }, [closeDrawer, selectFeature])

    const topbarInset = statusBarHeight + MOBILE_TOPBAR_ROW_H

    return (
        <View className={`feature-page-mobile feature-page-mobile--theme-${theme}`}>
            <View className='feature-page-mobile__topbar' style={{ paddingTop: statusBarHeight }}>
                <View className='feature-page-mobile__topbar-row'>
                    <View
                        className='feature-page-mobile__menu-btn'
                        onClick={() => setDrawerOpen(true)}
                    >
                        <Text className='feature-page-mobile__menu-icon'>☰</Text>
                    </View>
                    <Text className='feature-page-mobile__topbar-title'>易AI</Text>
                    <View className='feature-page-mobile__topbar-user'>
                        <UserMenu dock='topbar-inline' uiMode='mobile' />
                    </View>
                </View>
            </View>

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
                    onNavigateAway={closeDrawer}
                    drawerMode
                />
            </View>

            <View
                className='feature-page-mobile__body'
                style={{ paddingTop: topbarInset }}
            >
                <FeatureMainBlock activeKey={activeKey} memberTab={memberTab} />
            </View>
        </View>
    )
}
