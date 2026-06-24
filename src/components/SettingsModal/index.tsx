import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import FeatureIcon from '@/components/FeatureIcon'
import moonIcon from '@/assets/icons/moon.svg'
import sunIcon from '@/assets/icons/sun.svg'
import {
    closeSettingsModal,
    getSettingsModalOpen,
    subscribeSettingsModal
} from '@/utils/settingsModal'
import {
    getShellSettingsState,
    setAppLocale,
    setShellTheme,
    subscribeShellSettings,
    type AppLocale,
    type ShellTheme
} from '@/utils/shellSettings'

import './index.scss'

function SettingsModalForm () {
    const open = useSyncExternalStore(subscribeSettingsModal, getSettingsModalOpen, getSettingsModalOpen)
    const { theme, locale } = useSyncExternalStore(
        subscribeShellSettings,
        getShellSettingsState,
        getShellSettingsState
    )

    const handleClose = useCallback(() => {
        closeSettingsModal()
    }, [])

    const onThemeChange = useCallback((next: ShellTheme) => {
        setShellTheme(next)
    }, [])

    const onLocaleChange = useCallback((next: AppLocale) => {
        setAppLocale(next)
        void Taro.showToast({
            title: next === 'zh' ? '已切换为中文' : 'Switched to English',
            icon: 'none'
        })
    }, [])

    if (!open) return null

    return (
        <View className='settings-modal'>
            <View className='settings-modal__mask' onClick={handleClose} />
            <View
                className='settings-modal__panel'
                catchMove
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='settings-modal__close' onClick={handleClose}>
                    <Text>×</Text>
                </View>

                <View className='settings-modal__emblem'>
                    <Text className='settings-modal__emblem-char'>易</Text>
                </View>

                <Text className='settings-modal__title'>设置</Text>
                <Text className='settings-modal__subtitle'>偏好与显示选项</Text>

                <View className='settings-modal__section'>
                    <Text className='settings-modal__section-label'>色调</Text>
                    <View className='settings-modal__options'>
                        <View
                            className={`settings-modal__option ${theme === 'light' ? 'settings-modal__option--active' : ''}`}
                            onClick={() => onThemeChange('light')}
                        >
                            <FeatureIcon className='settings-modal__option-icon' src={sunIcon} />
                            <Text className='settings-modal__option-txt'>浅色</Text>
                        </View>
                        <View
                            className={`settings-modal__option ${theme === 'dark' ? 'settings-modal__option--active' : ''}`}
                            onClick={() => onThemeChange('dark')}
                        >
                            <FeatureIcon className='settings-modal__option-icon' src={moonIcon} />
                            <Text className='settings-modal__option-txt'>暗黑</Text>
                        </View>
                    </View>
                </View>

                <View className='settings-modal__section'>
                    <Text className='settings-modal__section-label'>语言</Text>
                    <View className='settings-modal__options'>
                        <View
                            className={`settings-modal__option ${locale === 'zh' ? 'settings-modal__option--active' : ''}`}
                            onClick={() => onLocaleChange('zh')}
                        >
                            <Text className='settings-modal__option-txt'>中文</Text>
                        </View>
                        <View
                            className={`settings-modal__option ${locale === 'en' ? 'settings-modal__option--active' : ''}`}
                            onClick={() => onLocaleChange('en')}
                        >
                            <Text className='settings-modal__option-txt'>English</Text>
                        </View>
                    </View>
                </View>

                <View className='settings-modal__done' onClick={handleClose}>
                    <Text>完 成</Text>
                </View>

                <View className='settings-modal__brand-foot'>
                    <Text>易AI</Text>
                </View>
            </View>
        </View>
    )
}

export default function SettingsModal () {
    const open = useSyncExternalStore(subscribeSettingsModal, getSettingsModalOpen, getSettingsModalOpen)
    if (!open) return null

    const node = <SettingsModalForm />
    if (typeof document !== 'undefined') {
        return createPortal(node, document.body)
    }
    return node
}
