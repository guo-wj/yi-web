import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchPointsQuota, type PointsQuota } from '@/services/pointsApi'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { isLoggedIn } from '@/utils/auth'
import { ensurePoints, refundOnFailure } from '@/utils/ensurePoints'
import { openAlertModal } from '@/utils/confirmModal'
import {
    postPalmExtract,
    postPalmInterpret,
    type PalmAnalyzeResponse,
    type PalmExtractResponse,
    type PalmMountKey,
    type PalmLineKey,
    type PalmLinePreview,
    type PalmMountPreview,
    type PalmStructuredBody
} from '@/services/palmApi'
import { revealExtractPreview, revealStructuredReading } from '@/utils/streamStructuredReading'

export type Phase = 'upload' | 'reading'
export type HandSide = 'left' | 'right'
export type LoadingStage = 'idle' | 'extract' | 'interpret'

export const UPLOAD_TIPS = [
    '请在自然光下拍摄，避免阴影遮挡',
    '手掌平展，掌纹清晰可见',
    '建议拍摄完整手掌，含五指根部'
]

/** 三大主线的图形描线（按线别固定，纯视觉示意） */
export const LINE_LIVE_PATH: Record<PalmLineKey, string> = {
    life: 'M46 12 C30 20 22 34 22 50 C22 60 26 68 34 76',
    head: 'M20 26 C32 30 46 34 60 33 C68 32 73 30 76 28',
    heart: 'M18 38 C30 28 44 24 58 26 C68 27 73 31 78 36'
}

/** 五丘状态 → 进度条占比 */
export const MOUNT_STATUS_PCT: Record<string, number> = {
    旺: 92, 盛: 76, 匀: 58, 平: 44, 弱: 30
}

