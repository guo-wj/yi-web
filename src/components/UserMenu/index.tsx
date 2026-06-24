import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
    THEME_MENU_OPTIONS,
    USER_MENU_ROWS,
    type UserMenuRowKey
} from '@/constants/popoverNav'
import { formatUserLabel, userInitial } from '@/constants/user'
import { useAuth } from '@/hooks/useAuth'
import { clearAuth } from '@/utils/auth'
import { openConfirmModal } from '@/utils/confirmModal'
import { openContactModal } from '@/utils/contactModal'
import { openLoginModal } from '@/utils/requireAuth'
import {
    getShellSettingsState,
    setShellTheme,
    subscribeShellSettings,
    type ShellTheme
} from '@/utils/shellSettings'
import './UserMenu.scss'

const SUBMENU_GAP = 4

export type UserMenuDock = 'top-right' | 'sidebar-inline' | 'topbar-inline'
export type UserMenuUiMode = 'mobile' | 'pc'

interface UserMenuProps {
    /** 默认右上（首页）；功能页为嵌入左侧 tab 栏底部、栏内右对齐 */
    dock?: UserMenuDock
    /** 根据页面端形态切换组件尺寸，替代原先媒体查询方案 */
    uiMode?: UserMenuUiMode
    /** 仅 dock=top-right：距离视口顶部的 px，一般为 statusBarHeight + 10 */
    topOffset?: number
    /** 侧栏收起时仅展示头像 */
    collapsed?: boolean
}

