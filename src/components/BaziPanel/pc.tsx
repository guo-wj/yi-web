import { View, Text, Input } from '@tarojs/components'

import MarkdownView from '@/components/MarkdownView'
import PendingText from '@/components/LoadingDots'
import PanelBackButton from '@/components/PanelBackButton'
import {
    BAZI_CALENDARS,
    BAZI_FOCUS_OPTIONS,
    BAZI_GENDERS,
    BAZI_ORIENTATIONS,
    BAZI_SHICHEN
} from '@/constants/baziOptions'
import { useBazi, BirthDateInput } from './shared'

import './index.scss'

export default function BaziPanelPC () {
    const {
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
        subjectPills,
        toggleFocus, selectShi, selectShiUnknown,
        submit, onInterpret, reset, canGoBack, goBack
    } = useBazi()

    return (
        <View className='bazi-panel'>
            <View className='bazi-panel__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} />}

                {phase === 'form' && (
                    <View className='bazi-panel__form'>
                        <Text className='bazi-panel__form-hint'>凝神定意，如实填写，方得真盘</Text>
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
                                <BirthDateInput
                                    wrapClassName='bazi-panel__date-wrap'
                                    inputClassName='bazi-panel__f-input bazi-panel__f-date'
                                    iconClassName='bazi-panel__date-icon'
                                    value={birthDate}
                                    onChange={setBirthDate}
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
                            {loading
                                ? <PendingText spaced className='bazi-panel__submit-txt'>排 盘 中</PendingText>
                                : <Text className='bazi-panel__submit-txt'>查 看 命 盘</Text>}
                        </View>
                    </View>
                )}

                {(phase === 'chart' || phase === 'reading') && result && (
                    <View className='bazi-panel__reading'>
                        <View className='bazi-panel__subject'>
                            <Text className='bazi-panel__s-pill bazi-panel__s-pill--lead'>命主</Text>
                            {subjectPills.map((p, i) => (
                                <Text key={i} className='bazi-panel__s-pill'>{p.txt}</Text>
                            ))}
                        </View>

                        {quota && quota.free_remaining > 0 && (
                            <Text className='bazi-panel__quota'>
                                今日免费断语剩余 {quota.free_remaining} 次
                            </Text>
                        )}

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

                        {!!result.focus.length && (
                            <View className='bazi-panel__focus-echo'>
                                <Text className='bazi-panel__fe-label'>重点参详</Text>
                                {result.focus.map((f) => (
                                    <Text key={f} className='bazi-panel__fe-tag'>{f}</Text>
                                ))}
                            </View>
                        )}

                        {phase === 'chart' && !streamText && (
                            <View
                                className={`bazi-panel__submit ${interpreting ? 'bazi-panel__submit--disabled' : ''}`}
                                onClick={() => void onInterpret()}
                            >
                                {interpreting
                                    ? <PendingText spaced className='bazi-panel__submit-txt'>断 语 生 成 中</PendingText>
                                    : <Text className='bazi-panel__submit-txt'>命 理 断 语</Text>}
                            </View>
                        )}

                        {phase === 'reading' && (
                            <View className='bazi-panel__reading-box'>
                                <View className='bazi-panel__reading-head'>
                                    <Text className='bazi-panel__reading-title'>命 理 详 批</Text>
                                    {streaming && <View className='bazi-panel__stream-dot' />}
                                </View>
                                {streamText
                                    ? <MarkdownView className='bazi-panel__reading-md' content={streamText} />
                                    : (
                                        streaming
                                            ? <PendingText className='bazi-panel__reading-wait'>命盘洞开，批语将至</PendingText>
                                            : <Text className='bazi-panel__reading-wait'>暂无内容</Text>
                                    )}
                            </View>
                        )}

                        {!streaming && !interpreting && (
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
