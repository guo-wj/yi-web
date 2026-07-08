import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchPointsQuota, type PointsQuota } from '@/services/pointsApi'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { isLoggedIn } from '@/utils/auth'
import { ensurePoints, refundOnFailure } from '@/utils/ensurePoints'
import { openAlertModal } from '@/utils/confirmModal'
import {
    postFaceExtract,
    postFaceInterpret,
    type FaceAnalyzeResponse,
    type FaceExtractResponse,
    type FaceOrganPreview,
    type FaceSlot,
    type FaceOrganKey,
    type FaceStopKey,
    type FaceStopPreview,
    type FaceStructuredBody
} from '@/services/faceApi'
import { revealExtractPreview, revealStructuredReading } from '@/utils/streamStructuredReading'

export type Phase = 'upload' | 'reading'

export const MAX_IMAGES = 3

export const SLOT_DEFS: ReadonlyArray<{ key: FaceSlot; label: string; tag: string }> = [
    { key: 'front', label: '正面照', tag: '正面' },
    { key: 'side', label: '侧面照', tag: '侧面' },
    { key: 'extra', label: '补充角度', tag: '补充' }
]

export const UPLOAD_TIPS = [
    '请在自然光下拍摄，面部无遮挡',
    '正面平视镜头，五官清晰可见',
    '最多上传 3 张，至少 1 张'
]

/** 五官状态 → 进度条占比 */
export const ORGAN_STATUS_PCT: Record<string, number> = {
    旺: 92, 盛: 76, 匀: 58, 平: 44, 弱: 30
}

/** 三停在脸廓上的高亮区间（上/中/下停） */
export const STOP_BANDS: [number, number][] = [[10, 36], [36, 64], [64, 90]]
export const FACE_OUTLINE = 'M48 8 C68 8 78 24 78 46 C78 72 64 90 48 90 C32 90 18 72 18 46 C18 24 28 8 48 8 Z'

async function pickFaceImage (): Promise<string | null> {
    try {
        const res = await Taro.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera']
        })
        return res.tempFilePaths[0] ?? null
    } catch {
        return null
    }
}

function collectUploads (paths: (string | null)[]) {
    return paths
        .map((path, index) => {
            if (!path) return null
            const slot = SLOT_DEFS[index]
            if (!slot) return null
            return { path, slot: slot.key, label: slot.label, index }
        })
        .filter((item): item is { path: string; slot: FaceSlot; label: string; index: number } => Boolean(item))
}

/** 脸廓 + 当前停区高亮的图形示意 */
export function StopGlyph ({ idx, className = 'face-panel__stop-svg' }: { idx: number; className?: string }) {
    const [y0, y1] = STOP_BANDS[idx] ?? STOP_BANDS[0]
    const cid = `face-stop-clip-${idx}`
    return (
        <svg className={className} viewBox='0 0 96 96' aria-hidden='true'>
            <defs>
                <clipPath id={cid}>
                    <path d={FACE_OUTLINE} />
                </clipPath>
            </defs>
            <g clipPath={`url(#${cid})`}>
                <rect className='live-fill' x={0} y={y0} width={96} height={y1 - y0} />
                <line className='face-stroke' x1={0} y1={36} x2={96} y2={36} />
                <line className='face-stroke' x1={0} y1={64} x2={96} y2={64} />
                <line className='live-stroke' x1={0} y1={y0} x2={96} y2={y0} />
                <line className='live-stroke' x1={0} y1={y1} x2={96} y2={y1} />
            </g>
            <path className='face-stroke' d={FACE_OUTLINE} />
        </svg>
    )
}

interface FaceExtractPreviewProps {
    result: FaceAnalyzeResponse
    uploadTags: string[]
    classPrefix?: 'face-panel' | 'face-m'
    extractStreaming?: boolean
}

