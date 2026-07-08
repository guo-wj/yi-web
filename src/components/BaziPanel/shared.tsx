import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { useCallback, useEffect, useRef, useState } from 'react'

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
import { fetchPointsQuota, type PointsQuota } from '@/services/pointsApi'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { isLoggedIn } from '@/utils/auth'
import { ensurePoints, refundOnFailure } from '@/utils/ensurePoints'
import {
    postBaziChart,
    postBaziInterpret,
    streamBaziText,
    type BaziAnalyzeRequest,
    type BaziChartResponse
} from '@/services/baziApi'

export type Phase = 'form' | 'chart' | 'reading'

function buildRequest (opts: {
    gender: BaziGender
    calendar: BaziCalendar
    birthDate: string
    isLeapMonth: boolean
    shichenIndex: number
    birthplace: string
    orientation: BaziOrientation
    focuses: BaziFocus[]
}): BaziAnalyzeRequest {
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
    const [interpreting, setInterpreting] = useState(false)
    const [streaming, setStreaming] = useState(false)
    const [streamText, setStreamText] = useState('')
    const [result, setResult] = useState<BaziChartResponse | null>(null)
    const [quota, setQuota] = useState<PointsQuota | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const requestRef = useRef<BaziAnalyzeRequest | null>(null)
    const interpretingRef = useRef(false)

    useEffect(() => {
        if (!isLoggedIn()) {
            setQuota(null)
            return
        }
        void fetchPointsQuota('bazi').then(setQuota).catch(() => {})
    }, [])

    const refreshQuota = useCallback(() => {
        if (!isLoggedIn()) return
        void fetchPointsQuota('bazi').then(setQuota).catch(() => {})
    }, [])

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

    const buildPayload = useCallback(() => buildRequest({
        gender: gender!,
        calendar,
        birthDate,
        isLeapMonth,
        shichenIndex: shichenIndex!,
        birthplace,
        orientation: orientation!,
        focuses
    }), [gender, calendar, birthDate, isLeapMonth, shichenIndex, birthplace, orientation, focuses])

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
            const payload = buildPayload()
            requestRef.current = payload

            const resp = await postBaziChart(payload)
            if (ac.signal.aborted) return

            setResult(resp)
            setPhase('chart')
        } catch (e) {
            if (!ac.signal.aborted) {
                const msg = e instanceof Error ? e.message : '排盘失败'
                void Taro.showToast({ title: msg.length > 18 ? '排盘失败' : msg, icon: 'none' })
            }
        } finally {
            setLoading(false)
        }
    }, [validate, loading, buildPayload])

    const onInterpret = useCallback(async () => {
        const payload = requestRef.current
        if (!payload || !result || interpretingRef.current || streamText) return
        if (!ensureLoggedIn()) return

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        let txId: number | undefined
        try {
            const focusCount = payload.focus.length
            const { quoteForFeature } = await import('@/hooks/usePoints')
            const quote = await quoteForFeature({ feature: 'bazi', focus_count: focusCount })
            const skipConfirm = quote.uses_free_quota

            const points = await ensurePoints({
                feature: 'bazi',
                focus_count: focusCount,
                idempotency_key: `bazi:interpret:${payload.birth_year}:${payload.birth_hour}:${focusCount}:${Date.now()}`,
                meta: { focus_count: focusCount },
                skipConfirm
            })
            if (!points) return

            interpretingRef.current = true
            setInterpreting(true)

            txId = points.transaction_id

            const resp = await postBaziInterpret(payload)
            if (ac.signal.aborted) return

            setPhase('reading')
            setStreaming(true)
            setStreamText('')

            await streamBaziText(resp.content, (chunk) => {
                setStreamText((prev) => prev + chunk)
            }, ac.signal)
            refreshQuota()
        } catch (e) {
            await refundOnFailure(txId)
            if (!ac.signal.aborted) {
                const msg = e instanceof Error ? e.message : '断语失败'
                void Taro.showToast({ title: msg.length > 18 ? '断语失败' : msg, icon: 'none' })
            }
        } finally {
            interpretingRef.current = false
            setInterpreting(false)
            setStreaming(false)
        }
    }, [result, streamText, refreshQuota])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        setPhase('form')
        setResult(null)
        setStreamText('')
        setStreaming(false)
        setLoading(false)
        setInterpreting(false)
        requestRef.current = null
    }, [])

    const canGoBack = phase !== 'form'

    const goBack = useCallback(() => {
        abortRef.current?.abort()
        setInterpreting(false)
        setStreaming(false)
        if (phase === 'reading') {
            setPhase('chart')
        } else if (phase === 'chart') {
            setPhase('form')
            setLoading(false)
        }
    }, [phase])

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
        loading, interpreting, streaming, streamText, result, quota,
        calendarLabel, subjectPills,
        toggleFocus, selectShi, selectShiUnknown,
        submit, onInterpret, reset, canGoBack, goBack
    }
}

interface BirthDateInputProps {
    value: string
    onChange: (value: string) => void
    wrapClassName: string
    inputClassName: string
    iconClassName?: string
}

function CalendarIcon () {
    return (
        <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
            <rect x='3.5' y='5.5' width='17' height='15' rx='2.5' stroke='currentColor' strokeWidth='1.6' />
            <path d='M3.5 10h17' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
            <path d='M8 4v3.5M16 4v3.5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
            <rect x='7.5' y='13' width='3' height='3' rx='0.6' fill='currentColor' />
        </svg>
    )
}

/** 出生日期：点击整行唤起原生日期选择 */
export function BirthDateInput ({
    value,
    onChange,
    wrapClassName,
    inputClassName,
    iconClassName = 'birth-date-input__icon'
}: BirthDateInputProps) {
    const ref = useRef<HTMLInputElement>(null)

    const openPicker = () => {
        const el = ref.current
        if (!el) return
        if (typeof el.showPicker === 'function') {
            try {
                void el.showPicker()
            } catch {
                el.focus()
            }
        } else {
            el.focus()
        }
    }

    return (
        <View className={wrapClassName} onClick={openPicker}>
            <input
                ref={ref}
                className={inputClassName}
                type='date'
                value={value}
                onChange={(e) => onChange((e.target as HTMLInputElement).value)}
            />
            <View className={iconClassName}>
                <CalendarIcon />
            </View>
        </View>
    )
}
