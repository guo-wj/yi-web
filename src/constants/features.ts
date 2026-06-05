export type FeatureKey = 'qian' | 'liuyao' | 'ziwei' | 'bazi'

export type FeatureBadge = 'HOT' | 'NEW'

export interface FeatureItem {
    key: FeatureKey
    title: string
    desc: string
    icon: string
    badge?: FeatureBadge
}

/** 首页四宫格 & 详情侧栏共用 */
export const FEATURE_ITEMS: FeatureItem[] = [
    {
        key: 'qian',
        title: '今日灵签',
        desc: 'AI 解签问运，一日一签',
        icon: '🧧'
    },
    {
        key: 'liuyao',
        title: '六爻起卦',
        desc: '心念一动，卦象自成',
        icon: '☰'
    },
    {
        key: 'ziwei',
        title: '紫微斗数',
        desc: '星曜排盘，洞见命局',
        icon: '✦',
        badge: 'HOT'
    },
    {
        key: 'bazi',
        title: '八字命理',
        desc: '四柱推演，详批命理',
        icon: '冊',
        badge: 'NEW'
    }
]

export const SIDEBAR_GROUPS: { sectionTitle: string; keys: FeatureKey[] }[] = [
    { sectionTitle: '占卜问事', keys: ['qian', 'liuyao'] },
    { sectionTitle: '命局分析', keys: ['ziwei', 'bazi'] }
]

export function getFeatureByKey (key: string | undefined): FeatureItem {
    const found = FEATURE_ITEMS.find((f) => f.key === key)
    return found ?? FEATURE_ITEMS[0]
}

export function isFeatureKey (key: string | undefined): key is FeatureKey {
    return FEATURE_ITEMS.some((f) => f.key === key)
}
