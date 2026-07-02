import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import UserMenu from '@/components/UserMenu'
import FeatureIcon from '@/components/FeatureIcon'
import LotteryPanel from '@/components/LotteryPanel'
import HuangliPanel from '@/components/HuangliPanel'
import LiuyaoPanel from '@/components/LiuyaoPanel'
import BaziPanel from '@/components/BaziPanel'
import MeihuaPanel from '@/components/MeihuaPanel'
import PalmPanel from '@/components/PalmPanel'
import FacePanel from '@/components/FacePanel'
import MemberPanel from '@/components/MemberPanel'
import foldIcon from '@/assets/icons/fold.svg'
import {
    type FeatureKey,
    getFeatureByKey,
    isFeatureKey,
    FEATURE_ITEMS,
    MEMBER_FEATURE
} from '@/constants/features'
import { selectMemberTab, registerMemberNavHandler } from '@/utils/memberNav'
import type { MemberPanelTabKey } from '@/components/MemberPanel'
import { persistFeatureKey, readInitialFeatureKey } from '@/utils/featureKeyPersistence'

function parseMemberTab (raw?: string): MemberPanelTabKey | undefined {
    if (!raw) return undefined
    if (raw === 'ledger') return 'tx'
    if (['overview', 'checkin', 'tx', 'recharge', 'member'].includes(raw)) {
        return raw as MemberPanelTabKey
    }
    return undefined
}

function navIconDomId (key: FeatureKey) {
    return `feature-nav-${key}`
}

export function readKeyFromRouter (): FeatureKey {
    return readInitialFeatureKey()
}

export function useFeatureState () {
    const [activeKey, setActiveKey] = useState<FeatureKey>(readInitialFeatureKey)
    const [memberTab, setMemberTab] = useState<MemberPanelTabKey | undefined>()

    const syncFeatureKey = useCallback((raw?: string, tab?: string) => {
        if (raw && isFeatureKey(raw)) {
            setActiveKey(raw)
            if (raw === 'member') {
                setMemberTab(parseMemberTab(tab))
            }
        }
    }, [])

    const active = useMemo(() => getFeatureByKey(activeKey), [activeKey])

    const selectFeature = useCallback((key: FeatureKey) => {
        setActiveKey((prev) => (prev === key ? prev : key))
    }, [])

    useEffect(() => {
        persistFeatureKey(activeKey)
    }, [activeKey])

    useEffect(() => {
        return registerMemberNavHandler((tab) => {
            selectMemberTab((key) => {
                setActiveKey(key)
                if (tab) setMemberTab(tab)
            }, tab)
        })
    }, [])

    const goHome = useCallback(() => {
        void Taro.reLaunch({ url: '/pages/index/index' })
    }, [])

    return {
        activeKey,
        active,
        memberTab,
        selectFeature,
        syncFeatureKey,
        goHome
    }
}

interface FeatureSidebarProps {
    activeKey: FeatureKey
    onSelect: (key: FeatureKey) => void
    onGoHome: () => void
    drawerMode?: boolean
    pcMode?: boolean
    collapsed?: boolean
    onToggleCollapse?: () => void
    onNavigateAway?: () => void
}

