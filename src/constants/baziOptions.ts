/** 八字命理表单选项 */

export type BaziGender = '男' | '女'
export type BaziCalendar = 'solar' | 'lunar'
export type BaziFocus = 'love' | 'career' | 'study' | 'wealth'
export type BaziShichenBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'

export const BAZI_GENDERS: BaziGender[] = ['男', '女']

export const BAZI_CALENDARS: { key: BaziCalendar; label: string }[] = [
    { key: 'solar', label: '阳历' },
    { key: 'lunar', label: '阴历' }
]

export const BAZI_SHICHEN: readonly {
    branch: BaziShichenBranch
    label: string
    range: string
}[] = [
    { branch: '子', label: '子时', range: '23:00—01:00' },
    { branch: '丑', label: '丑时', range: '01:00—03:00' },
    { branch: '寅', label: '寅时', range: '03:00—05:00' },
    { branch: '卯', label: '卯时', range: '05:00—07:00' },
    { branch: '辰', label: '辰时', range: '07:00—09:00' },
    { branch: '巳', label: '巳时', range: '09:00—11:00' },
    { branch: '午', label: '午时', range: '11:00—13:00' },
    { branch: '未', label: '未时', range: '13:00—15:00' },
    { branch: '申', label: '申时', range: '15:00—17:00' },
    { branch: '酉', label: '酉时', range: '17:00—19:00' },
    { branch: '戌', label: '戌时', range: '19:00—21:00' },
    { branch: '亥', label: '亥时', range: '21:00—23:00' }
]

/** 与后端 sexual_orientation 枚举一致 */
export const BAZI_ORIENTATIONS = [
    '异性恋',
    '同性恋',
    '双性恋',
    '其他',
    '不愿透露'
] as const

export type BaziOrientation = typeof BAZI_ORIENTATIONS[number]

export const BAZI_FOCUS_OPTIONS: { key: BaziFocus; label: string }[] = [
    { key: 'love', label: '感情' },
    { key: 'career', label: '事业' },
    { key: 'study', label: '学业' },
    { key: 'wealth', label: '财运' }
]

export function focusLabels (keys: BaziFocus[]): string {
    return BAZI_FOCUS_OPTIONS
        .filter((o) => keys.includes(o.key))
        .map((o) => o.label)
        .join('、')
}

/** 提交后端 focus 字段（中文标签数组） */
export function focusValues (keys: BaziFocus[]): string[] {
    return BAZI_FOCUS_OPTIONS
        .filter((o) => keys.includes(o.key))
        .map((o) => o.label)
}

export function parseBirthDate (date: string): { year: number; month: number; day: number } | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    if (!m) return null
    return {
        year: Number(m[1]),
        month: Number(m[2]),
        day: Number(m[3])
    }
}