async function pickPalmImage (): Promise<string | null> {
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

export function LineGlyph ({ liveKey, className = 'palm-panel__line-svg' }: { liveKey: PalmLineKey; className?: string }) {
    return (
        <svg className={className} viewBox='0 0 96 96' aria-hidden='true'>
            <path className='palm-stroke' d='M30 8 C18 18 14 34 16 50 C18 66 28 80 46 86' />
            <path className='palm-stroke' d='M14 30 C30 36 50 38 66 34' />
            <path className='palm-stroke' d='M16 46 C32 40 52 36 72 42' />
            <path className='live-stroke' d={LINE_LIVE_PATH[liveKey]} />
        </svg>
    )
}

interface PalmExtractPreviewProps {
    result: PalmAnalyzeResponse
    classPrefix?: 'palm-panel' | 'palm-m'
    extractStreaming?: boolean
}

/** 识别完成、解读前的丰富预览（三线五丘初识 + 左右摘要） */
export function PalmExtractPreview ({ result, classPrefix = 'palm-panel', extractStreaming = false }: PalmExtractPreviewProps) {
    const p = classPrefix
    const lines = result.preview_lines ?? []
    const mounts = result.preview_mounts ?? []
    const showOverview = extractStreaming || !!result.extract_overview
    const showLeftSummary = !!result.left_summary
    const showRightSummary = !!result.right_summary

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

            {(showLeftSummary || showRightSummary) && (
                <View className={`${p}__hand-summaries`}>
                    {showLeftSummary && (
                        <View className={`${p}__hand-summary-card`}>
                            <Text className={`${p}__hand-summary-label`}>左手</Text>
                            <Text className={`${p}__hand-summary-text`}>{result.left_summary ?? ''}</Text>
                        </View>
                    )}
                    {showRightSummary && (
                        <View className={`${p}__hand-summary-card`}>
                            <Text className={`${p}__hand-summary-label`}>右手</Text>
                            <Text className={`${p}__hand-summary-text`}>{result.right_summary ?? ''}</Text>
                        </View>
                    )}
                </View>
            )}

            {!!lines.length && (
                <>
                    <View className={`${p}__section-cap`}>
                        <Text className={`${p}__section-cap-txt`}>三 线 初 识</Text>
                    </View>
                    <View className={`${p}__lines-stack`}>
                        {lines.map((ln: PalmLinePreview) => (
                            <View key={ln.key} className={`${p}__line-card ${p}__line-card--preview`}>
                                <View className={`${p}__line-glyph`}>
                                    <LineGlyph liveKey={ln.key} className={`${p}__line-svg`} />
                                </View>
                                <View className={`${p}__line-body`}>
                                    <View className={`${p}__line-top`}>
                                        <Text className={`${p}__line-name`}>{ln.name_cn}</Text>
                                        <Text className={`${p}__line-en`}>{ln.name_en}</Text>
                                        <Text className={`${p}__rate-word`}>{ln.attribute}</Text>
                                    </View>
                                    {!!ln.hint && (
                                        <Text className={`${p}__line-text`}>{ln.hint}</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            )}

            {!!mounts.length && (
                <>
                    <View className={`${p}__section-cap`}>
                        <Text className={`${p}__section-cap-txt`}>五 丘 初 览</Text>
                    </View>
                    <View className={`${p}__mounts-grid`}>
                        {mounts.map((mt: PalmMountPreview) => (
                            <View key={mt.key} className={`${p}__mount-card ${p}__mount-card--preview`}>
                                <View className={`${p}__mount-top`}>
                                    <Text className={`${p}__mount-orb`}>{mt.icon_text}</Text>
                                    <View className={`${p}__mount-id`}>
                                        <Text className={`${p}__mount-name`}>{mt.name_cn}</Text>
                                        <Text className={`${p}__mount-domain`}>{mt.keywords.join(' · ')}</Text>
                                    </View>
                                    <View className={`${p}__mount-bar`}>
                                        <Text className={`${p}__bar-word`}>{mt.status}</Text>
                                        <View className={`${p}__bar-track`}>
                                            <View
                                                className={`${p}__bar-fill`}
                                                style={{ width: `${MOUNT_STATUS_PCT[mt.status] ?? 58}%` }}
                                            />
                                        </View>
                                    </View>
                                </View>
                                {!!mt.hint && (
                                    <Text className={`${p}__mount-text`}>{mt.hint}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                </>
            )}
        </View>
    )
}

/** 掌纹面板的全部状态与交互逻辑，PC 与移动端视图共用 */
export function usePalmPanel () {
    const [phase, setPhase] = useState<Phase>('upload')
    const [leftPath, setLeftPath] = useState<string | null>(null)
    const [rightPath, setRightPath] = useState<string | null>(null)
    const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle')
    const [extractStreaming, setExtractStreaming] = useState(false)
    const [streaming, setStreaming] = useState(false)
    const [result, setResult] = useState<PalmAnalyzeResponse | null>(null)
    const [quota, setQuota] = useState<PointsQuota | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const extractRef = useRef<PalmExtractResponse | null>(null)
    const interpretingRef = useRef(false)
    const loadingStageRef = useRef<LoadingStage>('idle')
    const pickInFlightRef = useRef(false)

    useEffect(() => {
        loadingStageRef.current = loadingStage
    }, [loadingStage])

    useEffect(() => {
        if (!isLoggedIn()) {
            setQuota(null)
            return
        }
        void fetchPointsQuota('palm').then(setQuota).catch(() => {})
    }, [])

    const refreshQuota = useCallback(() => {
        if (!isLoggedIn()) return
        void fetchPointsQuota('palm').then(setQuota).catch(() => {})
    }, [])

    const handCount = (leftPath ? 1 : 0) + (rightPath ? 1 : 0)
    const ready = handCount === 2
    const loading = loadingStage !== 'idle' || extractStreaming || streaming
    const interpreting = loadingStage === 'interpret'
    const hasFullReading = Boolean(result?.lines?.length)

    const buildExtractSkeleton = useCallback((extracted: PalmExtractResponse): PalmAnalyzeResponse => ({
        content: '',
        overview: '',
        lines: [],
        mounts: [],
        palm_type: extracted.palm_type,
        palm_shape: extracted.palm_shape,
        complexion: extracted.complexion,
        primary_hand: extracted.primary_hand,
        left_summary: '',
        right_summary: '',
        extract_overview: '',
        preview_lines: [],
        preview_mounts: []
    }), [])

    const streamExtractPreview = useCallback(async (
        extracted: PalmExtractResponse,
        signal: AbortSignal
    ) => {
        setExtractStreaming(true)
        const lineByKey = new Map(extracted.preview_lines.map((ln) => [ln.key, ln]))
        const mountByKey = new Map(extracted.preview_mounts.map((mt) => [mt.key, mt]))
        const summaryTargets: Array<'left' | 'right'> = []
        const summaryTexts: string[] = []
        if (extracted.left_summary) {
            summaryTargets.push('left')
            summaryTexts.push(extracted.left_summary)
        }
        if (extracted.right_summary) {
            summaryTargets.push('right')
            summaryTexts.push(extracted.right_summary)
        }

        await revealExtractPreview({
            overview: extracted.extract_overview,
            summaries: summaryTexts,
            items: [
                ...extracted.preview_lines.map((ln) => ({ key: ln.key, hint: ln.hint ?? '' })),
                ...extracted.preview_mounts.map((mt) => ({ key: mt.key, hint: mt.hint ?? '' }))
            ],
            onOverview: (chunk) => {
                setResult((prev) => prev ? { ...prev, extract_overview: prev.extract_overview + chunk } : prev)
            },
            onSummary: (index, chunk) => {
                const side = summaryTargets[index]
                if (!side) return
                setResult((prev) => {
                    if (!prev) return prev
                    if (side === 'left') {
                        return { ...prev, left_summary: (prev.left_summary ?? '') + chunk }
                    }
                    return { ...prev, right_summary: (prev.right_summary ?? '') + chunk }
                })
            },
            onItemStart: (key) => {
                setResult((prev) => {
                    if (!prev) return prev
                    const ln = lineByKey.get(key as PalmLineKey)
                    if (ln && !prev.preview_lines?.some((item) => item.key === key)) {
                        return {
                            ...prev,
                            preview_lines: [...(prev.preview_lines ?? []), { ...ln, hint: '' }]
                        }
                    }
                    const mt = mountByKey.get(key as PalmMountKey)
                    if (mt && !prev.preview_mounts?.some((item) => item.key === key)) {
                        return {
                            ...prev,
                            preview_mounts: [...(prev.preview_mounts ?? []), { ...mt, hint: '' }]
                        }
                    }
                    return prev
                })
            },
            onHint: (key, chunk) => {
                setResult((prev) => {
                    if (!prev) return prev
                    const inLines = prev.preview_lines?.some((ln) => ln.key === key)
                    if (inLines) {
                        return {
                            ...prev,
                            preview_lines: (prev.preview_lines ?? []).map((ln) => (
                                ln.key === key ? { ...ln, hint: (ln.hint ?? '') + chunk } : ln
                            ))
                        }
                    }
                    return {
                        ...prev,
                        preview_mounts: (prev.preview_mounts ?? []).map((mt) => (
                            mt.key === key ? { ...mt, hint: (mt.hint ?? '') + chunk } : mt
                        ))
                    }
                })
            },
            signal
        })
        setExtractStreaming(false)
    }, [])

    const buildStreamingResult = useCallback((
        interpreted: PalmStructuredBody,
        extracted: PalmExtractResponse
    ): PalmAnalyzeResponse => ({
        ...interpreted,
        overview: '',
        lines: interpreted.lines.map((ln) => ({ ...ln, description: '' })),
        mounts: interpreted.mounts.map((mt) => ({ ...mt, description: '' })),
        closing_summary: '',
        advice_items: [],
        left_summary: extracted.left_summary,
        right_summary: extracted.right_summary,
        palm_shape: extracted.palm_shape,
        extract_overview: extracted.extract_overview,
        preview_lines: extracted.preview_lines,
        preview_mounts: extracted.preview_mounts
    }), [])

    const streamReading = useCallback(async (
        interpreted: PalmStructuredBody,
        signal: AbortSignal
    ) => {
        setStreaming(true)
        await revealStructuredReading({
            overview: interpreted.overview,
            items: [interpreted.lines, interpreted.mounts],
            closingSummary: interpreted.closing_summary,
            adviceItems: interpreted.advice_items ?? [],
            onOverview: (chunk) => {
                setResult((prev) => prev ? { ...prev, overview: prev.overview + chunk } : prev)
            },
            onItemDesc: (key, chunk) => {
                setResult((prev) => {
                    if (!prev) return prev
                    const inLines = prev.lines.some((ln) => ln.key === key)
                    if (inLines) {
                        return {
                            ...prev,
                            lines: prev.lines.map((ln) => (
                                ln.key === key ? { ...ln, description: ln.description + chunk } : ln
                            ))
                        }
                    }
                    return {
                        ...prev,
                        mounts: prev.mounts.map((mt) => (
                            mt.key === key ? { ...mt, description: mt.description + chunk } : mt
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

    const hintText = handCount === 0
        ? '请上传左右手掌纹，双呈则参验更精'
        : handCount === 1
            ? '再上传另一只手，方可参验成局'
            : '左右双掌俱全 · 参验更精'

    const chooseHand = useCallback(async (side: HandSide) => {
        if (loadingStageRef.current !== 'idle' || pickInFlightRef.current) return
        pickInFlightRef.current = true
        try {
            const path = await pickPalmImage()
            if (!path || loadingStageRef.current !== 'idle') return
            if (side === 'left') setLeftPath(path)
            else setRightPath(path)
        } finally {
            pickInFlightRef.current = false
        }
    }, [])

    const validate = useCallback((): string | null => {
        if (!leftPath) return '请上传左手掌纹'
        if (!rightPath) return '请上传右手掌纹'
        return null
    }, [leftPath, rightPath])

    const runInterpret = useCallback(async (
        extracted: PalmExtractResponse,
        opts?: { skipConfirm?: boolean }
    ): Promise<boolean> => {
        if (interpretingRef.current || hasFullReading) return false
        if (!ensureLoggedIn()) return false

        let txId: number | undefined
        try {
            let skipConfirm = opts?.skipConfirm
            if (skipConfirm === undefined) {
                const { quoteForFeature } = await import('@/hooks/usePoints')
                const quote = await quoteForFeature({ feature: 'palm' })
                skipConfirm = quote.uses_free_quota
            }

            const points = await ensurePoints({
                feature: 'palm',
                idempotency_key: `palm:interpret:${Date.now()}`,
                skipConfirm
            })
            if (!points) return false

            interpretingRef.current = true
            setLoadingStage('interpret')
            setStreaming(false)
            txId = points.transaction_id

            abortRef.current?.abort()
            const ac = new AbortController()
            abortRef.current = ac

            const interpreted = await postPalmInterpret({
                left_features: extracted.left_features,
                right_features: extracted.right_features,
                primary_hand: extracted.primary_hand
            })
            if (ac.signal.aborted) return false

            setResult(buildStreamingResult(interpreted, extracted))
            setLoadingStage('idle')
            await streamReading(interpreted, ac.signal)
            refreshQuota()
            return true
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
            return false
        } finally {
            interpretingRef.current = false
            setLoadingStage('idle')
            setStreaming(false)
        }
    }, [hasFullReading, refreshQuota, buildStreamingResult, streamReading])

    const submit = useCallback(async () => {
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }
        if (loading) return
        if (!ensureLoggedIn()) return

        setLoadingStage('extract')
        setExtractStreaming(false)
        setResult(null)
        extractRef.current = null

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        try {
            const extracted = await postPalmExtract(leftPath!, rightPath!)
            if (ac.signal.aborted) return

            extractRef.current = extracted
            setResult(buildExtractSkeleton(extracted))
            setPhase('reading')
            setLoadingStage('idle')
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
            setLoadingStage('idle')
            setExtractStreaming(false)
        }
    }, [validate, loading, leftPath, rightPath, refreshQuota, buildExtractSkeleton, streamExtractPreview])

    const onInterpret = useCallback(async () => {
        const extracted = extractRef.current
        if (!extracted) return
        await runInterpret(extracted)
    }, [runInterpret])

    const reset = useCallback(() => {
        if (loadingStage !== 'idle' || extractStreaming || streaming) return
        abortRef.current?.abort()
        interpretingRef.current = false
        setPhase('upload')
        setLeftPath(null)
        setRightPath(null)
        setResult(null)
        setLoadingStage('idle')
        setExtractStreaming(false)
        setStreaming(false)
        extractRef.current = null
    }, [loadingStage, extractStreaming, streaming])

    const canGoBack = phase === 'reading'

    const goBack = useCallback(() => {
        if (loadingStage !== 'idle' || extractStreaming || streaming) return
        abortRef.current?.abort()
        interpretingRef.current = false
        setPhase('upload')
        setResult(null)
        setLoadingStage('idle')
        setExtractStreaming(false)
        setStreaming(false)
    }, [loadingStage, extractStreaming, streaming])

    const submitLabel = loadingStage === 'extract'
        ? '正 在 识 别 掌 象'
        : extractStreaming
            ? '正 在 整 理 识 象'
            : loadingStage === 'interpret'
            ? '正 在 参 详 解 读'
            : phase === 'reading'
                ? '参 详 解 读'
                : '开 始 识 别'
    const submitLabelLoading = loadingStage === 'extract' || extractStreaming || loadingStage === 'interpret'

    const lead = result
        ? (result.primary_hand === 'right' ? '右手为主' : '左手为主')
        : ''
    const hands = [leftPath ? '左手' : null, rightPath ? '右手' : null].filter(Boolean).join(' / ')

    return {
        phase,
        leftPath,
        rightPath,
        loadingStage,
        extractStreaming,
        result,
        quota,
        handCount,
        ready,
        loading,
        interpreting,
        streaming,
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
    }
}
