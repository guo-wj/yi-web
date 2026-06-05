import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'
import { POPOVER_NAV } from '@/constants/popoverNav'
import './UserMenu.scss'

export type UserMenuDock = 'top-right' | 'sidebar-inline'
export type UserMenuUiMode = 'mobile' | 'pc'

interface UserMenuProps {
    /** 默认右上（首页）；功能页为嵌入左侧 tab 栏底部、栏内右对齐 */
    dock?: UserMenuDock
    /** 根据页面端形态切换组件尺寸，替代原先媒体查询方案 */
    uiMode?: UserMenuUiMode
    /** 仅 dock=top-right：距离视口顶部的 px，一般为 statusBarHeight + 10 */
    topOffset?: number
}

export default function UserMenu ({
    dock = 'top-right',
    uiMode = 'mobile',
    topOffset = 10
}: UserMenuProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const rootRef = useRef<HTMLElement | null>(null)

    const closeMenu = () => setMenuOpen(false)

    useEffect(() => {
        if (!menuOpen) return
        if (typeof document === 'undefined') return
        const onDocClick = (e: MouseEvent) => {
            const root = rootRef.current
            if (root && !root.contains(e.target as Node)) {
                setMenuOpen(false)
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

    const onPopoverNav = useCallback(
        (key: (typeof POPOVER_NAV)[number]['key']) => {
            closeMenu()
            if (key === 'help') {
                void Taro.showToast({ title: '帮助中心即将开放', icon: 'none' })
                return
            }
            if (key === 'feedback') {
                void Taro.showToast({ title: '意见反馈即将开放', icon: 'none' })
                return
            }
            void Taro.showToast({ title: '合作相关即将开放', icon: 'none' })
        },
        []
    )

    const onMenuLogout = useCallback(() => {
        closeMenu()
        void Taro.showModal({
            title: '退出登录',
            content: '确定要退出当前账号吗？',
            success: (res) => {
                if (res.confirm) {
                    void Taro.showToast({ title: '已退出', icon: 'none' })
                }
            }
        })
    }, [])

    const isSidebarInline = dock === 'sidebar-inline'

    return (
        <View
            ref={rootRef}
            className={`home__user home__user--${uiMode} ${menuOpen ? 'home__user--open' : ''} ${isSidebarInline ? 'home__user--embed' : ''}`}
            style={isSidebarInline ? undefined : { top: topOffset }}
        >
            <View
                className='home__avatar-btn'
                onClick={(e) => {
                    e.stopPropagation?.()
                    setMenuOpen((v) => !v)
                }}
            >
                <View className='home__avatar-face'>
                    <Text className='home__avatar-letter'>易</Text>
                </View>
            </View>

            {menuOpen && (
                <View
                    className='home__popover'
                    catchMove
                    onClick={(e) => e.stopPropagation?.()}
                >
                    <View className='home__popover-profile'>
                        <Text className='home__popover-phone'>176****9109</Text>
                    </View>

                    <View className='home__popover-divider' />

                    <View className='home__popover-nav'>
                        {POPOVER_NAV.map((row) => (
                            <View
                                key={row.key}
                                className='home__popover-nav-item'
                                onClick={() => onPopoverNav(row.key)}
                            >
                                <Text className='home__popover-nav-icon'>{row.icon}</Text>
                                <Text className='home__popover-nav-label'>{row.label}</Text>
                            </View>
                        ))}
                    </View>

                    <View className='home__popover-divider' />

                    <View className='home__popover-logout' onClick={onMenuLogout}>
                        <Text className='home__popover-logout-icon'>⎋</Text>
                        <Text className='home__popover-logout-txt'>退出登录</Text>
                    </View>
                </View>
            )}
        </View>
    )
}
