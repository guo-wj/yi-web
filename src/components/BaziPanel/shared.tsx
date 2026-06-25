import Taro from '@tarojs/taro'
import { useCallback, useRef, useState } from 'react'

import {
    BAZI_CALENDARS,
    BAZI_ORIENTATIONS,
    BAZI_SHICHEN,
    focusValues,
    parseBirthDate,
    type BaziCalendar,
    type BaziFocus,
    type BaziGender,
    type BaziOrientation
} from '@/constants/baziOptions'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { postBaziAnalyze, streamBaziText, type BaziAnalyzeResponse } from '@/services/baziApi'

export type Phase = 'form' | 'reading'

function buildRequest (opts: {
    gender: BaziGender
    calendar: BaziCalendar
    birthDate: string
    isLeapMonth: boolean
    shichenIndex: number
    birthplace: string
    orientation: BaziOrientation
    focuses: BaziFocus[]
}) {
    const parsed = parseBirthDate(opts.birthDate)
    if (!parsed) throw new Error('出生日期格式无效')

    const shichen = BAZI_SHICHEN[opts.shichenIndex]
    if (!shichen) throw new Error('请选择出生时辰')

    return {
        gender: opts.gender,
        birth_place: opts.birthplace.trim(),
        calendar: opts.calendar,
        birth_year: parsed.year,
        birth_month: parsed.month,
        birth_day: parsed.day,
        is_leap_month: opts.calendar === 'lunar' ? opts.isLeapMonth : false,
        birth_hour: shichen.branch,
        sexual_orientation: opts.orientation,
        focus: focusValues(opts.focuses)
    }
}

/** 八字面板的全部状态与交互逻辑，PC 与移动端视图共用 */
export function useBazi () {
    const [phase, setPhase] = useState<Phase>('form')
    const [gender, setGender] = useState<BaziGender | null>('男')
    const [calendar, setCalendar] = useState<BaziCalendar>('solar')
    const [isLeapMonth, setIsLeapMonth] = useState(false)
    const [birthDate, setBirthDate] = useState('')
    const [shichenIndex, setShichenIndex] = useState<number | null>(null)
    const [shiUnknown, setShiUnknown] = useState(false)
    const [birthplace, setBirthplace] = useState('')
    const [orientation, setOrientation] = useState<BaziOrientation | null>(BAZI_ORIENTATIONS[0])
    const [focuses, setFocuses] = useState<BaziFocus[]>([])
    const [loading, setLoading] = useState(false)
    const [streaming, setStreaming] = useState(false)
    const [streamText, setStreamText] = useState('')
    const [result, setResult] = useState<BaziAnalyzeResponse | null>(null)

    const abortRef = useRef<AbortController | null>(null)

    const calendarLabel = BAZI_CALENDARS.find((c) => c.key === calendar)?.label ?? '阳历'

    const toggleFocus = useCallback((key: BaziFocus) => {
        setFocuses((prev) => (
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        ))
    }, [])

    const selectShi = useCallback((i: number) => {
        setShiUnknown(false)
        setShichenIndex(i)
    }, [])

    const selectShiUnknown = useCallback(() => {
        setShiUnknown(true)
        setShichenIndex(0)
    }, [])

    const validate = useCallback((): string | null => {
        if (!gender) return '请选择性别'
        if (!birthDate) return '请选择出生日期'
        if (shichenIndex === null) return '请选择出生时辰'
        if (!birthplace.trim()) return '请填写出生地'
        if (!orientation) return '请选择性取向'
        if (focuses.length === 0) return '请至少选择一项关注事项'
        return null
    }, [gender, birthDate, shichenIndex, birthplace, orientation, focuses])

    const submit = useCallback(async () => {
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }
        if (loading) return
        if (!ensureLoggedIn()) return

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        setLoading(true)
        setStreaming(false)
        setStreamText('')
        setResult(null)

        try {
            const payload = buildRequest({
                gender: gender!,
                calendar,
                birthDate,
                isLeapMonth,
                shichenIndex: shichenIndex!,
                birthplace,
                orientation: orientation!,
                focuses
            })

            const resp = await postBaziAnalyze(payload)
            if (ac.signal.aborted) return

            setResult(resp)
            setPhase('reading')
            setStreaming(true)

            await streamBaziText(resp.content, (chunk) => {
                setStreamText((prev) => prev + chunk)
            }, ac.signal)
        } catch (e) {
            if (!ac.signal.aborted) {
                const msg = e instanceof Error ? e.message : '生成失败'
                void Taro.showToast({ title: msg.length > 18 ? '生成失败' : msg, icon: 'none' })
            }
        } finally {
            setLoading(false)
            setStreaming(false)
        }
    }, [validate, loading, birthDate, shichenIndex, gender, calendar, isLeapMonth, birthplace, orientation, focuses])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        setPhase('form')
        setResult(null)
        setStreamText('')
        setStreaming(false)
        setLoading(false)
    }, [])

    const subjectPills = result
        ? [
            { txt: gender ?? '', show: !!gender },
            { txt: calendarLabel, show: true },
            { txt: result.birth_solar, show: !!result.birth_solar },
            { txt: result.birth_hour_label, show: !!result.birth_hour_label },
            { txt: birthplace.trim(), show: !!birthplace.trim() }
        ].filter((p) => p.show)
        : []

    return {
        phase,
        gender, setGender,
        calendar, setCalendar,
        isLeapMonth, setIsLeapMonth,
        birthDate, setBirthDate,
        shichenIndex, shiUnknown,
        birthplace, setBirthplace,
        orientation, setOrientation,
        focuses,
        loading, streaming, streamText, result,
        calendarLabel, subjectPills,
        toggleFocus, selectShi, selectShiUnknown,
        submit, reset
    }
}
