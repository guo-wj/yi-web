import { View, Text, Image } from '@tarojs/components'

import {
    MAX_IMAGES,
    SLOT_DEFS,
    UPLOAD_TIPS,
    ORGAN_STATUS_PCT,
    StopGlyph,
    useFacePanel
} from './shared'
import PanelBackButton from '@/components/PanelBackButton'
import PendingText from '@/components/LoadingDots'

import './mobile.scss'

export default function FacePanelMobile () {
    const {
        phase,
        paths,
        loading,
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
            <View key={index} className='face-m__drop-col'>
                <Text className='face-m__drop-cap'>{def?.label ?? `照片 ${index + 1}`}</Text>
                <View
                    className={`face-m__drop ${path ? 'face-m__drop--filled' : ''}`}
                    onClick={() => void chooseSlot(index)}
                >
                    {path
                        ? (
                            <>
                                <Image className='face-m__drop-img' src={path} mode='aspectFill' />
                                <View className='face-m__drop-scrim' />
                                <Text className='face-m__drop-tag'>{def?.tag ?? ''}</Text>
                                <View
                                    className='face-m__drop-clear'
                                    onClick={(e) => clearSlot(index, e)}
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
            </View>
        )
    }

    return (
        <View className='face-m'>
            <View className='face-m__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} />}
                <View className='face-m__head'>
                    <Text className='face-m__title'>面相解析</Text>
                    <Text className='face-m__subtitle'>五官气色 · 三停九部 · 参详解读</Text>
                </View>

                {phase === 'upload' && (
                    <View className='face-m__upload'>
                        <View className='face-m__tip-card'>
                            <Text className='face-m__tip-mark'>須知</Text>
                            <View className='face-m__tip-list'>
                                {UPLOAD_TIPS.map((tip) => (
                                    <Text key={tip} className='face-m__tip-li'>{tip}</Text>
                                ))}
                            </View>
                        </View>

                        <View className='face-m__drop-grid'>
                            {Array.from({ length: MAX_IMAGES }, (_, i) => renderDrop(i))}
                        </View>

                        <Text className='face-m__form-hint'>
                            已上传 {uploadedCount} / {MAX_IMAGES} 张 · {hintText}
                        </Text>
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
                                今日免费 AI 解读剩余 {quota.free_remaining} 次
                            </Text>
                        )}

                        {/* 面相综述 */}
                        <View className='face-m__card face-m__overview-card'>
                            <View className='face-m__card-head'>
                                <Text className='face-m__card-title'>面 相 综 述</Text>
                            </View>
                            <Text className='face-m__overview-text'>{result.overview}</Text>
                        </View>

                        {/* 三停 */}
                        {!!result.stops?.length && (
                            <>
                                <View className='face-m__section-cap'>
                                    <Text className='face-m__section-cap-txt'>三　停</Text>
                                </View>
                                <View className='face-m__lines-stack'>
                                    {result.stops.map((st, i) => (
                                        <View key={st.key} className='face-m__line-card'>
                                            <View className='face-m__line-top'>
                                                <View className='face-m__line-glyph'>
                                                    <StopGlyph idx={i} className='face-m__stop-svg' />
                                                </View>
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
                                    ))}
                                </View>
                            </>
                        )}

                        {/* 五官 */}
                        {!!result.organs?.length && (
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

                        <View className='face-m__result-foot'>
                            <View className='face-m__btn-back' onClick={reset}>
                                <Text className='face-m__btn-back-txt'>重 新 上 传</Text>
                            </View>
                            {!hasFullReading && !loading && (
                                <View className='face-m__submit face-m__submit--inline' onClick={() => void onInterpret()}>
                                    {submitLabelLoading
                                        ? <PendingText spaced className='face-m__submit-txt'>{submitLabel}</PendingText>
                                        : <Text className='face-m__submit-txt'>{submitLabel}</Text>}
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>

            {phase === 'upload' && (
                <View className='face-m__dock'>
                    <View
                        className={`face-m__submit ${(!ready || loading) ? 'face-m__submit--disabled' : ''}`}
                        onClick={() => void submit()}
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
