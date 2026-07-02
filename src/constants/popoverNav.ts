/** 个人中心浮层菜单项（外观单独处理；会员中心已移至侧栏） */
export const USER_MENU_ROWS = [
    { key: 'contact', label: '联系客服', chevron: false }
] as const

export type UserMenuRowKey = (typeof USER_MENU_ROWS)[number]['key']

export const THEME_MENU_OPTIONS = [
    { key: 'light', label: '浅色' },
    { key: 'dark', label: '暗黑' }
] as const
