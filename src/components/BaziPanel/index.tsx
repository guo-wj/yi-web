import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useRef, useState } from 'react'

import MarkdownView from '@/components/MarkdownView'
import {
    BAZI_CALENDARS,
    BAZI_FOCUS_OPTIONS,
    BAZI_GENDERS,
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

import './index.scss'

type Phase = 'form' | 'reading'

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

export default function BaziPanel () {
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

    return (
        <View className='bazi-panel'>
            <View className='bazi-panel__scroll'>
                <View className='bazi-panel__head'>
                    <Text className='bazi-panel__title'>八字命理</Text>
                    <Text className='bazi-panel__subtitle'>四柱排盘 · 五行格局 · 运势参详</Text>
                </View>

                {phase === 'form' && (
                    <View className='bazi-panel__form'>
                        <View className='bazi-panel__sheet'>
                            <View className='bazi-panel__grid2'>
                                <View className='bazi-panel__field'>
                                    <Text className='bazi-panel__f-label'>
                                        性别<Text className='bazi-panel__f-req'>＊</Text>
                                    </Text>
                                    <View className={`bazi-panel__seg ${gender === '女' ? 'bazi-panel__seg--right' : ''}`}>
                                        <View className='bazi-panel__seg-thumb' />
                                        {BAZI_GENDERS.map((g) => (
                                            <View
                                                key={g}
                                                className={`bazi-panel__seg-opt ${gender === g ? 'bazi-panel__seg-opt--active' : ''}`}
                                                onClick={() => setGender(g)}
                                            >
                                                <Text className='bazi-panel__seg-txt'>{g}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View className='bazi-panel__field'>
                                    <Text className='bazi-panel__f-label'>出生历法</Text>
                                    <View className={`bazi-panel__seg ${calendar === 'lunar' ? 'bazi-panel__seg--right' : ''}`}>
                                        <View className='bazi-panel__seg-thumb' />
                                        {BAZI_CALENDARS.map((c) => (
                                            <View
                                                key={c.key}
                                                className={`bazi-panel__seg-opt ${calendar === c.key ? 'bazi-panel__seg-opt--active' : ''}`}
                                                onClick={() => {
                                                    setCalendar(c.key)
                                                    if (c.key === 'solar') setIsLeapMonth(false)
                                                }}
                                            >
                                                <Text className='bazi-panel__seg-txt'>{c.label}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            <View className='bazi-panel__field'>
                                <Text className='bazi-panel__f-label'>出生地</Text>
                                <View className='bazi-panel__input-wrap'>
                                    <Input
                                        className='bazi-panel__input'
                                        value={birthplace}
                                        placeholder='如：北京市朝阳区'
                                        maxlength={60}
                                        onInput={(e) => setBirthplace(e.detail.value)}
                                    />
                                </View>
                            </View>

                            <View className='bazi-panel__field'>
                                <Text className='bazi-panel__f-label'>
                                    出生日期
                                    <Text className='bazi-panel__f-note'>{calendar === 'lunar' ? '农历' : '公历'}</Text>
                                    <Text className='bazi-panel__f-req'>＊</Text>
                                </Text>
                                <input
                                    className='bazi-panel__f-input bazi-panel__f-date'
                                    type='date'
                                    value={birthDate}
                                    onChange={(e) => setBirthDate((e.target as HTMLInputElement).value)}
                                />
                            </View>

                            {calendar === 'lunar' && (
                                <View className='bazi-panel__field'>
                                    <Text className='bazi-panel__f-label'>闰月</Text>
                                    <View className={`bazi-panel__seg ${isLeapMonth ? 'bazi-panel__seg--right' : ''}`}>
                                        <View className='bazi-panel__seg-thumb' />
                                        <View
                                            className={`bazi-panel__seg-opt ${!isLeapMonth ? 'bazi-panel__seg-opt--active' : ''}`}
                                            onClick={() => setIsLeapMonth(false)}
                                        >
                                            <Text className='bazi-panel__seg-txt'>否</Text>
                                        </View>
                                        <View
                                            className={`bazi-panel__seg-opt ${isLeapMonth ? 'bazi-panel__seg-opt--active' : ''}`}
                                            onClick={() => setIsLeapMonth(true)}
                                        >
                                            <Text className='bazi-panel__seg-txt'>是</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View className='bazi-panel__field'>
                                <Text className='bazi-panel__f-label'>
                                    出生时辰<Text className='bazi-panel__f-req'>＊</Text>
                                </Text>
                                <View className='bazi-panel__shi-grid'>
                                    {BAZI_SHICHEN.map((s, i) => (
                                        <View
                                            key={s.branch}
                                            className={`bazi-panel__shi-cell ${!shiUnknown && shichenIndex === i ? 'bazi-panel__shi-cell--active' : ''}`}
                                            onClick={() => selectShi(i)}
                                        >
                                            <Text className='bazi-panel__shi-b'>{s.branch}</Text>
                                            <Text className='bazi-panel__shi-r'>{s.range.slice(0, 5)} 时</Text>
                                        </View>
                                    ))}
                                    <View
                                        className={`bazi-panel__shi-cell bazi-panel__shi-unknown ${shiUnknown ? 'bazi-panel__shi-cell--active' : ''}`}
                                        onClick={selectShiUnknown}
                                    >
                                        <Text className='bazi-panel__shi-b'>时辰不详</Text>
                                        <Text className='bazi-panel__shi-r'>按子时默排</Text>
                                    </View>
                                </View>
                            </View>

                            <View className='bazi-panel__field'>
                                <Text className='bazi-panel__f-label'>性取向</Text>
                                <View className='bazi-panel__chips'>
                                    {BAZI_ORIENTATIONS.map((o) => (
                                        <View
                                            key={o}
                                            className={`bazi-panel__chip ${orientation === o ? 'bazi-panel__chip--active' : ''}`}
                                            onClick={() => setOrientation(o)}
                                        >
                                            <Text className='bazi-panel__chip-txt'>{o}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <View className='bazi-panel__field'>
                                <Text className='bazi-panel__f-label'>
                                    关注事项<Text className='bazi-panel__f-note'>可多选</Text>
                                </Text>
                                <View className='bazi-panel__chips'>
                                    {BAZI_FOCUS_OPTIONS.map((f) => (
                                        <View
                                            key={f.key}
                                            className={`bazi-panel__chip ${focuses.includes(f.key) ? 'bazi-panel__chip--active' : ''}`}
                                            onClick={() => toggleFocus(f.key)}
                                        >
                                            <Text className='bazi-panel__chip-txt'>{f.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <View
                            className={`bazi-panel__submit ${loading ? 'bazi-panel__submit--disabled' : ''}`}
                            onClick={() => void submit()}
                        >
                            <Text className='bazi-panel__submit-txt'>
                                {loading ? '命 理 生 成 中 …' : '查 看 我 的 命 理'}
                            </Text>
                        </View>
                        <Text className='bazi-panel__form-hint'>凝神定意，如实填写，方得真盘</Text>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='bazi-panel__reading'>
                        <View className='bazi-panel__subject'>
                            <Text className='bazi-panel__s-pill bazi-panel__s-pill--lead'>命主</Text>
                            {subjectPills.map((p, i) => (
                                <Text key={i} className='bazi-panel__s-pill'>{p.txt}</Text>
                            ))}
                        </View>

                        <View className='bazi-panel__pillars-card'>
                            <View className='bazi-panel__pc-head'>
                                <Text className='bazi-panel__pc-title'>四 柱 排 盘</Text>
                                <Text className='bazi-panel__pc-pill'>{result.lunar_summary ? '已校历法' : '示例'}</Text>
                            </View>
                            {!!result.pillars_hint && (
                                <Text className='bazi-panel__pc-pillars'>{result.pillars_hint}</Text>
                            )}
                            {!!result.lunar_summary && (
                                <Text className='bazi-panel__pc-note'>农历 · {result.lunar_summary}</Text>
                            )}
                        </View>

                        <View className='bazi-panel__reading-box'>
                            <View className='bazi-panel__reading-head'>
                                <Text className='bazi-panel__reading-title'>命 理 详 批</Text>
                                {streaming && <View className='bazi-panel__stream-dot' />}
                            </View>
                            {streamText
                                ? <MarkdownView className='bazi-panel__reading-md' content={streamText} />
                                : (
                                    <Text className='bazi-panel__reading-wait'>
                                        {streaming ? '命盘洞开，批语将至…' : '暂无内容'}
                                    </Text>
                                )}
                        </View>

                        {!!result.focus.length && (
                            <View className='bazi-panel__focus-echo'>
                                <Text className='bazi-panel__fe-label'>重点参详</Text>
                                {result.focus.map((f) => (
                                    <Text key={f} className='bazi-panel__fe-tag'>{f}</Text>
                                ))}
                            </View>
                        )}

                        {!streaming && (
                            <View className='bazi-panel__btn-back' onClick={reset}>
                                <Text className='bazi-panel__btn-back-txt'>重 新 填 写</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}
