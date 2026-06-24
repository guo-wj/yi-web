import Taro from '@tarojs/taro'

export type ShellTheme = 'light' | 'dark'
export type AppLocale = 'zh' | 'en'

const THEME_KEY = 'yi-web:pc-theme'
const LOCALE_KEY = 'yi-web:locale'

export interface ShellSettingsState {
    theme: ShellTheme
    locale: AppLocale
}

function readTheme (): ShellTheme {
    try {
        const v = Taro.getStorageSync(THEME_KEY)
        if (v === 'light' || v === 'dark') return v
    } catch { /* noop */ }
    return 'light'
}

function readLocale (): AppLocale {
    try {
        const v = Taro.getStorageSync(LOCALE_KEY)
        if (v === 'zh' || v === 'en') return v
    } catch { /* noop */ }
    return 'zh'
}

let state: ShellSettingsState = {
    theme: readTheme(),
    locale: readLocale()
}

const listeners = new Set<() => void>()

function emit () {
    listeners.forEach((fn) => fn())
}

export function subscribeShellSettings (listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function getShellSettingsState (): ShellSettingsState {
    return state
}

export function getShellTheme (): ShellTheme {
    return state.theme
}

export function getAppLocale (): AppLocale {
    return state.locale
}

export function setShellTheme (theme: ShellTheme): void {
    if (state.theme === theme) return
    state = { ...state, theme }
    try { Taro.setStorageSync(THEME_KEY, theme) } catch { /* noop */ }
    emit()
}

export function setAppLocale (locale: AppLocale): void {
    if (state.locale === locale) return
    state = { ...state, locale }
    try { Taro.setStorageSync(LOCALE_KEY, locale) } catch { /* noop */ }
    emit()
}
