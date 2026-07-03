import { View, Text } from '@tarojs/components'
import { useMemo } from 'react'

import { YAO_LABELS } from '@/utils/liuyaoCoins'

import './index.scss'

const TRI_SYM: Record<string, string> = {
    乾: '☰', 兑: '☱', 离: '☲', 震: '☳', 巽: '☴', 坎: '☵', 艮: '☶', 坤: '☷'
}

export interface GuaShape {
    number: number
    name: string
    lower_trigram: string
    upper_trigram: string
    bits: number[]
}

export interface GuaPanelLine {
    position: number
    is_yang: boolean
    is_moving: boolean
}

function guaSym (gua: GuaShape): string {
    return `${TRI_SYM[gua.upper_trigram] ?? ''}${TRI_SYM[gua.lower_trigram] ?? ''}`
}

export default function GuaPanel ({
    role,
    gua,
    lines,
    movingLine,
    note
}: {
    role: string
    gua: GuaShape
    lines?: GuaPanelLine[]
    movingLine?: number
    note?: string
}) {
    const displayRows = useMemo(() => {
        return [5, 4, 3, 2, 1, 0].map((idx) => {
            const bit = gua.bits[idx] ?? 0
            const ln = lines?.find((l) => l.position === idx + 1)
            const yang = ln ? ln.is_yang : bit === 1
            const moving = ln ? ln.is_moving : movingLine === idx + 1
            const mark = moving ? (yang ? '○' : '✕') : ''
            return { idx, yang, moving, mark }
        })
    }, [gua, lines, movingLine])

    return (
        <View className='gua-panel gua-panel--result'>
            <View className='gua-panel__head'>
                <Text className='gua-panel__title'>{role} · {gua.name}</Text>
                <Text className='gua-panel__note'>{note ?? guaSym(gua)}</Text>
            </View>
            <View className='gua-panel__rows'>
                {displayRows.map((row) => (
                    <View
                        key={row.idx}
                        className={`gua-panel__row gua-panel__row--filled ${row.moving ? 'gua-panel__row--moving' : ''}`}
                    >
                        <Text className='gua-panel__name'>{YAO_LABELS[row.idx]}</Text>
                        <View className='gua-panel__bar'>
                            {row.yang
                                ? <View className='gua-panel__seg' />
                                : (
                                    <>
                                        <View className='gua-panel__seg' />
                                        <View className='gua-panel__seg' />
                                    </>
                                )}
                        </View>
                        <Text className='gua-panel__mark'>{row.mark}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}