export function FeatureSidebar ({
    activeKey,
    onSelect,
    onGoHome,
    drawerMode = false,
    pcMode = false,
    collapsed = false,
    onToggleCollapse,
    onNavigateAway
}: FeatureSidebarProps) {
    const [hoveredNavKey, setHoveredNavKey] = useState<FeatureKey | null>(null)
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })

    const showNavTooltip = useCallback((key: FeatureKey) => {
        Taro.createSelectorQuery()
            .select(`#${navIconDomId(key)}`)
            .boundingClientRect()
            .exec((res) => {
                const rect = res?.[0] as { top?: number; height?: number; right?: number } | undefined
                if (!rect?.height) return
                setTooltipPos({
                    top: rect.top! + rect.height / 2,
                    left: rect.right! + 10
                })
                setHoveredNavKey(key)
            })
    }, [])

    const hideNavTooltip = useCallback(() => {
        setHoveredNavKey(null)
    }, [])

    useEffect(() => {
        if (!pcMode || !collapsed || typeof document === 'undefined') {
            setHoveredNavKey(null)
            return
        }

        let disposed = false
        const cleanups: Array<() => void> = []

        const bindHover = () => {
            if (disposed) return
            FEATURE_ITEMS.forEach((item) => {
                const el = document.getElementById(navIconDomId(item.key))
                if (!el) return
                const onEnter = () => showNavTooltip(item.key)
                const onLeave = () => hideNavTooltip()
                el.addEventListener('mouseenter', onEnter)
                el.addEventListener('mouseleave', onLeave)
                cleanups.push(() => {
                    el.removeEventListener('mouseenter', onEnter)
                    el.removeEventListener('mouseleave', onLeave)
                })
            })
        }

        const timer = window.setTimeout(bindHover, 0)

        return () => {
            disposed = true
            window.clearTimeout(timer)
            cleanups.forEach((fn) => fn())
        }
    }, [pcMode, collapsed, showNavTooltip, hideNavTooltip])

    const onMemberNav = useCallback(() => {
        selectMemberTab(onSelect, undefined, onNavigateAway)
    }, [onSelect, onNavigateAway])

    const shellClassName = [
        'feature-page__sidebar-shell',
        pcMode ? 'feature-page__sidebar-shell--pc' : '',
        pcMode && collapsed ? 'feature-page__sidebar-shell--collapsed' : ''
    ]
        .filter(Boolean)
        .join(' ')

    const hoveredNavTitle = hoveredNavKey ? getFeatureByKey(hoveredNavKey).title : ''

    return (
        <View className={shellClassName}>
            <View className='feature-page__sidebar-top'>
                <View className='feature-page__sidebar-toolbar'>
                    {(!pcMode || !collapsed) && (
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
                                {!pcMode && <Text className='feature-page__brand-logo'>易AI</Text>}
                                {/* <Text className='feature-page__brand-tag'>易学参阅 · AI 相伴</Text> */}
                            </View>
                        </View>
                    )}
                    {pcMode && onToggleCollapse && (
                        <View
                            className='feature-page__sidebar-toggle'
                            onClick={(e) => {
                                e.stopPropagation?.()
                                onToggleCollapse()
                            }}
                        >
                            <FeatureIcon
                                className='feature-page__sidebar-toggle-icon'
                                src={foldIcon}
                            />
                        </View>
                    )}
                </View>
                {(pcMode || !collapsed) && (
                    <View
                        className={`feature-page__sidebar-rule ${pcMode ? 'feature-page__sidebar-rule--pc' : ''} ${pcMode && collapsed ? 'feature-page__sidebar-rule--invisible' : ''}`}
                    />
                )}
            </View>

            <View className='feature-page__sidebar-body'>
                {FEATURE_ITEMS.map((item) => {
                    const isActive = activeKey === item.key
                    return (
                        <View
                            key={item.key}
                            className={`feature-page__nav-item ${isActive ? 'feature-page__nav-item--active' : ''} ${pcMode ? 'feature-page__nav-item--pc' : ''}`}
                            onClick={() => onSelect(item.key)}
                        >
                            <View
                                id={pcMode && collapsed ? navIconDomId(item.key) : undefined}
                                className={`feature-page__nav-icon-box ${pcMode ? 'feature-page__nav-icon-box--pc' : ''}`}
                            >
                                <FeatureIcon
                                    className='feature-page__nav-icon'
                                    src={item.icon}
                                    scale={item.iconScale}
                                />
                            </View>
                            {!collapsed && (
                                <View className='feature-page__nav-text'>
                                    <View className='feature-page__nav-title-row'>
                                        <Text className='feature-page__nav-title'>{item.title}</Text>
                                    </View>
                                    {/* <Text className='feature-page__nav-desc'>{item.desc}</Text> */}
                                </View>
                            )}
                        </View>
                    )
                })}
            </View>

            {drawerMode ? (
                <View className='feature-page__sidebar-dock-bar'>
                    <View
                        className='feature-page__nav-item feature-page__nav-item--member feature-page__nav-item--dock-inline'
                        onClick={onMemberNav}
                    >
                        <View className='feature-page__nav-icon-box'>
                            <FeatureIcon
                                className='feature-page__nav-icon'
                                src={MEMBER_FEATURE.icon}
                            />
                        </View>
                        <View className='feature-page__nav-text'>
                            <View className='feature-page__nav-title-row'>
                                <Text className='feature-page__nav-title'>{MEMBER_FEATURE.title}</Text>
                            </View>
                        </View>
                    </View>
                    <View className='feature-page__sidebar-footer feature-page__sidebar-footer--drawer'>
                        <UserMenu
                            dock='sidebar-inline'
                            uiMode='mobile'
                            collapsed={false}
                        />
                    </View>
                </View>
            ) : (
                <>
                    <View className='feature-page__nav-dock'>
                        <View
                            className={`feature-page__nav-item feature-page__nav-item--member ${pcMode ? 'feature-page__nav-item--pc' : ''}`}
                            onClick={onMemberNav}
                        >
                            <View className={`feature-page__nav-icon-box ${pcMode ? 'feature-page__nav-icon-box--pc' : ''}`}>
                                <FeatureIcon
                                    className='feature-page__nav-icon'
                                    src={MEMBER_FEATURE.icon}
                                />
                            </View>
                            {!collapsed && (
                                <View className='feature-page__nav-text'>
                                    <View className='feature-page__nav-title-row'>
                                        <Text className='feature-page__nav-title'>{MEMBER_FEATURE.title}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {!collapsed && (
                        <View className='feature-page__sidebar-rule feature-page__sidebar-rule--dock' />
                    )}

                    {pcMode && (
                        <View
                            className={[
                                'feature-page__sidebar-footer',
                                'feature-page__sidebar-footer--pc',
                                collapsed ? 'feature-page__sidebar-footer--collapsed' : ''
                            ].filter(Boolean).join(' ')}
                        >
                            <UserMenu
                                dock='sidebar-inline'
                                uiMode='pc'
                                collapsed={collapsed}
                            />
                        </View>
                    )}
                </>
            )}

            {typeof document !== 'undefined' && pcMode && collapsed && hoveredNavKey && createPortal(
                <div
                    className='feature-page__nav-tooltip--fixed'
                    style={{
                        top: `${tooltipPos.top}px`,
                        left: `${tooltipPos.left}px`,
                        transform: 'translateY(-50%)'
                    }}
                >
                    <span className='feature-page__nav-tooltip-text'>{hoveredNavTitle}</span>
                </div>,
                document.body
            )}
        </View>
    )
}

interface FeatureMainBlockProps {
    activeKey: FeatureKey
    memberTab?: MemberPanelTabKey
}

export function FeatureMainBlock ({
    activeKey,
    memberTab
}: FeatureMainBlockProps) {
    const active = getFeatureByKey(activeKey)

    return (
        <View className='feature-page__main'>
            <View className='feature-page__main-inner'>
                {activeKey === 'qian' ? (
                    <View className='feature-page__detail feature-page__detail--qian'>
                        <LotteryPanel />
                    </View>
                ) : activeKey === 'huangli' ? (
                    <View className='feature-page__detail feature-page__detail--huangli'>
                        <HuangliPanel />
                    </View>
                ) : activeKey === 'liuyao' ? (
                    <View className='feature-page__detail feature-page__detail--liuyao'>
                        <LiuyaoPanel />
                    </View>
                ) : activeKey === 'bazi' ? (
                    <View className='feature-page__detail feature-page__detail--bazi'>
                        <BaziPanel />
                    </View>
                ) : activeKey === 'ziwei' ? (
                    <View className='feature-page__detail feature-page__detail--meihua'>
                        <MeihuaPanel />
                    </View>
                ) : activeKey === 'zhangwen' ? (
                    <View className='feature-page__detail feature-page__detail--zhangwen'>
                        <PalmPanel />
                    </View>
                ) : activeKey === 'mianxiang' ? (
                    <View className='feature-page__detail feature-page__detail--mianxiang'>
                        <FacePanel />
                    </View>
                ) : activeKey === 'member' ? (
                    <View className='feature-page__detail feature-page__detail--member'>
                        <MemberPanel embedded initialTab={memberTab} />
                    </View>
                ) : (
                    <View className='feature-page__detail feature-page__detail--generic'>
                        <View className='feature-page__hero feature-page__hero--sm'>
                            <FeatureIcon
                                className='feature-page__hero-icon'
                                src={active.icon}
                                scale={active.iconScale}
                            />
                        </View>
                        <Text className='feature-page__detail-title'>{active.title}</Text>
                        <Text className='feature-page__detail-soon'>敬请期待中</Text>
                    </View>
                )}
            </View>
        </View>
    )
}
