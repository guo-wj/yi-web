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
                            onClick={() => phase === 'settled' && result.interpretation && setOpenSheet(true)}
                        >
                            <View className='lottery-m__drawn-cap' />
                            <View className='lottery-m__drawn-body'>
                                <View className='lottery-m__drawn-label'>
                                    {[...slipStickText].map((char, i) => (
                                        <Text key={`${char}-${i}`} className='lottery-m__drawn-char'>
                                            {char}
                                        </Text>
                                    ))}
                                </View>
                                <View className='lottery-m__drawn-seal'>
                                    <Text className='lottery-m__drawn-seal-txt'>{result.slip.tier}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            <View className='lottery-m__dock'>
                {quota && quota.free_remaining > 0 && (
                    <Text className='lottery-m__quota'>今日免费解签剩余 {quota.free_remaining} 次</Text>
                )}
                {phase === 'idle' && (
                    <View className='lottery-m__cta' onClick={() => void onDraw()}>
                        <Text className='lottery-m__cta-txt'>摇签求运势</Text>
                    </View>
                )}
                {phase === 'shaking' && (
                    <View className='lottery-m__cta lottery-m__cta--disabled'>
                        <PendingText className='lottery-m__cta-txt'>诚心摇签中</PendingText>
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
                            onClick={() => { if (!interpreting) void onInterpret() }}
                        >
                            {interpreting
                                ? <PendingText className='lottery-m__action-txt lottery-m__action-txt--primary'>解签中</PendingText>
                                : <Text className='lottery-m__action-txt lottery-m__action-txt--primary'>解签</Text>}
                        </View>
                        <View
                            className={`lottery-m__action ${interpreting ? 'lottery-m__action--disabled' : ''}`}
                            onClick={() => { if (!interpreting) reset() }}
                        >
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
                        <Text className='lottery-m__sect-gist'>{result.slip.gist}</Text>
                    </View>

                    {(result.interpretation || interpreting) && (
                        <View className='lottery-m__sect lottery-m__sect--ai'>
                            <View className='lottery-m__sect-h'>
                                <Text className='lottery-m__sect-h-txt'>详 参</Text>
                            </View>
                            {result.interpretation
                                ? <MarkdownView className='lottery-m__sect-md' content={result.interpretation} />
                                : <PendingText className='lottery-m__sect-pending'>正在详参，请稍候</PendingText>}
                        </View>
                    )}

                    {!result.interpretation && !interpreting && (
                        <Text className='lottery-m__sect-hint'>点击下方「解签」可获深度详参（消耗积分或免费额度）</Text>
                    )}

                    <Text className='lottery-m__sheet-note'>云开月出照前程，莫向签文问死生。心若安然，处处是好程</Text>
                </View>
            </View>
        </View>
    )
}