export default function UserMenu ({
    dock = 'top-right',
    uiMode = 'mobile',
    topOffset = 10,
    collapsed = false
}: UserMenuProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [appearanceOpen, setAppearanceOpen] = useState(false)
    const [themeSubPos, setThemeSubPos] = useState({ top: 0, left: 0 })
    const rootRef = useRef<HTMLElement | null>(null)
    const appearanceRef = useRef<HTMLElement | null>(null)
    const themeSubRef = useRef<HTMLElement | null>(null)
    const appearanceHoverTimer = useRef<number | null>(null)
    const isSidebarInline = dock === 'sidebar-inline'
    const isTopbarInline = dock === 'topbar-inline'
    const { user, isLoggedIn } = useAuth()
    const { theme } = useSyncExternalStore(
        subscribeShellSettings,
        getShellSettingsState,
        getShellSettingsState
    )
    const displayName = formatUserLabel(user)
    const themeLabel = theme === 'light' ? '浅色' : '暗黑'

    const closeMenu = () => {
        setMenuOpen(false)
        setAppearanceOpen(false)
    }

    useEffect(() => {
        if (!menuOpen) {
            setAppearanceOpen(false)
        }
    }, [menuOpen])

    useEffect(() => {
        if (!menuOpen) return
        if (typeof document === 'undefined') return
        const onDocClick = (e: MouseEvent) => {
            const target = e.target as Node
            const root = rootRef.current
            const sub = themeSubRef.current
            const insideRoot = root?.contains(target)
            const insideSub = sub?.contains(target)
            if (!insideRoot && !insideSub) {
                setMenuOpen(false)
                setAppearanceOpen(false)
            }
        }
        const id = window.setTimeout(() => {
            document.addEventListener('click', onDocClick, true)
        }, 0)
        return () => {
            clearTimeout(id)
            document.removeEventListener('click', onDocClick, true)
        }
    }, [menuOpen])

    const onTriggerClick = useCallback((e: { stopPropagation?: () => void }) => {
        e.stopPropagation?.()
        if (!isLoggedIn) {
            openLoginModal('login')
            return
        }
        setMenuOpen((v) => !v)
    }, [isLoggedIn])

    const onThemePick = useCallback((next: ShellTheme) => {
        setShellTheme(next)
    }, [])

    const clearAppearanceHoverTimer = useCallback(() => {
        if (appearanceHoverTimer.current !== null) {
            window.clearTimeout(appearanceHoverTimer.current)
            appearanceHoverTimer.current = null
        }
    }, [])

    const scheduleAppearanceClose = useCallback(() => {
        clearAppearanceHoverTimer()
        appearanceHoverTimer.current = window.setTimeout(() => {
            setAppearanceOpen(false)
        }, 120)
    }, [clearAppearanceHoverTimer])

    const syncThemeSubPos = useCallback(() => {
        const el = appearanceRef.current
        if (!el || typeof window === 'undefined') return
        const rowRect = el.getBoundingClientRect()
        const popoverEl = el.closest('.home__popover') as HTMLElement | null
        const popoverRect = popoverEl?.getBoundingClientRect()
        const subEl = themeSubRef.current
        const subWidth = subEl?.offsetWidth || 132
        const subHeight = subEl?.offsetHeight || 0

        let left: number
        if (isSidebarInline) {
            const anchorRight = popoverRect?.right ?? rowRect.right
            left = anchorRight + SUBMENU_GAP
        } else {
            const anchorLeft = popoverRect?.left ?? rowRect.left
            left = anchorLeft - subWidth - SUBMENU_GAP
        }

        const top = subHeight > 0
            ? rowRect.top + (rowRect.height - subHeight) / 2
            : rowRect.top

        setThemeSubPos({
            top,
            left: Math.max(12, left)
        })
    }, [isSidebarInline])

    const onAppearanceRowClick = useCallback(() => {
        syncThemeSubPos()
        setAppearanceOpen((v) => !v)
    }, [syncThemeSubPos])

    useEffect(() => {
        if (!menuOpen || uiMode !== 'pc') return

        let disposed = false
        let el: HTMLElement | null = null

        const onEnter = () => {
            clearAppearanceHoverTimer()
            syncThemeSubPos()
            setAppearanceOpen(true)
        }
        const onLeave = () => scheduleAppearanceClose()

        const bind = () => {
            if (disposed) return
            el = appearanceRef.current
            if (!el) {
                window.requestAnimationFrame(bind)
                return
            }
            el.addEventListener('mouseenter', onEnter)
            el.addEventListener('mouseleave', onLeave)
        }

        bind()

        return () => {
            disposed = true
            el?.removeEventListener('mouseenter', onEnter)
            el?.removeEventListener('mouseleave', onLeave)
        }
    }, [menuOpen, uiMode, syncThemeSubPos, clearAppearanceHoverTimer, scheduleAppearanceClose])

    useEffect(() => {
        if (!appearanceOpen) return

        let disposed = false
        let el: HTMLElement | null = null

        const onEnter = () => clearAppearanceHoverTimer()
        const onLeave = () => scheduleAppearanceClose()

        const bind = () => {
            if (disposed) return
            el = themeSubRef.current
            if (!el) {
                window.requestAnimationFrame(bind)
                return
            }
            el.addEventListener('mouseenter', onEnter)
            el.addEventListener('mouseleave', onLeave)
        }

        bind()

        return () => {
            disposed = true
            el?.removeEventListener('mouseenter', onEnter)
            el?.removeEventListener('mouseleave', onLeave)
        }
    }, [appearanceOpen, clearAppearanceHoverTimer, scheduleAppearanceClose])

    useEffect(() => {
        if (!appearanceOpen) return
        syncThemeSubPos()
        const id = window.requestAnimationFrame(() => syncThemeSubPos())
        if (typeof window === 'undefined') return
        window.addEventListener('resize', syncThemeSubPos)
        window.addEventListener('scroll', syncThemeSubPos, true)
        return () => {
            window.cancelAnimationFrame(id)
            window.removeEventListener('resize', syncThemeSubPos)
            window.removeEventListener('scroll', syncThemeSubPos, true)
        }
    }, [appearanceOpen, syncThemeSubPos])

    const onMenuRow = useCallback(
        (key: UserMenuRowKey) => {
            closeMenu()
            if (key === 'member') {
                void Taro.showToast({ title: '会员中心即将开放', icon: 'none' })
                return
            }
            if (key === 'contact') {
                openContactModal()
            }
        },
        []
    )

    const onMenuLogout = useCallback(() => {
        closeMenu()
        openConfirmModal({
            title: '退出登录',
            content: '确定要退出当前账号吗？',
            onConfirm: () => {
                clearAuth()
                void Taro.showToast({ title: '已退出', icon: 'none' })
            }
        })
    }, [])

    const avatarLetter = userInitial(displayName)

    const themeSubmenu = appearanceOpen && (
        <View
            ref={themeSubRef}
            className={`home__popover-theme-sub home__popover-theme-sub--portal home__popover-theme-sub--theme-${theme}`}
            style={{
                top: `${themeSubPos.top}px`,
                left: `${themeSubPos.left}px`
            }}
        >
            {THEME_MENU_OPTIONS.map((opt) => (
                <View
                    key={opt.key}
                    className={`home__popover-theme-option ${theme === opt.key ? 'home__popover-theme-option--active' : ''}`}
                    onClick={() => onThemePick(opt.key)}
                >
                    <Text className='home__popover-theme-option-label'>{opt.label}</Text>
                    {theme === opt.key && (
                        <Text className='home__popover-theme-option-check'>✓</Text>
                    )}
                </View>
            ))}
        </View>
    )

    return (
        <View
            ref={rootRef}
            className={[
                'home__user',
                `home__user--${uiMode}`,
                `home__user--theme-${theme}`,
                menuOpen ? 'home__user--open' : '',
                isSidebarInline ? 'home__user--embed' : '',
                isTopbarInline ? 'home__user--topbar' : '',
                isSidebarInline && collapsed ? 'home__user--embed-collapsed' : ''
            ].filter(Boolean).join(' ')}
            style={isSidebarInline || isTopbarInline ? undefined : { top: topOffset }}
        >
            <View
                className='home__user-trigger'
                onClick={onTriggerClick}
            >
                <View className='home__avatar-btn'>
                    <View className='home__avatar-face'>
                        <Text className='home__avatar-letter'>{avatarLetter}</Text>
                    </View>
                </View>

                {isSidebarInline && !collapsed && (
                    <View className='home__user-meta'>
                        <Text className='home__user-name'>{displayName}</Text>
                        {!isLoggedIn && (
                            <Text className='home__user-hint'>点击登录</Text>
                        )}
                    </View>
                )}
            </View>

            {menuOpen && isLoggedIn && (
                <View
                    className={`home__popover home__popover--theme-${theme}`}
                    catchMove
                    onClick={(e) => e.stopPropagation?.()}
                >
                    <View className='home__popover-profile'>
                        <View className='home__avatar-face'>
                            <Text className='home__avatar-letter'>{avatarLetter}</Text>
                        </View>
                        <View className='home__popover-profile-copy'>
                            <Text className='home__popover-phone'>{displayName}</Text>
                        </View>
                    </View>

                    <View className='home__popover-divider' />

                    <View className='home__popover-nav'>
                        <View
                            ref={appearanceRef}
                            className={`home__popover-appearance ${appearanceOpen ? 'home__popover-appearance--open' : ''}`}
                        >
                            <View
                                className='home__popover-row home__popover-row--has-sub'
                                onClick={onAppearanceRowClick}
                            >
                                <Text className='home__popover-row-label'>外观</Text>
                                <Text className='home__popover-row-hint'>{themeLabel}</Text>
                                <Text className='home__popover-row-chevron'>›</Text>
                            </View>
                        </View>

                        {USER_MENU_ROWS.map((row) => (
                            <View
                                key={row.key}
                                className='home__popover-row'
                                onClick={() => onMenuRow(row.key)}
                            >
                                <Text className='home__popover-row-label'>{row.label}</Text>
                                {row.chevron && (
                                    <Text className='home__popover-row-chevron'>›</Text>
                                )}
                            </View>
                        ))}
                    </View>

                    <View className='home__popover-divider' />

                    <View className='home__popover-row home__popover-row--logout' onClick={onMenuLogout}>
                        <Text className='home__popover-row-label'>退出登录</Text>
                    </View>
                </View>
            )}
            {typeof document !== 'undefined' && appearanceOpen && createPortal(themeSubmenu, document.body)}
        </View>
    )
}
