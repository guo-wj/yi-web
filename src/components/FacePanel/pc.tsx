import { View, Text, Image } from '@tarojs/components'

import {
    MAX_IMAGES,
    SLOT_DEFS,
    UPLOAD_TIPS,
    ORGAN_STATUS_PCT,
    StopGlyph,
    FaceExtractPreview,
    useFacePanel
} from './shared'
import UploadTipsStrip from '@/components/UploadTipsStrip'
import PanelBackButton from '@/components/PanelBackButton'
import PanelExtractOverlay from '@/components/PanelExtractOverlay'
import PendingText from '@/components/LoadingDots'
import ReadingClosingSection from '@/components/ReadingClosing'

import './index.scss'

export default function FacePanelPC () {
    const {
        phase,
        paths,
        loading,
        extracting,
        extractStreaming,
        result,
        uploadTags,
        quota,
        uploadedCount,
        ready,
        hasFullReading,
        hintText,
        lead,
        submitLabel,
        submitLabelLoading,
        chooseSlot,
        clearSlot,
        submit,
        onInterpret,
        reset,
        canGoBack,
        goBack
    } = useFacePanel()

    const renderDrop = (index: number) => {
        const def = SLOT_DEFS[index]
        const path = paths[index]
        return (
            <View key={index} className='face-panel__drop-col'>
                <Text className='face-panel__drop-cap'>{def?.label ?? `照片 ${index + 1}`}</Text>
                <View
                    className={`face-panel__drop ${path ? 'face-panel__drop--filled' : ''} ${loading ? 'face-panel__drop--disabled' : ''}`}
                    onClick={() => { if (!loading) void chooseSlot(index) }}
                >
                    {path
                        ? (
                            <>
                                <Image className='face-panel__drop-img' src={path} mode='aspectFill' />
                                <View className='face-panel__drop-scrim' />
                                <Text className='face-panel__drop-tag'>{def?.tag ?? ''}</Text>
                                <Text className='face-panel__drop-redo'>重新选择</Text>
                                <View
                                    className={`face-panel__drop-clear ${loading ? 'face-panel__drop-clear--disabled' : ''}`}
                                    onClick={(e) => { if (!loading) clearSlot(index, e) }}
                                >
                                    <Text className='face-panel__drop-clear-txt'>×</Text>
                                </View>
                            </>
                        )
                        : (
                            <>
                                <Text className='face-panel__drop-plus'>＋</Text>
                                <Text className='face-panel__drop-text'>点击上传</Text>
                            </>
                        )}
                </View>
            </View>
        )
    }

    return (
        <View className='face-panel'>
            <View className='face-panel__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} disabled={loading} />}

                {phase === 'upload' && (
                    <View className='face-panel__upload'>
                        <UploadTipsStrip tips={UPLOAD_TIPS} classPrefix='face-panel' />

                        <View className='face-panel__drop-grid-wrap'>
                            <View className='face-panel__drop-grid'>
                                {Array.from({ length: MAX_IMAGES }, (_, i) => renderDrop(i))}
                            </View>
                            {extracting && (
                                <PanelExtractOverlay label='识象分析中' steps={['采象', '识相', '整理']} />
                            )}
                            {loading && !extracting && <View className='face-panel__drop-lock' />}
                        </View>

                        <Text className='face-panel__form-hint'>
                            {extracting
                                ? '正在识读面象，请稍候'
                                : `已上传 ${uploadedCount} / ${MAX_IMAGES} 张 · ${hintText}`}
                        </Text>

                        <View
                            className={`face-panel__submit ${(!ready || loading) ? 'face-panel__submit--disabled' : ''}`}
                            onClick={() => { if (!loading) void submit() }}
                        >
                            {submitLabelLoading
                                ? <PendingText spaced className='face-panel__submit-txt'>{submitLabel}</PendingText>
                                : <Text className='face-panel__submit-txt'>{submitLabel}</Text>}
                        </View>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='face-panel__result'>
                        <View className='face-panel__subject'>
                            <Text className='face-panel__s-pill face-panel__s-pill--lead'>{lead}</Text>
                            {!!uploadTags.length && (
                                <Text className='face-panel__s-pill'>呈相 · {uploadTags.join(' / ')}</Text>
                            )}
                            {!!result.face_type && <Text className='face-panel__s-pill'>面型 · {result.face_type}</Text>}
                            {!!result.complexion && <Text className='face-panel__s-pill'>气色 · {result.complexion}</Text>}
                        </View>

                        {quota && quota.free_remaining > 0 && (
                            <Text className='face-panel__quota'>
                                今日免费参详剩余 {quota.free_remaining} 次
                            </Text>
                        )}

                        {!hasFullReading && (
                            <FaceExtractPreview
                                result={result}
                                uploadTags={uploadTags}
                                classPrefix='face-panel'
                                extractStreaming={extractStreaming}
                            />
                        )}

                        {hasFullReading && (
                            <View className='face-panel__card face-panel__overview-card'>
                                <View className='face-panel__card-head'>
                                    <Text className='face-panel__card-title'>面 相 综 述</Text>
                                </View>
                                <Text className='face-panel__overview-text'>{result.overview}</Text>
                            </View>
                        )}

                        {hasFullReading && !!result.stops?.length && (
                            <>
                                <View className='face-panel__section-cap'>
                                    <Text className='face-panel__section-cap-txt'>三　停</Text>
                                </View>
                                <View className='face-panel__lines-stack'>
                                    {result.stops.map((st, i) => (
                                        <View key={st.key} className='face-panel__line-card'>
                                            <View className='face-panel__line-glyph'>
                                                <StopGlyph idx={i} />
                                            </View>
                                            <View className='face-panel__line-body'>
                                                <View className='face-panel__line-top'>
                                                    <View className='face-panel__line-id'>
                                                        <Text className='face-panel__line-name'>{st.name_cn}</Text>
                                                        <Text className='face-panel__line-en'>{st.region}</Text>
                                                    </View>
                                                    <View className='face-panel__line-rate'>
                                                        <Text className='face-panel__rate-word'>{st.attribute}</Text>
                                                        <View className='face-panel__dots'>
                                                            {[1, 2, 3, 4, 5].map((n) => (
                                                                <View
                                                                    key={n}
                                                                    className={`face-panel__dot ${n <= st.score ? 'face-panel__dot--on' : ''}`}
                                                                />
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                                <Text className='face-panel__line-text'>{st.description}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {hasFullReading && !!result.organs?.length && (
                            <>
                                <View className='face-panel__section-cap'>
                                    <Text className='face-panel__section-cap-txt'>五　官</Text>
                                </View>
                                <View className='face-panel__mounts-grid'>
                                    {result.organs.map((og, i) => (
                                        <View
                                            key={og.key}
                                            className={`face-panel__mount-card ${i === result.organs.length - 1 && result.organs.length % 2 === 1 ? 'face-panel__mount-card--span2' : ''}`}
                                        >
                                            <View className='face-panel__mount-top'>
                                                <Text className='face-panel__mount-orb'>{og.icon_text}</Text>
                                                <View className='face-panel__mount-id'>
                                                    <Text className='face-panel__mount-name'>{og.name_cn} · {og.office}</Text>
                                                    <Text className='face-panel__mount-domain'>{og.keywords.join(' · ')}</Text>
                                                </View>
                                                <View className='face-panel__mount-bar'>
                                                    <Text className='face-panel__bar-word'>{og.status}</Text>
                                                    <View className='face-panel__bar-track'>
                                                        <View
                                                            className='face-panel__bar-fill'
                                                            style={{ width: `${ORGAN_STATUS_PCT[og.status] ?? 58}%` }}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            <Text className='face-panel__mount-text'>{og.description}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {hasFullReading && (
                            <ReadingClosingSection
                                classPrefix='face-panel'
                                closingSummary={result.closing_summary}
                                adviceItems={result.advice_items}
                            />
                        )}

                        <View className='face-panel__result-foot'>
                            <View
                                className={`face-panel__btn-back ${loading ? 'face-panel__btn-back--disabled' : ''}`}
                                onClick={() => { if (!loading) reset() }}
                            >
                                <Text className='face-panel__btn-back-txt'>重 新 上 传</Text>
                            </View>
                            {!hasFullReading && (
                                <View
                                    className={`face-panel__submit face-panel__submit--inline ${loading ? 'face-panel__submit--disabled' : ''}`}
                                    onClick={() => { if (!loading) void onInterpret() }}
                                >
                                    {submitLabelLoading
                                        ? <PendingText spaced className='face-panel__submit-txt'>{submitLabel}</PendingText>
                                        : <Text className='face-panel__submit-txt'>{submitLabel}</Text>}
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </View>
    )
}
