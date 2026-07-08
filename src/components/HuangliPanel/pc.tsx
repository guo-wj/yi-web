import { View, Text } from '@tarojs/components'

import PendingText from '@/components/LoadingDots'

import {
    toCnYear,
    toCnMonth,
    monthSize,
    formatChong,
    deriveAlmanac,
    jieqiSealLabel,
    useHuangli
} from './shared'

import './index.scss'

export default function HuangliPanelPC () {
    const { data, loading, errMsg, load } = useHuangli()

    if (loading) {
        return (
            <View className='huangli huangli--state'>
                <PendingText className='huangli__state-txt'>正在翻黄历</PendingText>
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
    const { gz, meta, dirs } = deriveAlmanac(data)
    const jieqiLabel = jieqiSealLabel(jieqi)

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
                                {jieqiLabel && (
                                    <View className='huangli__seal'>
                                        <Text className='huangli__seal-txt'>{jieqiLabel}</Text>
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
