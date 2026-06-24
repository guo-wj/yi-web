import { View, Text } from '@tarojs/components'
import { useCallback, useEffect, useState } from 'react'

import { getAlmanacDay, type AlmanacResponse } from '@/services/almanacApi'

import './index.scss'

const CN_DIGITS = '〇一二三四五六七八九'

function toCnYear (year: number): string {
    return String(year)
        .split('')
        .map((c) => CN_DIGITS[Number(c)] ?? c)
        .join('')
}

const CN_MONTHS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']

function toCnMonth (month: number): string {
    return `${CN_MONTHS[month] ?? month}月`
}

// 公历月大小：31 天为大月，否则小月
function monthSize (year: number, month: number): string {
    return new Date(year, month, 0).getDate() >= 31 ? '大' : '小'
}

// details.chong 形如 "(戊申)猴"，sha 形如 "北" → "冲猴〔戊申〕煞北"
function formatChong (chong: string, sha: string): string {
    const m = chong.match(/^\((.+)\)(.+)$/)
    if (m) return `冲${m[2]}〔${m[1]}〕煞${sha}`
    return `${chong} 煞${sha}`
}

interface DirItem {
    label: string
    value: string
}

export default function HuangliPanel () {
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

    if (loading) {
        return (
            <View className='huangli huangli--state'>
                <Text className='huangli__state-txt'>正在翻黄历…</Text>
            </View>
        )
    }

    if (errMsg || !data) {
        return (
            <View className='huangli huangli--state'>
                <Text className='huangli__state-txt'>{errMsg ?? '暂无数据'}</Text>
                <View className='huangli__retry' onClick={() => void load()}>
                    <Text className='huangli__retry-txt'>重试</Text>
                </View>
            </View>
        )
    }

    const { solar, lunar, jieqi, yi, ji, details } = data

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

    return (
        <View className='huangli'>
            <View className='huangli__scroll'>
                <View className='huangli__rod huangli__rod--top'>
                    <View className='huangli__knob huangli__knob--l' />
                    <View className='huangli__knob huangli__knob--r' />
                </View>
                <View className='huangli__card'>
                    <View className='huangli__frame'>
                    <View className='huangli__corner huangli__corner--tl' />
                    <View className='huangli__corner huangli__corner--tr' />
                    <View className='huangli__corner huangli__corner--bl' />
                    <View className='huangli__corner huangli__corner--br' />

                    <View className='huangli__main'>
                        <View className='huangli__left'>
                            <View className='huangli__top'>
                                <Text className='huangli__gy'>公元{toCnYear(solar.year)}年</Text>
                                <View className='huangli__top-right'>
                                    <View className='huangli__mon'>
                                        <Text className='huangli__mon-b'>{toCnMonth(solar.month)}</Text>
                                        <Text className='huangli__mon-sz'>{monthSize(solar.year, solar.month)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View className='huangli__bignum'>
                                <Text className='huangli__d'>{solar.day}</Text>
                                <Text className='huangli__wk'>{solar.weekday}</Text>
                                {jieqi.term && (
                                    <View className='huangli__seal'>
                                        <Text className='huangli__seal-txt'>{jieqi.term}</Text>
                                    </View>
                                )}
                            </View>

                            <Text className='huangli__lunar'>
                                农历{lunar.year_ganzhi}（{lunar.shengxiao}）年 · {lunar.month_day}
                            </Text>

                            <View className='huangli__gz'>
                                {gz.map((g) => (
                                    <View key={g.unit} className='huangli__gz-item'>
                                        <Text className='huangli__gz-gz'>{g.gz}</Text>
                                        <Text className='huangli__gz-u'>{g.unit}</Text>
                                    </View>
                                ))}
                            </View>

                            <View className='huangli__meta'>
                                {meta.map((m) => (
                                    <View key={m.label} className='huangli__meta-row'>
                                        <Text className='huangli__meta-k'>{m.label}</Text>
                                        <Text className='huangli__meta-v'>{m.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View className='huangli__yiji'>
                            <View className='huangli__col huangli__col--yi'>
                                <View className='huangli__head'>
                                    <Text className='huangli__bigchar huangli__bigchar--yi'>宜</Text>
                                </View>
                                <View className='huangli__list'>
                                    {yi.map((t, i) => (
                                        <Text key={i} className='huangli__li'>{t}</Text>
                                    ))}
                                </View>
                            </View>

                            <View className='huangli__vrule' />

                            <View className='huangli__col huangli__col--ji'>
                                <View className='huangli__head'>
                                    <Text className='huangli__bigchar huangli__bigchar--ji'>忌</Text>
                                </View>
                                <View className='huangli__list'>
                                    {ji.map((t, i) => (
                                        <Text key={i} className='huangli__li'>{t}</Text>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className='huangli__foot'>
                        <View className='huangli__foot-cell'>
                            <Text className='huangli__fk'>冲煞</Text>
                            <Text className='huangli__foot-v'>{formatChong(details.chong, details.sha)}</Text>
                        </View>
                        <View className='huangli__foot-cell huangli__foot-cell--dirs'>
                            {dirs.map((d) => (
                                <View key={d.label} className='huangli__dir'>
                                    <Text className='huangli__dir-k'>{d.label}</Text>
                                    <Text className='huangli__dir-v'>{d.value}</Text>
                                </View>
                            ))}
                        </View>
                        <View className='huangli__foot-cell'>
                            <Text className='huangli__fk'>吉时</Text>
                            <Text className='huangli__foot-v'>{details.ji_shi.join(' ')}</Text>
                        </View>
                        <View className='huangli__foot-cell huangli__foot-cell--last'>
                            <Text className='huangli__fk'>彭祖</Text>
                            <Text className='huangli__foot-v'>{details.peng_zu.join(' ')}</Text>
                        </View>
                    </View>
                    </View>
                </View>
                <View className='huangli__rod huangli__rod--bottom'>
                    <View className='huangli__knob huangli__knob--l' />
                    <View className='huangli__knob huangli__knob--r' />
                </View>
            </View>
        </View>
    )
}
