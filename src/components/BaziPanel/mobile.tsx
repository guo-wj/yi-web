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

import './mobile.scss'

export default function BaziPanelMobile () {
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
        <View className='bazi-m'>
            <View className='bazi-m__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} />}

                {phase === 'form' && (
                    <View className='bazi-m__form'>
                        <Text className='bazi-m__form-hint'>凝神定意，如实填写，方得真盘</Text>
                        <View className='bazi-m__field'>
                            <Text className='bazi-m__f-label'>
                                性别<Text className='bazi-m__f-req'>＊</Text>
                            </Text>
                            <View className={`bazi-m__seg ${gender === '女' ? 'bazi-m__seg--right' : ''}`}>
                                <View className='bazi-m__seg-thumb' />
                                {BAZI_GENDERS.map((g) => (
                                    <View
                                        key={g}
                                        className={`bazi-m__seg-opt ${gender === g ? 'bazi-m__seg-opt--active' : ''}`}
                                        onClick={() => setGender(g)}
                                    >
                                        <Text className='bazi-m__seg-txt'>{g}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View className='bazi-m__field'>
                            <Text className='bazi-m__f-label'>出生历法</Text>
                            <View className={`bazi-m__seg ${calendar === 'lunar' ? 'bazi-m__seg--right' : ''}`}>
                                <View className='bazi-m__seg-thumb' />
                                {BAZI_CALENDARS.map((c) => (
                                    <View
                                        key={c.key}
                                        className={`bazi-m__seg-opt ${calendar === c.key ? 'bazi-m__seg-opt--active' : ''}`}
                                        onClick={() => {
                                            setCalendar(c.key)
                                            if (c.key === 'solar') setIsLeapMonth(false)
                                        }}
                                    >
                                        <Text className='bazi-m__seg-txt'>{c.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View className='bazi-m__field'>
                            <Text className='bazi-m__f-label'>出生地</Text>
                            <View className='bazi-m__input-wrap'>
                                <Input
                                    className='bazi-m__input'
                                    value={birthplace}
                                    placeholder='如：北京市朝阳区'
                                    maxlength={60}
                                    onInput={(e) => setBirthplace(e.detail.value)}
                                />
                            </View>
                        </View>

                        <View className='bazi-m__field'>
                            <Text className='bazi-m__f-label'>
                                出生日期
                                <Text className='bazi-m__f-note'>{calendar === 'lunar' ? '农历' : '公历'}</Text>
                                <Text className='bazi-m__f-req'>＊</Text>
                            </Text>
                            <BirthDateInput
                                wrapClassName='bazi-m__date-wrap'
                                inputClassName='bazi-m__date'
                                iconClassName='bazi-m__date-icon'
                                value={birthDate}
                                onChange={setBirthDate}
                            />
                        </View>

                        {calendar === 'lunar' && (
                            <View className='bazi-m__field'>
                                <Text className='bazi-m__f-label'>闰月</Text>
                                <View className={`bazi-m__seg ${isLeapMonth ? 'bazi-m__seg--right' : ''}`}>
                                    <View className='bazi-m__seg-thumb' />
                                    <View
                                        className={`bazi-m__seg-opt ${!isLeapMonth ? 'bazi-m__seg-opt--active' : ''}`}
                                        onClick={() => setIsLeapMonth(false)}
                                    >
                                        <Text className='bazi-m__seg-txt'>否</Text>
                                    </View>
                                    <View
                                        className={`bazi-m__seg-opt ${isLeapMonth ? 'bazi-m__seg-opt--active' : ''}`}
                                        onClick={() => setIsLeapMonth(true)}
                                    >
                                        <Text className='bazi-m__seg-txt'>是</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View className='bazi-m__field'>
                            <Text className='bazi-m__f-label'>
                                出生时辰<Text className='bazi-m__f-req'>＊</Text>
                            </Text>
                            <View className='bazi-m__shi-grid'>
                                {BAZI_SHICHEN.map((s, i) => (
                                    <View
                                        key={s.branch}
                                        className={`bazi-m__shi-cell ${!shiUnknown && shichenIndex === i ? 'bazi-m__shi-cell--active' : ''}`}
                                        onClick={() => selectShi(i)}
                                    >
                                        <Text className='bazi-m__shi-b'>{s.branch}</Text>
                                        <Text className='bazi-m__shi-r'>{s.range.slice(0, 5)}时</Text>
                                    </View>
                                ))}
                                <View
                                    className={`bazi-m__shi-cell bazi-m__shi-unknown ${shiUnknown ? 'bazi-m__shi-cell--active' : ''}`}
                                    onClick={selectShiUnknown}
                                >
                                    <Text className='bazi-m__shi-b'>不详</Text>
                                    <Text className='bazi-m__shi-r'>按子时</Text>
                                </View>
                            </View>
                        </View>

                        <View className='bazi-m__field'>
                            <Text className='bazi-m__f-label'>性取向</Text>
                            <View className='bazi-m__chips'>
                                {BAZI_ORIENTATIONS.map((o) => (
                                    <View
                                        key={o}
                                        className={`bazi-m__chip ${orientation === o ? 'bazi-m__chip--active' : ''}`}
                                        onClick={() => setOrientation(o)}
                                    >
                                        <Text className='bazi-m__chip-txt'>{o}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View className='bazi-m__field'>
                            <Text className='bazi-m__f-label'>
                                关注事项<Text className='bazi-m__f-note'>可多选</Text>
                            </Text>
                            <View className='bazi-m__chips'>
                                {BAZI_FOCUS_OPTIONS.map((f) => (
                                    <View
                                        key={f.key}
                                        className={`bazi-m__chip ${focuses.includes(f.key) ? 'bazi-m__chip--active' : ''}`}
                                        onClick={() => toggleFocus(f.key)}
                                    >
                                        <Text className='bazi-m__chip-txt'>{f.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {(phase === 'chart' || phase === 'reading') && result && (
                    <View className='bazi-m__reading'>
                        <View className='bazi-m__subject'>
                            <Text className='bazi-m__s-pill bazi-m__s-pill--lead'>命主</Text>
                            {subjectPills.map((p, i) => (
                                <Text key={i} className='bazi-m__s-pill'>{p.txt}</Text>
                            ))}
                        </View>

                        {quota && quota.free_remaining > 0 && (
                            <Text className='bazi-m__quota'>
                                今日免费断语剩余 {quota.free_remaining} 次
                            </Text>
                        )}

                        <View className='bazi-m__card bazi-m__pillars-card'>
                            <View className='bazi-m__pc-head'>
                                <Text className='bazi-m__pc-title'>四 柱 排 盘</Text>
                                <Text className='bazi-m__pc-pill'>{result.lunar_summary ? '已校历法' : '示例'}</Text>
                            </View>
                            {!!result.pillars_hint && (
                                <Text className='bazi-m__pc-pillars'>{result.pillars_hint}</Text>
                            )}
                            {!!result.lunar_summary && (
                                <Text className='bazi-m__pc-note'>农历 · {result.lunar_summary}</Text>
                            )}
                        </View>

                        {!!result.focus.length && (
                            <View className='bazi-m__focus-echo'>
                                <Text className='bazi-m__fe-label'>重点参详</Text>
                                {result.focus.map((f) => (
                                    <Text key={f} className='bazi-m__fe-tag'>{f}</Text>
                                ))}
                            </View>
                        )}

                        {phase === 'chart' && !streamText && (
                            <View
                                className={`bazi-m__submit ${interpreting ? 'bazi-m__submit--disabled' : ''}`}
                                onClick={() => void onInterpret()}
                            >
                                {interpreting
                                    ? <PendingText className='bazi-m__submit-txt'>断语生成中</PendingText>
                                    : <Text className='bazi-m__submit-txt'>命理断语</Text>}
                            </View>
                        )}

                        {phase === 'reading' && (
                            <View className='bazi-m__card bazi-m__reading-box'>
                                <View className='bazi-m__reading-head'>
                                    <Text className='bazi-m__reading-title'>命 理 详 批</Text>
                                    {streaming && <View className='bazi-m__stream-dot' />}
                                </View>
                                {streamText
                                    ? <MarkdownView className='bazi-m__reading-md' content={streamText} />
                                    : (
                                        streaming
                                            ? <PendingText className='bazi-m__reading-wait'>命盘洞开，批语将至</PendingText>
                                            : <Text className='bazi-m__reading-wait'>暂无内容</Text>
                                    )}
                            </View>
                        )}

                        {!streaming && !interpreting && (
                            <View className='bazi-m__btn-back' onClick={reset}>
                                <Text className='bazi-m__btn-back-txt'>重 新 填 写</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {phase === 'form' && (
                <View className='bazi-m__dock'>
                    <View
                        className={`bazi-m__submit ${loading ? 'bazi-m__submit--disabled' : ''}`}
                        onClick={() => void submit()}
                    >
                        {loading
                            ? <PendingText className='bazi-m__submit-txt'>排盘中</PendingText>
                            : <Text className='bazi-m__submit-txt'>查看命盘</Text>}
                    </View>
                </View>
            )}
        </View>
    )
}
