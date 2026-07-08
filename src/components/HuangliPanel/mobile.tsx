import { View, Text } from '@tarojs/components'

import PendingText from '@/components/LoadingDots'

import {    toCnYear,
    toCnMonth,
    monthSize,
    formatChong,
    deriveAlmanac,
    jieqiSealLabel,
    useHuangli
} from './shared'

import './mobile.scss'

export default function HuangliPanelMobile () {
    const { data, loading, errMsg, load } = useHuangli()

    if (loading) {
        return (
            <View className='huangli-m huangli-m--state'>
                <PendingText className='huangli-m__state-txt'>正在翻黄历</PendingText>
            </View>
        )
    }

    if (errMsg || !data) {
        return (
            <View className='huangli-m huangli-m--state'>
                <Text className='huangli-m__state-txt'>{errMsg ?? '暂无数据'}</Text>
                <View className='huangli-m__retry' onClick={() => void load()}>
                    <Text className='huangli-m__retry-txt'>重试</Text>
                </View>
            </View>
        )
    }

    const { solar, lunar, jieqi, yi, ji, details } = data
    const { gz, meta, dirs } = deriveAlmanac(data)
    const jieqiLabel = jieqiSealLabel(jieqi)

    return (
        <View className='huangli-m'>
            <View className='huangli-m__scroll'>
                {/* 头部卡片 */}
                <View className='huangli-m__card huangli-m__hero'>
                    <View className='huangli-m__hero-top'>
                        <Text className='huangli-m__gy'>公元{toCnYear(solar.year)}年</Text>
                        <View className='huangli-m__mon'>
                            <Text className='huangli-m__mon-b'>{toCnMonth(solar.month)}</Text>
                            <Text className='huangli-m__mon-sz'>{monthSize(solar.year, solar.month)}</Text>
                        </View>
                    </View>

                    <View className='huangli-m__bignum'>
                        <View className='huangli-m__d-wrap'>
                            <Text className='huangli-m__d'>{solar.day}</Text>
                        </View>
                        <View className='huangli-m__bignum-side'>
                            <Text className='huangli-m__wk'>{solar.weekday}</Text>
                            {jieqiLabel && (
                                <View className='huangli-m__seal'>
                                    <Text className='huangli-m__seal-txt'>{jieqiLabel}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Text className='huangli-m__lunar'>
                        农历{lunar.year_ganzhi}（{lunar.shengxiao}）年 · {lunar.month_day}
                    </Text>

                    <View className='huangli-m__gz'>
                        {gz.map((g) => (
                            <View key={g.unit} className='huangli-m__gz-item'>
                                <Text className='huangli-m__gz-gz'>{g.gz}</Text>
                                <Text className='huangli-m__gz-u'>{g.unit}</Text>
                            </View>
                        ))}
                    </View>

                    <View className='huangli-m__meta'>
                        {meta.map((m) => (
                            <View key={m.label} className='huangli-m__meta-row'>
                                <Text className='huangli-m__meta-k'>{m.label}</Text>
                                <Text className='huangli-m__meta-v'>{m.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* 宜忌 */}
                <View className='huangli-m__card huangli-m__yiji'>
                    <View className='huangli-m__col huangli-m__col--yi'>
                        <View className='huangli-m__yiji-head'>
                            <Text className='huangli-m__bigchar huangli-m__bigchar--yi'>宜</Text>
                        </View>
                        <View className='huangli-m__list'>
                            {yi.map((t, i) => (
                                <Text key={i} className='huangli-m__li'>{t}</Text>
                            ))}
                        </View>
                    </View>

                    <View className='huangli-m__vrule' />

                    <View className='huangli-m__col huangli-m__col--ji'>
                        <View className='huangli-m__yiji-head'>
                            <Text className='huangli-m__bigchar huangli-m__bigchar--ji'>忌</Text>
                        </View>
                        <View className='huangli-m__list'>
                            {ji.map((t, i) => (
                                <Text key={i} className='huangli-m__li'>{t}</Text>
                            ))}
                        </View>
                    </View>
                </View>

                {/* 方位吉时 */}
                <View className='huangli-m__card huangli-m__foot'>
                    <View className='huangli-m__foot-row'>
                        <Text className='huangli-m__fk'>冲煞</Text>
                        <Text className='huangli-m__foot-v'>{formatChong(details.chong, details.sha)}</Text>
                    </View>
                    <View className='huangli-m__dirs'>
                        {dirs.map((d) => (
                            <View key={d.label} className='huangli-m__dir'>
                                <Text className='huangli-m__dir-k'>{d.label}</Text>
                                <Text className='huangli-m__dir-v'>{d.value}</Text>
                            </View>
                        ))}
                    </View>
                    <View className='huangli-m__foot-row'>
                        <Text className='huangli-m__fk'>吉时</Text>
                        <Text className='huangli-m__foot-v'>{details.ji_shi.join(' ')}</Text>
                    </View>
                    <View className='huangli-m__foot-row'>
                        <Text className='huangli-m__fk'>彭祖</Text>
                        <Text className='huangli-m__foot-v'>{details.peng_zu.join(' ')}</Text>
                    </View>
                </View>
            </View>
        </View>
    )
}
