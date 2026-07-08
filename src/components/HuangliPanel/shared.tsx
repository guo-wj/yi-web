import { useCallback, useEffect, useState } from 'react'

import { getAlmanacDay, type AlmanacResponse } from '@/services/almanacApi'

const CN_DIGITS = '〇一二三四五六七八九'

export function toCnYear (year: number): string {
    return String(year)
        .split('')
        .map((c) => CN_DIGITS[Number(c)] ?? c)
        .join('')
}

const CN_MONTHS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

export function toCnMonth (month: number): string {
    return `${CN_MONTHS[month] ?? month}月`
}

// 公历月大小：31 天为大月，否则小月
export function monthSize (year: number, month: number): string {
    return new Date(year, month, 0).getDate() >= 31 ? '大' : '小'
}

// details.chong 形如 "(戊申)猴"，sha 形如 "北" → "冲猴〔戊申〕煞北"
export function formatChong (chong: string, sha: string): string {
    const m = chong.match(/^\((.+)\)(.+)$/)
    if (m) return `冲${m[2]}〔${m[1]}〕煞${sha}`
    return `${chong} 煞${sha}`
}

export interface DirItem {
    label: string
    value: string
}

/** 由黄历数据派生 干支 / 基础信息 / 吉神方位 三组展示数据 */
export function deriveAlmanac (data: AlmanacResponse) {
    const { lunar, details } = data

    const gz: Array<{ gz: string; unit: string }> = [
        { gz: lunar.year_ganzhi, unit: '年' },
        { gz: lunar.month_ganzhi, unit: '月' },
        { gz: lunar.day_ganzhi, unit: '日' }
    ]

    const meta: DirItem[] = [
        { label: '五行', value: lunar.nayin },
        { label: '星宿', value: details.xiu },
        { label: '值神', value: details.zhishen }
    ]

    const dirs: DirItem[] = [
        { label: '喜神', value: details.xi_shen },
        { label: '福神', value: details.fu_shen },
        { label: '财神', value: details.cai_shen },
        { label: '阳贵', value: details.yang_gui },
        { label: '阴贵', value: details.yin_gui }
    ]

    return { gz, meta, dirs }
}

/** 日期旁节气印章：仅当天为节气日（jieqi.current）时展示，勿用 term（上一节气段名，会长期不变） */
export function jieqiSealLabel (jieqi: AlmanacResponse['jieqi']): string | null {
    return jieqi.current || null
}

/** 黄历数据加载逻辑，PC 与移动端视图共用 */
export function useHuangli () {
    const [data, setData] = useState<AlmanacResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [errMsg, setErrMsg] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setErrMsg(null)
        try {
            setData(await getAlmanacDay())
        } catch (e) {
            setErrMsg(e instanceof Error ? e.message : '加载失败')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    return { data, loading, errMsg, load }
}
