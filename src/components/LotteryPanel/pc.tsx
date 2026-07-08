import { View, Text, Image } from '@tarojs/components'
import { useMemo } from 'react'

import MarkdownView from '@/components/MarkdownView'
import PendingText from '@/components/LoadingDots'
import canisterSvg from '@/assets/images/canister.svg'
import {
    formatSlipHeading,
    splitPoem,
    useLottery
} from './shared'
import type { LotterySlipResult } from '@/services/lotteryApi'

import './index.scss'

export default function LotteryPanelPC () {
    const { phase, result, openSheet, setOpenSheet, onDraw, onInterpret, reset, quota, interpreting } = useLottery()

    const drawnVisible = phase === 'drawn' || phase === 'settled'
    const drawnClass = [
        'lottery-panel__drawn',
        phase === 'drawn' ? 'lottery-panel__drawn--sway' : '',
        phase === 'settled' ? 'lottery-panel__drawn--sway lottery-panel__drawn--settled' : ''
    ]
        .filter(Boolean)
        .join(' ')

    const slipStickText = result?.slip.title ?? ''

    return (
        <View className='lottery-panel'>
            <View className='lottery-panel__scroll'>
                <View className='lottery-panel__canister-stage'>
                    <View className='lottery-panel__glow' />
                    <View
                        className={`lottery-panel__canister ${phase === 'shaking' ? 'lottery-panel__canister--shaking' : ''}`}
                    >
                        <Image
                            className='lottery-panel__canister-img'
                            src={canisterSvg}
                            mode='widthFix'
                        />
                    </View>

                    {drawnVisible && result && (
                        <View
                            className={drawnClass}
                            onClick={() => phase === 'settled' && result.interpretation && setOpenSheet(true)}
                        >
                            <View className='lottery-panel__drawn-cap' />
                            <View className='lottery-panel__drawn-body'>
                                <Text className='lottery-panel__drawn-label'>{slipStickText}</Text>
                                <View className='lottery-panel__drawn-seal'>
                                    <Text className='lottery-panel__drawn-seal-txt'>{result.slip.tier}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                <View className='lottery-panel__action-bar'>
                    {quota && quota.free_remaining > 0 && (
                        <Text className='lottery-panel__quota'>今日免费解签剩余 {quota.free_remaining} 次</Text>
                    )}
                    {phase === 'idle' && (
                        <View className='lottery-panel__cta' onClick={() => void onDraw()}>
                            <Text className='lottery-panel__cta-txt'>摇签求运势</Text>
                        </View>
                    )}
                    {phase === 'shaking' && (
                        <View className='lottery-panel__cta lottery-panel__cta--disabled'>
                            <PendingText className='lottery-panel__cta-txt'>诚心摇签中</PendingText>
                        </View>
                    )}
                    {phase === 'drawn' && (
                        <View className='lottery-panel__hint'>
                            <View className='lottery-panel__hint-dot' />
                            <Text className='lottery-panel__hint-txt'>签已出筒</Text>
                        </View>
                    )}
                    {phase === 'settled' && (
                        <View className='lottery-panel__foot'>
                            <View className='lottery-panel__actions'>
                                <View
                                    className='lottery-panel__action lottery-panel__action--primary'
                                    onClick={() => { if (!interpreting) void onInterpret() }}
                                >
                                    {interpreting
                                        ? <PendingText className='lottery-panel__action-txt lottery-panel__action-txt--primary'>解签中</PendingText>
                                        : <Text className='lottery-panel__action-txt lottery-panel__action-txt--primary'>解签</Text>}
                                </View>
                                <View
                                    className={`lottery-panel__action ${interpreting ? 'lottery-panel__action--disabled' : ''}`}
                                    onClick={() => { if (!interpreting) reset() }}
                                >
                                    <Text className='lottery-panel__action-txt'>再抽一次</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
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
        <View className='lottery-panel__scrim' onClick={onClose}>
            <View
                className='lottery-panel__sheet'
                onClick={(e) => e.stopPropagation?.()}
            >
                <View className='lottery-panel__sheet-close' onClick={onClose}>
                    <Text className='lottery-panel__sheet-close-txt'>✕</Text>
                </View>

                <View className='lottery-panel__sheet-head'>
                    <Text className='lottery-panel__sheet-n'>{result.slip.title}</Text>
                    <View className='lottery-panel__sheet-tag'>
                        <Text className='lottery-panel__sheet-tag-txt'>{formatSlipHeading(result.slip.id)} · {result.slip.tier}</Text>
                    </View>
                </View>

                <View className='lottery-panel__sheet-body'>
                    <View className='lottery-panel__poem-wrap'>
                        <View className='lottery-panel__poem'>
                            {cols.map((col, i) => (
                                <Text key={i} className='lottery-panel__poem-col'>{col}</Text>
                            ))}
                        </View>
                    </View>

                    <View className='lottery-panel__sect'>
                        <View className='lottery-panel__sect-h'>
                            <Text className='lottery-panel__sect-h-txt'>解 曰</Text>
                        </View>
                        <Text className='lottery-panel__sect-gist'>{result.slip.gist}</Text>
                    </View>

                    {(result.interpretation || interpreting) && (
                        <View className='lottery-panel__sect lottery-panel__sect--ai'>
                            <View className='lottery-panel__sect-h'>
                                <Text className='lottery-panel__sect-h-txt'>详 参</Text>
                            </View>
                            {result.interpretation
                                ? <MarkdownView className='lottery-panel__sect-md' content={result.interpretation} />
                                : <PendingText className='lottery-panel__sect-pending'>正在详参，请稍候</PendingText>}
                        </View>
                    )}

                    {!result.interpretation && !interpreting && (
                        <Text className='lottery-panel__sect-hint'>点击下方「解签」可获深度详参（消耗积分或免费额度）</Text>
                    )}

                    <Text className='lottery-panel__sheet-note'>云开月出照前程，莫向签文问死生。心若安然，处处是好程</Text>
                </View>
            </View>
        </View>
    )
}
