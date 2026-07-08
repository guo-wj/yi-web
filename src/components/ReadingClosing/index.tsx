import { View, Text } from '@tarojs/components'

interface ReadingClosingSectionProps {
    classPrefix: string
    closingSummary?: string | null
    adviceItems?: string[] | null
}

/** 掌纹/面相等结构化解读末尾：综合总结 + 分条实践建议 */
export default function ReadingClosingSection ({
    classPrefix,
    closingSummary,
    adviceItems
}: ReadingClosingSectionProps) {
    const p = classPrefix
    const items = adviceItems?.filter(Boolean) ?? []
    if (!closingSummary && !items.length) return null

    return (
        <View className={`${p}__closing-wrap`}>
            {!!closingSummary && (
                <View className={`${p}__card ${p}__closing-card`}>
                    <View className={`${p}__card-head`}>
                        <Text className={`${p}__card-title`}>综 合 总 结</Text>
                    </View>
                    <Text className={`${p}__overview-text`}>{closingSummary}</Text>
                </View>
            )}
            {!!items.length && (
                <View className={`${p}__card ${p}__advice-card`}>
                    <View className={`${p}__card-head`}>
                        <Text className={`${p}__card-title`}>实 践 建 议</Text>
                    </View>
                    <View className={`${p}__advice-list`}>
                        {items.map((item, i) => (
                            <View key={i} className={`${p}__advice-item`}>
                                <Text className={`${p}__advice-n`}>{i + 1}</Text>
                                <Text className={`${p}__advice-txt`}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    )
}
