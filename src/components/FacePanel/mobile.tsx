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

import './mobile.scss'

export default function FacePanelMobile () {
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

    return (
        <View className={`face-m ${phase === 'reading' ? 'face-m--reading' : ''}`}>
            <View className='face-m__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} disabled={loading} />}

                {phase === 'upload' && (
                    <View className='face-m__upload'>
                        <UploadTipsStrip tips={UPLOAD_TIPS} classPrefix='face-m' />

                        <View className='face-m__drop-grid-wrap'>
                            <View className='face-m__drop-labels'>
                                {SLOT_DEFS.map((def) => (
                                    <Text key={def.key} className='face-m__drop-cap'>{def.label}</Text>
                                ))}
                            </View>
                            <View className='face-m__drop-row-wrap'>
                                <View className='face-m__drop-row'>
                                    {Array.from({ length: MAX_IMAGES }, (_, i) => {
                                        const def = SLOT_DEFS[i]
                                        const path = paths[i]
                                        return (
                                            <View
                                                key={i}
                                                className={`face-m__drop ${path ? 'face-m__drop--filled' : ''} ${loading ? 'face-m__drop--disabled' : ''}`}
                                                onClick={() => { if (!loading) void chooseSlot(i) }}
                                            >
                                                {path
                                                    ? (
                                                        <>
                                                            <Image className='face-m__drop-img' src={path} mode='aspectFill' />
                                                            <View className='face-m__drop-scrim' />
                                                            <Text className='face-m__drop-tag'>{def?.tag ?? ''}</Text>
                                                            <View
                                                                className={`face-m__drop-clear ${loading ? 'face-m__drop-clear--disabled' : ''}`}
                                                                onClick={(e) => { if (!loading) clearSlot(i, e) }}
                                                            >
                                                                <Text className='face-m__drop-clear-txt'>×</Text>
                                                            </View>
                                                        </>
                                                    )
                                                    : (
                                                        <>
                                                            <Text className='face-m__drop-plus'>＋</Text>
                                                            <Text className='face-m__drop-text'>上传</Text>
                                                        </>
                                                    )}
                                            </View>
                                        )
                                    })}
                                </View>
                                {extracting && (
                                    <PanelExtractOverlay compact label='识象分析中' steps={['采象', '识相', '整理']} />
                                )}
                                {loading && !extracting && <View className='face-m__drop-lock' />}
                            </View>
                        </View>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='face-m__result'>
                        <View className='face-m__subject'>
                            <Text className='face-m__s-pill face-m__s-pill--lead'>{lead}</Text>
                            {!!uploadTags.length && (
                                <Text className='face-m__s-pill'>呈相 · {uploadTags.join(' / ')}</Text>
                            )}
                            {!!result.face_type && <Text className='face-m__s-pill'>面型 · {result.face_type}</Text>}
                            {!!result.complexion && <Text className='face-m__s-pill'>气色 · {result.complexion}</Text>}
                        </View>

                        {quota && quota.free_remaining > 0 && (
                            <Text className='face-m__quota'>
                                今日免费参详剩余 {quota.free_remaining} 次
                            </Text>
                        )}

                        {!hasFullReading && (
                            <FaceExtractPreview
                                result={result}
                                uploadTags={uploadTags}
                                classPrefix='face-m'
                                extractStreaming={extractStreaming}
                            />
                        )}

                        {hasFullReading && (
                            <View className='face-m__card face-m__overview-card'>
                                <View className='face-m__card-head'>
                                    <Text className='face-m__card-title'>面 相 综 述</Text>
                                </View>
                                <Text className='face-m__overview-text'>{result.overview}</Text>
                            </View>
                        )}

                        {hasFullReading && !!result.stops?.length && (
                            <>
                                <View className='face-m__section-cap'>
                                    <Text className='face-m__section-cap-txt'>三　停</Text>
                                </View>
                                <View className='face-m__lines-stack'>
                                    {result.stops.map((st, i) => (
                                        <View key={st.key} className='face-m__line-card'>
                                            <View className='face-m__line-glyph'>
                                                <StopGlyph idx={i} className='face-m__stop-svg' />
                                            </View>
                                            <View className='face-m__line-body'>
                                                <View className='face-m__line-top'>
                                                    <View className='face-m__line-id'>
                                                        <Text className='face-m__line-name'>{st.name_cn}</Text>
                                                        <Text className='face-m__line-en'>{st.region}</Text>
                                                    </View>
                                                    <View className='face-m__line-rate'>
                                                        <Text className='face-m__rate-word'>{st.attribute}</Text>
                                                        <View className='face-m__dots'>
                                                            {[1, 2, 3, 4, 5].map((n) => (
                                                                <View
                                                                    key={n}
                                                                    className={`face-m__dot ${n <= st.score ? 'face-m__dot--on' : ''}`}
                                                                />
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                                <Text className='face-m__line-text'>{st.description}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {hasFullReading && !!result.organs?.length && (
                            <>
                                <View className='face-m__section-cap'>
                                    <Text className='face-m__section-cap-txt'>五　官</Text>
                                </View>
                                <View className='face-m__mounts-stack'>
                                    {result.organs.map((og) => (
                                        <View key={og.key} className='face-m__mount-card'>
                                            <View className='face-m__mount-top'>
                                                <Text className='face-m__mount-orb'>{og.icon_text}</Text>
                                                <View className='face-m__mount-id'>
                                                    <Text className='face-m__mount-name'>{og.name_cn} · {og.office}</Text>
                                                    <Text className='face-m__mount-domain'>{og.keywords.join(' · ')}</Text>
                                                </View>
                                            </View>
                                            <View className='face-m__mount-bar'>
                                                <Text className='face-m__bar-word'>{og.status}</Text>
                                                <View className='face-m__bar-track'>
                                                    <View
                                                        className='face-m__bar-fill'
                                                        style={{ width: `${ORGAN_STATUS_PCT[og.status] ?? 58}%` }}
                                                    />
                                                </View>
                                            </View>
                                            <Text className='face-m__mount-text'>{og.description}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {hasFullReading && (
                            <ReadingClosingSection
                                classPrefix='face-m'
                                closingSummary={result.closing_summary}
                                adviceItems={result.advice_items}
                            />
                        )}
                    </View>
                )}
            </View>

            {phase === 'reading' && result && (
                <View className='face-m__dock face-m__dock--result'>
                    <View className='face-m__result-foot'>
                        <View
                            className={`face-m__btn-back ${loading ? 'face-m__btn-back--disabled' : ''}`}
                            onClick={() => { if (!loading) reset() }}
                        >
                            <Text className='face-m__btn-back-txt'>重新上传</Text>
                        </View>
                        {!hasFullReading && (
                            <View
                                className={`face-m__submit face-m__submit--inline ${loading ? 'face-m__submit--disabled' : ''}`}
                                onClick={() => { if (!loading) void onInterpret() }}
                            >
                                {submitLabelLoading
                                    ? <PendingText className='face-m__submit-txt face-m__submit-txt--compact'>{submitLabel.replace(/\s/g, '')}</PendingText>
                                    : <Text className='face-m__submit-txt face-m__submit-txt--compact'>参详解读</Text>}
                            </View>
                        )}
                    </View>
                </View>
            )}

            {phase === 'upload' && (
                <View className='face-m__dock'>
                    <Text className='face-m__form-hint'>
                        {extracting
                            ? '正在识读面象，请稍候'
                            : `已上传 ${uploadedCount} / ${MAX_IMAGES} 张 · ${hintText}`}
                    </Text>
                    <View
                        className={`face-m__submit ${(!ready || loading) ? 'face-m__submit--disabled' : ''}`}
                        onClick={() => { if (!loading) void submit() }}
                    >
                        {submitLabelLoading
                            ? <PendingText spaced className='face-m__submit-txt'>{submitLabel}</PendingText>
                            : <Text className='face-m__submit-txt'>{submitLabel}</Text>}
                    </View>
                </View>
            )}
        </View>
    )
}
