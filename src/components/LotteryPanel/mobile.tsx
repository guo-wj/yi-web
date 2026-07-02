import { View, Text, Image } from '@tarojs/components'
import { useMemo } from 'react'

import MarkdownView from '@/components/MarkdownView'
import canisterSvg from '@/assets/images/canister.svg'
import {
    formatSlipHeading,
    splitPoem,
    useLottery
} from './shared'
import type { LotterySlipResult } from '@/services/lotteryApi'

import './mobile.scss'

export default function LotteryPanelMobile () {
    const { phase, result, openSheet, setOpenSheet, onDraw, onInterpret, reset, quota, interpreting } = useLottery()

    const drawnVisible = phase === 'drawn' || phase === 'settled'
    const drawnClass = [
        'lottery-m__drawn',
        phase === 'drawn' ? 'lottery-m__drawn--sway' : '',
        phase === 'settled' ? 'lottery-m__drawn--sway lottery-m__drawn--settled' : ''
    ]
        .filter(Boolean)
        .join(' ')

    const slipStickText = result?.slip.title ?? ''

    return (
        <View className='lottery-m'>
            <View className='lottery-m__scroll'>
                <View className='lottery-m__titleblock'>
                    <Text className='lottery-m__title'>灵签一动</Text>
                    <Text className='lottery-m__subtitle'>静心凝神，摇签即得今日指引</Text>
                    {quota && quota.free_remaining > 0 && (
                        <Text className='lottery-m__quota'>今日免费 AI 解签剩余 {quota.free_remaining} 次</Text>
                    )}
                </View>

                <View className='lottery-m__canister-stage'>
                    <View className='lottery-m__glow' />
                    <View
                        className={`lottery-m__canister ${phase === 'shaking' ? 'lottery-m__canister--shaking' : ''}`}
                    >
                        <Image
                            className='lottery-m__canister-img'
                            src={canisterSvg}
                            mode='widthFix'
                        />
                    </View>

                    {drawnVisible && result && (
                        <View
                            className={drawnClass}
                            onClick={() => phase === 'settled' && setOpenSheet(true)}
                        >
                            <View className='lottery-m__drawn-cap' />
                            <View className='lottery-m__drawn-body'>
                                <Text className='lottery-m__drawn-label'>{slipStickText}</Text>
                                <View className='lottery-m__drawn-seal'>
                                    <Text className='lottery-m__drawn-seal-txt'>{result.slip.tier}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            <View className='lottery-m__dock'>
                {phase === 'idle' && (
                    <View className='lottery-m__cta' onClick={() => void onDraw()}>
                        <Text className='lottery-m__cta-txt'>摇签求运势</Text>
                    </View>
                )}
                {phase === 'shaking' && (
                    <View className='lottery-m__cta lottery-m__cta--disabled'>
                        <Text className='lottery-m__cta-txt'>诚心摇签中…</Text>
                    </View>
                )}
                {phase === 'drawn' && (
                    <View className='lottery-m__hint'>
                        <View className='lottery-m__hint-dot' />
                        <Text className='lottery-m__hint-txt'>签已出筒</Text>
                    </View>
                )}
                {phase === 'settled' && (
                    <View className='lottery-m__actions'>
                        <View
                            className='lottery-m__action lottery-m__action--primary'
                            onClick={() => void onInterpret()}
                        >
                            <Text className='lottery-m__action-txt lottery-m__action-txt--primary'>
                                {interpreting ? '解签中…' : '解签'}
                            </Text>
                        </View>
                        <View className='lottery-m__action' onClick={reset}>
                            <Text className='lottery-m__action-txt'>再抽一次</Text>
                        </View>
                    </View>
                )}
            </View>

            {openSheet && result && (
                <ResultSheet
                    result={result}
                    interpreting={interpreting}
                    onClose={() => setOpenSheet(false)}
                />
            )}
        </View>
    )
}

interface ResultSheetProps {
    result: LotterySlipResult
    interpreting: boolean
    onClose: () => void
}

function ResultSheet ({ result, interpreting, onClose }: ResultSheetProps) {
    const cols = useMemo(() => splitPoem(result.slip.poem), [result.slip.poem])

    return (
        <View className='lottery-m__scrim' onClick={onClose}>
            <View
                className='lottery-m__sheet'
                catchMove
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='lottery-m__sheet-handle' />
                <View className='lottery-m__sheet-close' onClick={onClose}>
                    <Text className='lottery-m__sheet-close-txt'>✕</Text>
                </View>

                <View className='lottery-m__sheet-head'>
                    <Text className='lottery-m__sheet-n'>{result.slip.title}</Text>
                    <View className='lottery-m__sheet-tag'>
                        <Text className='lottery-m__sheet-tag-txt'>{formatSlipHeading(result.slip.id)} · {result.slip.tier}</Text>
                    </View>
                </View>

                <View className='lottery-m__sheet-body'>
                    <View className='lottery-m__poem-wrap'>
                        <View className='lottery-m__poem'>
                            {cols.map((col, i) => (
                                <Text key={i} className='lottery-m__poem-col'>{col}</Text>
                            ))}
                        </View>
                    </View>

                    <View className='lottery-m__sect'>
                        <View className='lottery-m__sect-h'>
                            <Text className='lottery-m__sect-h-txt'>解 曰</Text>
                        </View>
                        {result.interpretation
                            ? <MarkdownView className='lottery-m__sect-md' content={result.interpretation} />
                            : (
                                <Text className='lottery-m__sect-pending'>
                                    {interpreting ? 'AI 正在解签，请稍候…' : '点击解签获取 AI 解读'}
                                </Text>
                            )}
                    </View>

                    <Text className='lottery-m__sheet-note'>云开月出照前程，莫向签文问死生。心若安然，处处是好程</Text>
                </View>
            </View>
        </View>
    )
}
