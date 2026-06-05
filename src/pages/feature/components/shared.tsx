import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useMemo, useState } from 'react'
import UserMenu from '@/components/UserMenu'
import LotteryPanel from '@/components/LotteryPanel'
import {
    type FeatureKey,
    getFeatureByKey,
    isFeatureKey,
    SIDEBAR_GROUPS
} from '@/constants/features'

export function formatTodayCn () {
    const d = new Date()
    const mon = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    return {
        dateLine: `${mon}月${day}日`,
        weekdayLine: `${weekdays[d.getDay()]} · 今日运势`
    }
}

export function readKeyFromRouter (): FeatureKey {
    try {
        const p = Taro.getCurrentInstance()?.router?.params?.key
        if (p && isFeatureKey(p)) return p
    } catch {
        /* noop */
    }
    return 'qian'
}

export function useFeatureState () {
    const [activeKey, setActiveKey] = useState<FeatureKey>(readKeyFromRouter)

    const syncFeatureKey = useCallback((raw?: string) => {
        if (raw && isFeatureKey(raw)) {
            setActiveKey(raw)
        }
    }, [])

    const active = useMemo(() => getFeatureByKey(activeKey), [activeKey])
    const today = useMemo(() => formatTodayCn(), [])

    const selectFeature = useCallback((key: FeatureKey) => {
        setActiveKey((prev) => (prev === key ? prev : key))
    }, [])

    const goHome = useCallback(() => {
        void Taro.reLaunch({ url: '/pages/index/index' })
    }, [])

    const onPrimaryAction = useCallback(() => {
        void Taro.showToast({ title: `${active.title} 即将开放`, icon: 'none' })
    }, [active.title])

    return {
        activeKey,
        active,
        today,
        selectFeature,
        syncFeatureKey,
        goHome,
        onPrimaryAction
    }
}

interface FeatureSidebarProps {
    activeKey: FeatureKey
    onSelect: (key: FeatureKey) => void
    onGoHome: () => void
    drawerMode?: boolean
    pcMode?: boolean
}

export function FeatureSidebar ({
    activeKey,
    onSelect,
    onGoHome,
    drawerMode = false,
    pcMode = false
}: FeatureSidebarProps) {
    const shellClassName = [
        'feature-page__sidebar-shell',
        pcMode ? 'feature-page__sidebar-shell--pc' : ''
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <View className={shellClassName}>
            <View className='feature-page__sidebar-top'>
                <View className='feature-page__sidebar-toolbar'>
                    <View
                        className={`feature-page__brand ${pcMode ? 'feature-page__brand--pc' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation?.()
                            onGoHome()
                        }}
                    >
                        <View className={`feature-page__brand-mark ${pcMode ? 'feature-page__brand-mark--pc' : ''}`}>
                            <Text className='feature-page__brand-mark-char'>易</Text>
                        </View>
                        <View className={`feature-page__brand-copy ${pcMode ? 'feature-page__brand-copy--pc' : ''}`}>
                            {!pcMode && <Text className='feature-page__brand-logo'>易鉴</Text>}
                            <Text className='feature-page__brand-tag'>易学参阅 · AI 相伴</Text>
                        </View>
                    </View>
                </View>
                <View className={`feature-page__sidebar-rule ${pcMode ? 'feature-page__sidebar-rule--pc' : ''}`} />
            </View>

            <View className='feature-page__sidebar-body'>
                {SIDEBAR_GROUPS.map((group) => (
                    <View key={group.sectionTitle} className='feature-page__nav-section'>
                        <Text className='feature-page__nav-section-title'>{group.sectionTitle}</Text>
                        {group.keys.map((key) => {
                            const item = getFeatureByKey(key)
                            const isActive = activeKey === key
                            return (
                                <View
                                    key={key}
                                    className={`feature-page__nav-item ${isActive ? 'feature-page__nav-item--active' : ''} ${pcMode ? 'feature-page__nav-item--pc' : ''}`}
                                    onClick={() => onSelect(key)}
                                >
                                    <View
                                        className={`feature-page__nav-icon-box ${pcMode ? 'feature-page__nav-icon-box--pc' : ''} ${isActive ? 'feature-page__nav-icon-box--active' : ''}`}
                                    >
                                        <Text className='feature-page__nav-icon'>{item.icon}</Text>
                                    </View>
                                    <View className='feature-page__nav-text'>
                                        <View className='feature-page__nav-title-row'>
                                            <Text className='feature-page__nav-title'>{item.title}</Text>
                                            {item.badge === 'HOT' && (
                                                <Text className='feature-page__chip feature-page__chip--hot'>热门</Text>
                                            )}
                                            {item.badge === 'NEW' && (
                                                <Text className='feature-page__chip feature-page__chip--new'>新</Text>
                                            )}
                                        </View>
                                        <Text className='feature-page__nav-desc'>{item.desc}</Text>
                                    </View>
                                </View>
                            )
                        })}
                    </View>
                ))}
            </View>

            <View className='feature-page__sidebar-rule feature-page__sidebar-rule--dock' />

            {!drawerMode && (
                <View className={`feature-page__sidebar-footer ${pcMode ? 'feature-page__sidebar-footer--pc' : ''}`}>
                    <UserMenu dock='sidebar-inline' uiMode='pc' />
                </View>
            )}
        </View>
    )
}

interface FeatureMainBlockProps {
    activeKey: FeatureKey
    onPrimaryAction: () => void
    today: { dateLine: string; weekdayLine: string }
}

export function FeatureMainBlock ({
    activeKey,
    onPrimaryAction,
    today
}: FeatureMainBlockProps) {
    const active = getFeatureByKey(activeKey)

    return (
        <View className='feature-page__main'>
            <View className='feature-page__main-inner'>
                {activeKey === 'qian' ? (
                    <View className='feature-page__detail feature-page__detail--qian'>
                        <LotteryPanel today={today} />
                    </View>
                ) : (
                    <View className='feature-page__detail feature-page__detail--generic'>
                        <View className='feature-page__hero feature-page__hero--sm'>
                            <Text className='feature-page__hero-emoji'>{active.icon}</Text>
                        </View>
                        <Text className='feature-page__detail-title'>{active.title}</Text>
                        <Text className='feature-page__detail-desc'>{active.desc}</Text>
                        <Text className='feature-page__detail-hint'>
                            在此可进行{active.title}相关推演与解读，功能完善中。
                        </Text>
                        <View className='feature-page__cta' onClick={onPrimaryAction}>
                            <Text className='feature-page__cta-txt'>开始使用</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    )
}
