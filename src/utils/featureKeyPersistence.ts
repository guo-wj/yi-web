import Taro from '@tarojs/taro'
import { FEATURE_ITEMS, isFeatureKey, type FeatureKey } from '@/constants/features'

const STORAGE_KEY = 'yi-web:feature-key'

function readKeyFromLocation (): FeatureKey | null {
    if (typeof window === 'undefined') return null

    const { search, hash } = window.location
    const searchKey = new URLSearchParams(search).get('key')
    if (searchKey && isFeatureKey(searchKey)) return searchKey

    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
    const hashKey = new URLSearchParams(hashQuery).get('key')
    if (hashKey && isFeatureKey(hashKey)) return hashKey

    return null
}

function readKeyFromStorage (): FeatureKey | null {
    try {
        const stored = Taro.getStorageSync(STORAGE_KEY)
        if (typeof stored === 'string' && isFeatureKey(stored)) return stored
    } catch {
        /* noop */
    }
    return null
}

export function readInitialFeatureKey (): FeatureKey {
    try {
        const routerKey = Taro.getCurrentInstance()?.router?.params?.key
        if (routerKey && isFeatureKey(routerKey)) return routerKey
    } catch {
        /* noop */
    }

    return readKeyFromLocation() ?? readKeyFromStorage() ?? FEATURE_ITEMS[0].key
}

function replaceFeatureKeyInUrl (key: FeatureKey) {
    if (typeof window === 'undefined') return

    const { pathname, search, hash } = window.location

    if (hash.includes('/pages/feature/index')) {
        const hashBody = hash.slice(1)
        const qIndex = hashBody.indexOf('?')
        const path = qIndex >= 0 ? hashBody.slice(0, qIndex) : hashBody
        const params = new URLSearchParams(qIndex >= 0 ? hashBody.slice(qIndex + 1) : '')
        params.set('key', key)
        const nextHash = `#${path}?${params.toString()}`
        window.history.replaceState(window.history.state, '', `${pathname}${search}${nextHash}`)
        return
    }

    const params = new URLSearchParams(search)
    params.set('key', key)
    const nextSearch = params.toString()
    window.history.replaceState(
        window.history.state,
        '',
        `${pathname}${nextSearch ? `?${nextSearch}` : ''}${hash}`
    )
}

export function persistFeatureKey (key: FeatureKey) {
    try {
        Taro.setStorageSync(STORAGE_KEY, key)
    } catch {
        /* noop */
    }

    replaceFeatureKeyInUrl(key)
}