/** 识别完成、解读前的丰富预览（三停五官初识 + 各角度摘要） */
export function FaceExtractPreview ({ result, uploadTags, classPrefix = 'face-panel', extractStreaming = false }: FaceExtractPreviewProps) {
    const p = classPrefix
    const stops = result.preview_stops ?? []
    const organs = result.preview_organs ?? []
    const summaries = result.summaries ?? []
    const showOverview = extractStreaming || !!result.extract_overview
    const showPhotoSummaries = summaries.length > 0

    return (
        <View className={`${p}__extract-preview`}>
            {showOverview && (
                <View className={`${p}__card ${p}__overview-card`}>
                    <View className={`${p}__card-head`}>
                        <Text className={`${p}__card-title`}>识 象 摘 要</Text>
                    </View>
                    <Text className={`${p}__overview-text`}>{result.extract_overview}</Text>
                </View>
            )}

            {showPhotoSummaries && (
                <View className={`${p}__photo-summaries`}>
                    {summaries.map((text, i) => (
                        <View key={i} className={`${p}__photo-summary-card`}>
                            <Text className={`${p}__photo-summary-label`}>
                                {uploadTags[i] ?? `照片 ${i + 1}`}
                            </Text>
                            <Text className={`${p}__photo-summary-text`}>{text}</Text>
                        </View>
                    ))}
                </View>
            )}

            {!!stops.length && (
                <>
                    <View className={`${p}__section-cap`}>
                        <Text className={`${p}__section-cap-txt`}>三 停 初 识</Text>
                    </View>
                    <View className={`${p}__lines-stack`}>
                        {stops.map((st: FaceStopPreview, i) => (
                            <View key={st.key} className={`${p}__line-card ${p}__line-card--preview`}>
                                <View className={`${p}__line-glyph`}>
                                    <StopGlyph idx={i} className={`${p}__stop-svg`} />
                                </View>
                                <View className={`${p}__line-body`}>
                                    <View className={`${p}__line-top`}>
                                        <Text className={`${p}__line-name`}>{st.name_cn}</Text>
                                        <Text className={`${p}__line-en`}>{st.region}</Text>
                                        <Text className={`${p}__rate-word`}>{st.attribute}</Text>
                                    </View>
                                    {!!st.hint && (
                                        <Text className={`${p}__line-text`}>{st.hint}</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            )}

            {!!organs.length && (
                <>
                    <View className={`${p}__section-cap`}>
                        <Text className={`${p}__section-cap-txt`}>五 官 初 览</Text>
                    </View>
                    <View className={`${p}__mounts-grid`}>
                        {organs.map((og: FaceOrganPreview) => (
                            <View key={og.key} className={`${p}__mount-card ${p}__mount-card--preview`}>
                                <View className={`${p}__mount-top`}>
                                    <Text className={`${p}__mount-orb`}>{og.icon_text}</Text>
                                    <View className={`${p}__mount-id`}>
                                        <Text className={`${p}__mount-name`}>{og.name_cn} · {og.office}</Text>
                                        <Text className={`${p}__mount-domain`}>{og.keywords.join(' · ')}</Text>
                                    </View>
                                    <View className={`${p}__mount-bar`}>
                                        <Text className={`${p}__bar-word`}>{og.status}</Text>
                                        <View className={`${p}__bar-track`}>
                                            <View
                                                className={`${p}__bar-fill`}
                                                style={{ width: `${ORGAN_STATUS_PCT[og.status] ?? 58}%` }}
                                            />
                                        </View>
                                    </View>
                                </View>
                                {!!og.hint && (
                                    <Text className={`${p}__mount-text`}>{og.hint}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                </>
            )}
        </View>
    )
}

/** 面相面板的全部状态与交互逻辑，PC 与移动端视图共用 */
export function useFacePanel () {
    const [phase, setPhase] = useState<Phase>('upload')
    const [paths, setPaths] = useState<(string | null)[]>([null, null, null])
    const [extracting, setExtracting] = useState(false)
    const [extractStreaming, setExtractStreaming] = useState(false)
    const [interpreting, setInterpreting] = useState(false)
    const [streaming, setStreaming] = useState(false)
    const [result, setResult] = useState<FaceAnalyzeResponse | null>(null)
    const [uploadTags, setUploadTags] = useState<string[]>([])
    const [quota, setQuota] = useState<PointsQuota | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const extractRef = useRef<FaceExtractResponse | null>(null)
    const uploadMetaRef = useRef<{ paths: string[]; slots: FaceSlot[] } | null>(null)
    const interpretingRef = useRef(false)
    const extractingRef = useRef(false)
    const pickInFlightRef = useRef(false)

    useEffect(() => {
        extractingRef.current = extracting
    }, [extracting])

    useEffect(() => {
        interpretingRef.current = interpreting
    }, [interpreting])

    useEffect(() => {
        if (!isLoggedIn()) {
            setQuota(null)
            return
        }
        void fetchPointsQuota('face').then(setQuota).catch(() => {})
    }, [])

    const refreshQuota = useCallback(() => {
        if (!isLoggedIn()) return
        void fetchPointsQuota('face').then(setQuota).catch(() => {})
    }, [])

    const uploadedCount = paths.filter(Boolean).length
    const ready = uploadedCount >= 1
    const loading = extracting || extractStreaming || interpreting || streaming
    const hasFullReading = Boolean(result?.stops?.length)

    const buildExtractSkeleton = useCallback((extracted: FaceExtractResponse): FaceAnalyzeResponse => ({
        content: '',
        face_type: extracted.face_type,
        complexion: extracted.complexion,
        overview: '',
        stops: [],
        organs: [],
        summary: extracted.summary,
        summaries: [],
        extract_overview: '',
        preview_stops: [],
        preview_organs: []
    }), [])

    const streamExtractPreview = useCallback(async (
        extracted: FaceExtractResponse,
        signal: AbortSignal
    ) => {
        setExtractStreaming(true)
        const stopByKey = new Map(extracted.preview_stops.map((st) => [st.key, st]))
        const organByKey = new Map(extracted.preview_organs.map((og) => [og.key, og]))

        await revealExtractPreview({
            overview: extracted.extract_overview,
            summaries: extracted.summaries ?? [],
            items: [
                ...extracted.preview_stops.map((st) => ({ key: st.key, hint: st.hint ?? '' })),
                ...extracted.preview_organs.map((og) => ({ key: og.key, hint: og.hint ?? '' }))
            ],
            onOverview: (chunk) => {
                setResult((prev) => prev ? { ...prev, extract_overview: prev.extract_overview + chunk } : prev)
            },
            onSummary: (index, chunk) => {
                setResult((prev) => {
                    if (!prev) return prev
                    const next = [...(prev.summaries ?? [])]
                    while (next.length <= index) next.push('')
                    next[index] = (next[index] ?? '') + chunk
                    return { ...prev, summaries: next }
                })
            },
            onItemStart: (key) => {
                setResult((prev) => {
                    if (!prev) return prev
                    const st = stopByKey.get(key as FaceStopKey)
                    if (st && !prev.preview_stops?.some((item) => item.key === key)) {
                        return {
                            ...prev,
                            preview_stops: [...(prev.preview_stops ?? []), { ...st, hint: '' }]
                        }
                    }
                    const og = organByKey.get(key as FaceOrganKey)
                    if (og && !prev.preview_organs?.some((item) => item.key === key)) {
                        return {
                            ...prev,
                            preview_organs: [...(prev.preview_organs ?? []), { ...og, hint: '' }]
                        }
                    }
                    return prev
                })
            },
            onHint: (key, chunk) => {
                setResult((prev) => {
                    if (!prev) return prev
                    const inStops = prev.preview_stops?.some((st) => st.key === key)
                    if (inStops) {
                        return {
                            ...prev,
                            preview_stops: (prev.preview_stops ?? []).map((st) => (
                                st.key === key ? { ...st, hint: (st.hint ?? '') + chunk } : st
                            ))
                        }
                    }
                    return {
                        ...prev,
                        preview_organs: (prev.preview_organs ?? []).map((og) => (
                            og.key === key ? { ...og, hint: (og.hint ?? '') + chunk } : og
                        ))
                    }
                })
            },
            signal
        })
        setExtractStreaming(false)
    }, [])

    const buildStreamingResult = useCallback((
        interpreted: FaceStructuredBody,
        extracted: FaceExtractResponse
    ): FaceAnalyzeResponse => ({
        ...interpreted,
        overview: '',
        stops: interpreted.stops.map((s) => ({ ...s, description: '' })),
        organs: interpreted.organs.map((o) => ({ ...o, description: '' })),
        closing_summary: '',
        advice_items: [],
        summary: extracted.summary,
        summaries: extracted.summaries,
        extract_overview: extracted.extract_overview,
        preview_stops: extracted.preview_stops,
        preview_organs: extracted.preview_organs
    }), [])

    const streamReading = useCallback(async (
        interpreted: FaceStructuredBody,
        signal: AbortSignal
    ) => {
        setStreaming(true)
        await revealStructuredReading({
            overview: interpreted.overview,
            items: [interpreted.stops, interpreted.organs],
            closingSummary: interpreted.closing_summary,
            adviceItems: interpreted.advice_items ?? [],
            onOverview: (chunk) => {
                setResult((prev) => prev ? { ...prev, overview: prev.overview + chunk } : prev)
            },
            onItemDesc: (key, chunk) => {
                setResult((prev) => {
                    if (!prev) return prev
                    const inStops = prev.stops.some((s) => s.key === key)
                    if (inStops) {
                        return {
                            ...prev,
                            stops: prev.stops.map((s) => (
                                s.key === key ? { ...s, description: s.description + chunk } : s
                            ))
                        }
                    }
                    return {
                        ...prev,
                        organs: prev.organs.map((o) => (
                            o.key === key ? { ...o, description: o.description + chunk } : o
                        ))
                    }
                })
            },
            onClosing: (chunk) => {
                setResult((prev) => prev ? { ...prev, closing_summary: (prev.closing_summary ?? '') + chunk } : prev)
            },
            onAdviceItem: (index, chunk) => {
                setResult((prev) => {
                    if (!prev) return prev
                    const items = [...(prev.advice_items ?? [])]
                    while (items.length <= index) items.push('')
                    items[index] = (items[index] ?? '') + chunk
                    return { ...prev, advice_items: items }
                })
            },
            signal
        })
    }, [])

    const hintText = uploadedCount === 0
        ? '正面照为主，侧面补充更精'
        : uploadedCount >= 2
            ? '多角度参验更精'
            : '可即解析，补充角度更佳'

    const lead = paths[0] ? '正面为主' : paths[1] ? '侧面为主' : '补充为主'

    const chooseSlot = useCallback(async (index: number) => {
        if (extractingRef.current || interpretingRef.current || pickInFlightRef.current) return
        pickInFlightRef.current = true
        try {
            const path = await pickFaceImage()
            if (!path || extractingRef.current || interpretingRef.current) return
            setPaths((prev) => {
                const next = [...prev]
                next[index] = path
                return next
            })
        } finally {
            pickInFlightRef.current = false
        }
    }, [])

    const clearSlot = useCallback((index: number, e?: { stopPropagation?: () => void }) => {
        if (extractingRef.current || interpretingRef.current) return
        e?.stopPropagation?.()
        setPaths((prev) => {
            const next = [...prev]
            next[index] = null
            return next
        })
    }, [])

    const validate = useCallback((): string | null => {
        if (!paths.some(Boolean)) return '请至少上传一张面部图片'
        return null
    }, [paths])

    const submit = useCallback(async () => {
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }
        if (loading) return
        if (!ensureLoggedIn()) return

        const uploads = collectUploads(paths)
        const imagePaths = uploads.map((item) => item.path)
        const slots = uploads.map((item) => item.slot)
        uploadMetaRef.current = { paths: imagePaths, slots }

        setExtracting(true)
        setExtractStreaming(false)
        setResult(null)
        extractRef.current = null

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        try {
            const extracted = await postFaceExtract(imagePaths, slots)
            if (ac.signal.aborted) return

            extractRef.current = extracted
            setUploadTags(uploads.map((item) => SLOT_DEFS[item.index]?.tag ?? item.label))
            setResult(buildExtractSkeleton(extracted))
            setPhase('reading')
            setExtracting(false)
            await streamExtractPreview(extracted, ac.signal)
            if (ac.signal.aborted) return
            refreshQuota()
        } catch (e) {
            if (!ac.signal.aborted) {
                const msg = e instanceof Error ? e.message : '识别失败'
                if (msg.length > 20) {
                    openAlertModal({ title: '识别失败', content: msg })
                } else {
                    void Taro.showToast({ title: msg, icon: 'none' })
                }
                setPhase('upload')
                setResult(null)
            }
            setExtracting(false)
            setExtractStreaming(false)
        }
    }, [validate, loading, paths, refreshQuota, buildExtractSkeleton, streamExtractPreview])

    const onInterpret = useCallback(async () => {
        const extracted = extractRef.current
        if (!extracted || interpretingRef.current || hasFullReading) return
        if (!ensureLoggedIn()) return

        let txId: number | undefined
        try {
            const { quoteForFeature } = await import('@/hooks/usePoints')
            const quote = await quoteForFeature({ feature: 'face' })
            const skipConfirm = quote.uses_free_quota

            const points = await ensurePoints({
                feature: 'face',
                idempotency_key: `face:interpret:${Date.now()}`,
                skipConfirm
            })
            if (!points) return

            abortRef.current?.abort()
            const ac = new AbortController()
            abortRef.current = ac

            interpretingRef.current = true
            setInterpreting(true)
            setStreaming(false)

            txId = points.transaction_id

            const interpreted = await postFaceInterpret({ features: extracted.features })
            if (ac.signal.aborted) return

            setResult(buildStreamingResult(interpreted, extracted))
            setInterpreting(false)
            await streamReading(interpreted, ac.signal)
            refreshQuota()
        } catch (e) {
            await refundOnFailure(txId)
            if (!abortRef.current?.signal.aborted) {
                const msg = e instanceof Error ? e.message : '解读失败'
                if (msg.length > 20) {
                    openAlertModal({ title: '解读失败', content: msg })
                } else {
                    void Taro.showToast({ title: msg, icon: 'none' })
                }
            }
        } finally {
            interpretingRef.current = false
            setInterpreting(false)
            setStreaming(false)
        }
    }, [hasFullReading, refreshQuota, buildStreamingResult, streamReading])

    const reset = useCallback(() => {
        if (extracting || extractStreaming || interpreting || streaming) return
        abortRef.current?.abort()
        interpretingRef.current = false
        setPhase('upload')
        setPaths([null, null, null])
        setUploadTags([])
        setResult(null)
        setExtracting(false)
        setExtractStreaming(false)
        setInterpreting(false)
        setStreaming(false)
        extractRef.current = null
        uploadMetaRef.current = null
    }, [extracting, extractStreaming, interpreting, streaming])

    const canGoBack = phase === 'reading'

    const goBack = useCallback(() => {
        if (extracting || extractStreaming || interpreting || streaming) return
        abortRef.current?.abort()
        interpretingRef.current = false
        setPhase('upload')
        setResult(null)
        setExtracting(false)
        setExtractStreaming(false)
        setInterpreting(false)
        setStreaming(false)
    }, [extracting, extractStreaming, interpreting, streaming])

    const submitLabel = extracting
        ? '正 在 识 别 面 象'
        : extractStreaming
            ? '正 在 整 理 识 象'
            : interpreting
            ? '正 在 参 详 解 读'
            : (phase === 'reading' && !hasFullReading ? '参 详 解 读' : '开 始 识 别')
    const submitLabelLoading = extracting || extractStreaming || interpreting

    return {
        phase,
        paths,
        loading,
        extracting,
        extractStreaming,
        interpreting,
        streaming,
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
    }
}
