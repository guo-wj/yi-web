import { View, Text, Image } from '@tarojs/components'

import {
    UPLOAD_TIPS,
    MOUNT_STATUS_PCT,
    LineGlyph,
    usePalmPanel,
    type HandSide
} from './shared'

import './mobile.scss'

export default function PalmPanelMobile () {
    const {
        phase,
        leftPath,
        rightPath,
        result,
        ready,
        loading,
        interpreting,
        hintText,
        submitLabel,
        lead,
        hands,
        chooseHand,
        submit,
        reset
    } = usePalmPanel()

    const renderDrop = (side: HandSide, path: string | null, cap: string, tag: string) => (
        <View className='palm-m__drop-col'>
            <Text className='palm-m__drop-cap'>{cap}</Text>
            <View
                className={`palm-m__drop ${path ? 'palm-m__drop--filled' : ''}`}
                onClick={() => void chooseHand(side)}
            >
                {path
                    ? (
                        <>
                            <Image className='palm-m__drop-img' src={path} mode='aspectFill' />
                            <View className='palm-m__drop-scrim' />
                            <Text className='palm-m__drop-tag'>{tag}</Text>
                            <Text className='palm-m__drop-redo'>重新选择</Text>
                        </>
                    )
                    : (
                        <>
                            <Text className='palm-m__drop-plus'>＋</Text>
                            <Text className='palm-m__drop-text'>点击上传</Text>
                        </>
                    )}
            </View>
        </View>
    )

    return (
        <View className='palm-m'>
            <View className='palm-m__scroll'>
                <View className='palm-m__head'>
                    <Text className='palm-m__title'>掌纹解析</Text>
                    <Text className='palm-m__subtitle'>左右掌纹 · 三线五丘 · 参详解读</Text>
                </View>

                {phase === 'upload' && (
                    <View className='palm-m__upload'>
                        <View className='palm-m__tip-card'>
                            <Text className='palm-m__tip-mark'>須知</Text>
                            <View className='palm-m__tip-list'>
                                {UPLOAD_TIPS.map((tip) => (
                                    <Text key={tip} className='palm-m__tip-li'>{tip}</Text>
                                ))}
                            </View>
                        </View>

                        <View className='palm-m__drop-grid'>
                            {renderDrop('left', leftPath, '左手掌纹', '左手')}
                            {renderDrop('right', rightPath, '右手掌纹', '右手')}
                        </View>

                        <Text className='palm-m__form-hint'>{hintText}</Text>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='palm-m__result'>
                        <View className='palm-m__subject'>
                            <Text className='palm-m__s-pill palm-m__s-pill--lead'>{lead}</Text>
                            {!!hands && <Text className='palm-m__s-pill'>呈掌 · {hands}</Text>}
                            {!!result.palm_type && <Text className='palm-m__s-pill'>掌型 · {result.palm_type}</Text>}
                            {!!result.complexion && <Text className='palm-m__s-pill'>气色 · {result.complexion}</Text>}
                        </View>

                        {interpreting && !result.overview && (
                            <View className='palm-m__card palm-m__loading-card'>
                                <Text className='palm-m__loading-hint'>正在参详三线五丘…</Text>
                            </View>
                        )}

                        {!!result.overview && (
                            <View className='palm-m__card palm-m__overview-card'>
                                <View className='palm-m__card-head'>
                                    <Text className='palm-m__card-title'>掌 象 综 述</Text>
                                </View>
                                <Text className='palm-m__overview-text'>{result.overview}</Text>
                            </View>
                        )}

                        {!!result.lines?.length && (
                            <>
                                <View className='palm-m__section-cap'>
                                    <Text className='palm-m__section-cap-txt'>三　线</Text>
                                </View>
                                <View className='palm-m__lines-stack'>
                                    {result.lines.map((ln) => (
                                        <View key={ln.key} className='palm-m__line-card'>
                                            <View className='palm-m__line-top'>
                                                <View className='palm-m__line-glyph'>
                                                    <LineGlyph liveKey={ln.key} className='palm-m__line-svg' />
                                                </View>
                                                <View className='palm-m__line-id'>
                                                    <Text className='palm-m__line-name'>{ln.name_cn}</Text>
                                                    <Text className='palm-m__line-en'>{ln.name_en}</Text>
                                                </View>
                                                <View className='palm-m__line-rate'>
                                                    <Text className='palm-m__rate-word'>{ln.attribute}</Text>
                                                    <View className='palm-m__dots'>
                                                        {[1, 2, 3, 4, 5].map((i) => (
                                                            <View
                                                                key={i}
                                                                className={`palm-m__dot ${i <= ln.score ? 'palm-m__dot--on' : ''}`}
                                                            />
                                                        ))}
                                                    </View>
                                                </View>
                                            </View>
                                            <Text className='palm-m__line-text'>{ln.description}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {!!result.mounts?.length && (
                            <>
                                <View className='palm-m__section-cap'>
                                    <Text className='palm-m__section-cap-txt'>五　丘</Text>
                                </View>
                                <View className='palm-m__mounts-stack'>
                                    {result.mounts.map((mt) => (
                                        <View key={mt.key} className='palm-m__mount-card'>
                                            <View className='palm-m__mount-top'>
                                                <Text className='palm-m__mount-orb'>{mt.icon_text}</Text>
                                                <View className='palm-m__mount-id'>
                                                    <Text className='palm-m__mount-name'>{mt.name_cn}</Text>
                                                    <Text className='palm-m__mount-domain'>{mt.keywords.join(' · ')}</Text>
                                                </View>
                                            </View>
                                            <View className='palm-m__mount-bar'>
                                                <Text className='palm-m__bar-word'>{mt.status}</Text>
                                                <View className='palm-m__bar-track'>
                                                    <View
                                                        className='palm-m__bar-fill'
                                                        style={{ width: `${MOUNT_STATUS_PCT[mt.status] ?? 58}%` }}
                                                    />
                                                </View>
                                            </View>
                                            <Text className='palm-m__mount-text'>{mt.description}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        <View className='palm-m__btn-back' onClick={reset}>
                            <Text className='palm-m__btn-back-txt'>重 新 上 传</Text>
                        </View>
                    </View>
                )}
            </View>

            {phase === 'upload' && (
                <View className='palm-m__dock'>
                    <View
                        className={`palm-m__submit ${(!ready || loading) ? 'palm-m__submit--disabled' : ''}`}
                        onClick={() => void submit()}
                    >
                        <Text className='palm-m__submit-txt'>{submitLabel}</Text>
                    </View>
                </View>
            )}
        </View>
    )
}
