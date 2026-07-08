import { View, Text, Image } from '@tarojs/components'

import {
    UPLOAD_TIPS,
    MOUNT_STATUS_PCT,
    LineGlyph,
    PalmExtractPreview,
    usePalmPanel,
    type HandSide
} from './shared'
import UploadTipsStrip from '@/components/UploadTipsStrip'
import PanelBackButton from '@/components/PanelBackButton'
import PanelExtractOverlay from '@/components/PanelExtractOverlay'
import PendingText from '@/components/LoadingDots'
import ReadingClosingSection from '@/components/ReadingClosing'

import './mobile.scss'

export default function PalmPanelMobile () {
    const {
        phase,
        leftPath,
        rightPath,
        result,
        quota,
        ready,
        loading,
        loadingStage,
        extractStreaming,
        hasFullReading,
        hintText,
        submitLabel,
        submitLabelLoading,
        lead,
        hands,
        chooseHand,
        submit,
        onInterpret,
        reset,
        canGoBack,
        goBack
    } = usePalmPanel()

    const renderDrop = (side: HandSide, path: string | null, tag: string) => (
        <View
            className={`palm-m__drop ${path ? 'palm-m__drop--filled' : ''} ${loading ? 'palm-m__drop--disabled' : ''}`}
            onClick={() => { if (!loading) void chooseHand(side) }}
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
    )

    return (
        <View className={`palm-m ${phase === 'reading' ? 'palm-m--reading' : ''}`}>
            <View className='palm-m__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} disabled={loading} />}

                {phase === 'upload' && (
                    <View className='palm-m__upload'>
                        <UploadTipsStrip tips={UPLOAD_TIPS} classPrefix='palm-m' />

                        <View className='palm-m__drop-grid-wrap'>
                            <View className='palm-m__drop-labels'>
                                <Text className='palm-m__drop-cap'>左手掌纹</Text>
                                <Text className='palm-m__drop-cap'>右手掌纹</Text>
                            </View>
                            <View className='palm-m__drop-row-wrap'>
                                <View className='palm-m__drop-row'>
                                    {renderDrop('left', leftPath, '左手')}
                                    {renderDrop('right', rightPath, '右手')}
                                </View>
                                {loadingStage === 'extract' && (
                                    <PanelExtractOverlay compact label='掌象识别中' steps={['采象', '识纹', '整理']} />
                                )}
                                {loading && loadingStage !== 'extract' && <View className='palm-m__drop-lock' />}
                            </View>
                        </View>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='palm-m__result'>
                        <View className='palm-m__subject'>
                            <Text className='palm-m__s-pill palm-m__s-pill--lead'>{lead}</Text>
                            {!!hands && <Text className='palm-m__s-pill'>呈掌 · {hands}</Text>}
                            {!!result.palm_type && <Text className='palm-m__s-pill'>掌型 · {result.palm_type}</Text>}
                            {!!result.palm_shape && result.palm_shape !== result.palm_type && (
                                <Text className='palm-m__s-pill'>形质 · {result.palm_shape}</Text>
                            )}
                            {!!result.complexion && <Text className='palm-m__s-pill'>气色 · {result.complexion}</Text>}
                        </View>

                        {quota && quota.free_remaining > 0 && (
                            <Text className='palm-m__quota'>
                                今日免费参详剩余 {quota.free_remaining} 次
                            </Text>
                        )}

                        {!hasFullReading && (
                            <PalmExtractPreview
                                result={result}
                                classPrefix='palm-m'
                                extractStreaming={extractStreaming}
                            />
                        )}

                        {hasFullReading && (
                            <View className='palm-m__card palm-m__overview-card'>
                                <View className='palm-m__card-head'>
                                    <Text className='palm-m__card-title'>掌 象 综 述</Text>
                                </View>
                                <Text className='palm-m__overview-text'>{result.overview}</Text>
                            </View>
                        )}

                        {hasFullReading && !!result.lines?.length && (
                            <>
                                <View className='palm-m__section-cap'>
                                    <Text className='palm-m__section-cap-txt'>三　线</Text>
                                </View>
                                <View className='palm-m__lines-stack'>
                                    {result.lines.map((ln) => (
                                        <View key={ln.key} className='palm-m__line-card'>
                                            <View className='palm-m__line-glyph'>
                                                <LineGlyph liveKey={ln.key} className='palm-m__line-svg' />
                                            </View>
                                            <View className='palm-m__line-body'>
                                                <View className='palm-m__line-top'>
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
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {hasFullReading && !!result.mounts?.length && (
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

                        {hasFullReading && (
                            <ReadingClosingSection
                                classPrefix='palm-m'
                                closingSummary={result.closing_summary}
                                adviceItems={result.advice_items}
                            />
                        )}
                    </View>
                )}
            </View>

            {phase === 'reading' && result && (
                <View className='palm-m__dock palm-m__dock--result'>
                    <View className='palm-m__result-foot'>
                        <View
                            className={`palm-m__btn-back ${loading ? 'palm-m__btn-back--disabled' : ''}`}
                            onClick={() => { if (!loading) reset() }}
                        >
                            <Text className='palm-m__btn-back-txt'>重新上传</Text>
                        </View>
                        {!hasFullReading && (
                            <View
                                className={`palm-m__submit palm-m__submit--inline ${loading ? 'palm-m__submit--disabled' : ''}`}
                                onClick={() => { if (!loading) void onInterpret() }}
                            >
                                {submitLabelLoading
                                    ? <PendingText className='palm-m__submit-txt palm-m__submit-txt--compact'>{submitLabel.replace(/\s/g, '')}</PendingText>
                                    : <Text className='palm-m__submit-txt palm-m__submit-txt--compact'>参详解读</Text>}
                            </View>
                        )}
                    </View>
                </View>
            )}

            {phase === 'upload' && (
                <View className='palm-m__dock'>
                    <Text className='palm-m__form-hint'>
                        {loadingStage === 'extract' ? '正在识读掌象，请稍候' : hintText}
                    </Text>
                    <View
                        className={`palm-m__submit ${(!ready || loading) ? 'palm-m__submit--disabled' : ''}`}
                        onClick={() => { if (!loading) void submit() }}
                    >
                        {submitLabelLoading
                            ? <PendingText spaced className='palm-m__submit-txt'>{submitLabel}</PendingText>
                            : <Text className='palm-m__submit-txt'>{submitLabel}</Text>}
                    </View>
                </View>
            )}
        </View>
    )
}
