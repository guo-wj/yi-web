import type { AlmanacResponse } from '@/services/almanacApi'

export interface FortuneItem {
    key: string
    label: string
    score: number
    color: string
}

const LUCK_SCORE: Record<string, number> = {
    吉: 92,
    中吉: 86,
    小吉: 80,
    平: 74,
    中: 74,
    小凶: 66,
    凶: 58
}

function luckScore (raw?: string | null, fallback = 78): number {
    if (!raw) return fallback
    for (const [key, score] of Object.entries(LUCK_SCORE)) {
        if (raw.includes(key)) return score
    }
    return fallback
}

function clamp (n: number): number {
    return Math.max(55, Math.min(99, Math.round(n)))
}

/** 由当日黄历数据推导首页运势条（娱乐向，非命理结论） */
export function buildFortuneItems (data: AlmanacResponse): FortuneItem[] {
    const yiBoost = Math.min(data.yi.length * 2.5, 12)
    const jiPenalty = Math.min(data.ji.length * 1.8, 10)
    const base = 72 + yiBoost - jiPenalty

    return [
        {
            key: 'love',
            label: '感情',
            score: clamp(base + (data.yi.some((v) => v.includes('嫁娶') || v.includes('纳采')) ? 8 : -2)),
            color: '#f06b8f'
        },
        {
            key: 'wealth',
            label: '财富',
            score: clamp(luckScore(data.details.zhishen_luck, base) + (data.details.cai_shen ? 4 : 0)),
            color: '#f5a623'
        },
        {
            key: 'career',
            label: '事业',
            score: clamp(luckScore(data.details.zhishen_luck, base + 3)),
            color: '#5b8def'
        },
        {
            key: 'study',
            label: '学习',
            score: clamp(luckScore(data.details.xiu_luck, base + 1)),
            color: '#45c4b0'
        },
        {
            key: 'social',
            label: '人际',
            score: clamp(base + (data.details.xi_shen ? 5 : -1)),
            color: '#a56cf0'
        }
    ]
}

export function buildTodayScore (items: FortuneItem[]): number {
    if (!items.length) return 80
    const avg = items.reduce((sum, item) => sum + item.score, 0) / items.length
    return clamp(avg)
}

export function formatSolarLine (data: AlmanacResponse): string {
    const { solar, lunar } = data
    return `${solar.month}月${solar.day}日 ${solar.weekday} · 农历${lunar.month_day}`
}
