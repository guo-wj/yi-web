import { View, Text, Image } from '@tarojs/components'

import {
    UPLOAD_TIPS,
    MOUNT_STATUS_PCT,
    LineGlyph,
    usePalmPanel,
    type HandSide
} from './shared'
import PanelBackButton from '@/components/PanelBackButton'

import './index.scss'

export default function PalmPanelPC () {
    const {
        phase,
        leftPath,
        rightPath,
        result,
        quota,
        ready,
        loading,
        interpreting,
        hasFullReading,
        hintText,
        submitLabel,
        lead,
        hands,
        chooseHand,
        submit,
        onInterpret,
        reset,
        canGoBack,
        goBack
    } = usePalmPanel()

    const renderDrop = (side: HandSide, path: string | null, cap: string, tag: string) => (
        <View className='palm-panel__drop-col'>
            <Text className='palm-panel__drop-cap'>{cap}</Text>
            <View
                className={`palm-panel__drop ${path ? 'palm-panel__drop--filled' : ''}`}
                onClick={() => void chooseHand(side)}
            >
                {path
                    ? (
                        <>
                            <Image className='palm-panel__drop-img' src={path} mode='aspectFill' />
                            <View className='palm-panel__drop-scrim' />
                            <Text className='palm-panel__drop-tag'>{tag}</Text>
                            <Text className='palm-panel__drop-redo'>重新选择</Text>
                        </>
                    )
                    : (
                        <>
                            <Text className='palm-panel__drop-plus'>＋</Text>
                            <Text className='palm-panel__drop-text'>点击上传</Text>
                        </>
                    )}
            </View>
        </View>
    )

    return (
        <View className='palm-panel'>
            <View className='palm-panel__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} />}
                <View className='palm-panel__head'>
                    <Text className='palm-panel__title'>掌纹解析</Text>
                    <Text className='palm-panel__subtitle'>左右掌纹 · 三线五丘 · 参详解读</Text>
                </View>

                {phase === 'upload' && (
                    <View className='palm-panel__upload'>
                        <View className='palm-panel__tip-card'>
                            <Text className='palm-panel__tip-mark'>須知</Text>
                            <View className='palm-panel__tip-list'>
                                {UPLOAD_TIPS.map((tip) => (
                                    <Text key={tip} className='palm-panel__tip-li'>{tip}</Text>
                                ))}
                            </View>
                        </View>

                        <View className='palm-panel__drop-grid'>
                            {renderDrop('left', leftPath, '左手掌纹', '左手')}
                            {renderDrop('right', rightPath, '右手掌纹', '右手')}
                        </View>

                        <View
                            className={`palm-panel__submit ${(!ready || loading) ? 'palm-panel__submit--disabled' : ''}`}
                            onClick={() => void submit()}
                        >
                            <Text className='palm-panel__submit-txt'>{submitLabel}</Text>
                        </View>
                        <Text className='palm-panel__form-hint'>{hintText}</Text>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='palm-panel__result'>
                        <View className='palm-panel__subject'>
                            <Text className='palm-panel__s-pill palm-panel__s-pill--lead'>{lead}</Text>
                            {!!hands && <Text className='palm-panel__s-pill'>呈掌 · {hands}</Text>}
                            {!!result.palm_type && <Text className='palm-panel__s-pill'>掌型 · {result.palm_type}</Text>}
                            {!!result.complexion && <Text className='palm-panel__s-pill'>气色 · {result.complexion}</Text>}
                        </View>

                        {quota && quota.free_remaining > 0 && (
                            <Text className='palm-panel__quota'>
                                今日免费 AI 解读剩余 {quota.free_remaining} 次
                            </Text>
                        )}

                        {interpreting && !result.overview && (
                            <View className='palm-panel__card palm-panel__loading-card'>
                                <Text className='palm-panel__loading-hint'>正在参详三线五丘…</Text>
                            </View>
                        )}

                        {!!result.overview && (
                            <View className='palm-panel__card palm-panel__overview-card'>
                                <View className='palm-panel__card-head'>
                                    <Text className='palm-panel__card-title'>掌 象 综 述</Text>
                                </View>
                                <Text className='palm-panel__overview-text'>{result.overview}</Text>
                            </View>
                        )}

                        {!!result.lines?.length && (
                            <>
                                <View className='palm-panel__section-cap'>
                                    <Text className='palm-panel__section-cap-txt'>三　线</Text>
                                </View>
                                <View className='palm-panel__lines-stack'>
                                    {result.lines.map((ln) => (
                                        <View key={ln.key} className='palm-panel__line-card'>
                                            <View className='palm-panel__line-glyph'>
                                                <LineGlyph liveKey={ln.key} />
                                            </View>
                                            <View className='palm-panel__line-body'>
                                                <View className='palm-panel__line-top'>
                                                    <Text className='palm-panel__line-name'>{ln.name_cn}</Text>
                                                    <Text className='palm-panel__line-en'>{ln.name_en}</Text>
                                                    <View className='palm-panel__line-rate'>
                                                        <Text className='palm-panel__rate-word'>{ln.attribute}</Text>
                                                        <View className='palm-panel__dots'>
                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                <View
                                                                    key={i}
                                                                    className={`palm-panel__dot ${i <= ln.score ? 'palm-panel__dot--on' : ''}`}
                                                                />
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                                <Text className='palm-panel__line-text'>{ln.description}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {!!result.mounts?.length && (
                            <>
                                <View className='palm-panel__section-cap'>
                                    <Text className='palm-panel__section-cap-txt'>五　丘</Text>
                                </View>
                                <View className='palm-panel__mounts-grid'>
                                    {result.mounts.map((mt) => (
                                        <View key={mt.key} className='palm-panel__mount-card'>
                                            <View className='palm-panel__mount-top'>
                                                <Text className='palm-panel__mount-orb'>{mt.icon_text}</Text>
                                                <View className='palm-panel__mount-id'>
                                                    <Text className='palm-panel__mount-name'>{mt.name_cn}</Text>
                                                    <Text className='palm-panel__mount-domain'>{mt.keywords.join(' · ')}</Text>
                                                </View>
                                                <View className='palm-panel__mount-bar'>
                                                    <Text className='palm-panel__bar-word'>{mt.status}</Text>
                                                    <View className='palm-panel__bar-track'>
                                                        <View
                                                            className='palm-panel__bar-fill'
                                                            style={{ width: `${MOUNT_STATUS_PCT[mt.status] ?? 58}%` }}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            <Text className='palm-panel__mount-text'>{mt.description}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {!hasFullReading && !loading && (
                            <View
                                className='palm-panel__submit'
                                onClick={() => void onInterpret()}
                            >
                                <Text className='palm-panel__submit-txt'>{submitLabel}</Text>
                            </View>
                        )}

                        <View className='palm-panel__btn-back' onClick={reset}>
                            <Text className='palm-panel__btn-back-txt'>重 新 上 传</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    )
}
