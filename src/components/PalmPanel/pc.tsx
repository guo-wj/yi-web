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

    const renderDrop = (side: HandSide, path: string | null, cap: string, tag: string) => (
        <View className='palm-panel__drop-col'>
            <Text className='palm-panel__drop-cap'>{cap}</Text>
            <View
                className={`palm-panel__drop ${path ? 'palm-panel__drop--filled' : ''} ${loading ? 'palm-panel__drop--disabled' : ''}`}
                onClick={() => { if (!loading) void chooseHand(side) }}
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
                {canGoBack && <PanelBackButton onClick={goBack} disabled={loading} />}

                {phase === 'upload' && (
                    <View className='palm-panel__upload'>
                        <UploadTipsStrip tips={UPLOAD_TIPS} classPrefix='palm-panel' />

                        <View className='palm-panel__drop-grid-wrap'>
                            <View className='palm-panel__drop-grid'>
                                {renderDrop('left', leftPath, '左手掌纹', '左手')}
                                {renderDrop('right', rightPath, '右手掌纹', '右手')}
                            </View>
                            {loadingStage === 'extract' && (
                                <PanelExtractOverlay label='掌象识别中' steps={['采象', '识纹', '整理']} />
                            )}
                            {loading && loadingStage !== 'extract' && <View className='palm-panel__drop-lock' />}
                        </View>

                        <Text className='palm-panel__form-hint'>
                            {loadingStage === 'extract' ? '正在识读掌象，请稍候' : hintText}
                        </Text>

                        <View
                            className={`palm-panel__submit ${(!ready || loading) ? 'palm-panel__submit--disabled' : ''}`}
                            onClick={() => { if (!loading) void submit() }}
                        >
                            {submitLabelLoading
                                ? <PendingText spaced className='palm-panel__submit-txt'>{submitLabel}</PendingText>
                                : <Text className='palm-panel__submit-txt'>{submitLabel}</Text>}
                        </View>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='palm-panel__result'>
                        <View className='palm-panel__subject'>
                            <Text className='palm-panel__s-pill palm-panel__s-pill--lead'>{lead}</Text>
                            {!!hands && <Text className='palm-panel__s-pill'>呈掌 · {hands}</Text>}
                            {!!result.palm_type && <Text className='palm-panel__s-pill'>掌型 · {result.palm_type}</Text>}
                            {!!result.palm_shape && result.palm_shape !== result.palm_type && (
                                <Text className='palm-panel__s-pill'>形质 · {result.palm_shape}</Text>
                            )}
                            {!!result.complexion && <Text className='palm-panel__s-pill'>气色 · {result.complexion}</Text>}
                        </View>

                        {quota && quota.free_remaining > 0 && (
                            <Text className='palm-panel__quota'>
                                今日免费参详剩余 {quota.free_remaining} 次
                            </Text>
                        )}

                        {!hasFullReading && (
                            <PalmExtractPreview
                                result={result}
                                classPrefix='palm-panel'
                                extractStreaming={extractStreaming}
                            />
                        )}

                        {hasFullReading && (
                            <View className='palm-panel__card palm-panel__overview-card'>
                                <View className='palm-panel__card-head'>
                                    <Text className='palm-panel__card-title'>掌 象 综 述</Text>
                                </View>
                                <Text className='palm-panel__overview-text'>{result.overview}</Text>
                            </View>
                        )}

                        {hasFullReading && !!result.lines?.length && (
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

                        {hasFullReading && !!result.mounts?.length && (
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

                        {hasFullReading && (
                            <ReadingClosingSection
                                classPrefix='palm-panel'
                                closingSummary={result.closing_summary}
                                adviceItems={result.advice_items}
                            />
                        )}

                        <View className='palm-panel__result-foot'>
                            <View
                                className={`palm-panel__btn-back ${loading ? 'palm-panel__btn-back--disabled' : ''}`}
                                onClick={() => { if (!loading) reset() }}
                            >
                                <Text className='palm-panel__btn-back-txt'>重 新 上 传</Text>
                            </View>
                            {!hasFullReading && (
                                <View
                                    className={`palm-panel__submit palm-panel__submit--inline ${loading ? 'palm-panel__submit--disabled' : ''}`}
                                    onClick={() => { if (!loading) void onInterpret() }}
                                >
                                    {submitLabelLoading
                                        ? <PendingText spaced className='palm-panel__submit-txt'>{submitLabel}</PendingText>
                                        : <Text className='palm-panel__submit-txt'>{submitLabel}</Text>}
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </View>
    )
}
