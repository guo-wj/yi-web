import Taro from '@tarojs/taro'
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
    type FaceSlot
} from '@/services/faceApi'

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

/** 面相面板的全部状态与交互逻辑，PC 与移动端视图共用 */
export function useFacePanel () {
    const [phase, setPhase] = useState<Phase>('upload')
    const [paths, setPaths] = useState<(string | null)[]>([null, null, null])
    const [extracting, setExtracting] = useState(false)
    const [interpreting, setInterpreting] = useState(false)
    const [result, setResult] = useState<FaceAnalyzeResponse | null>(null)
    const [uploadTags, setUploadTags] = useState<string[]>([])
    const [quota, setQuota] = useState<PointsQuota | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const extractRef = useRef<FaceExtractResponse | null>(null)
    const uploadMetaRef = useRef<{ paths: string[]; slots: FaceSlot[] } | null>(null)
    const interpretingRef = useRef(false)

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
    const loading = extracting || interpreting
    const hasFullReading = Boolean(result?.stops?.length)

    const hintText = uploadedCount === 0
        ? '正面照为主，侧面补充更精'
        : uploadedCount >= 2
            ? '多角度参验更精'
            : '可即解析，补充角度更佳'

    const lead = paths[0] ? '正面为主' : paths[1] ? '侧面为主' : '补充为主'

    const chooseSlot = useCallback(async (index: number) => {
        const path = await pickFaceImage()
        if (!path) return
        setPaths((prev) => {
            const next = [...prev]
            next[index] = path
            return next
        })
    }, [])

    const clearSlot = useCallback((index: number, e?: { stopPropagation?: () => void }) => {
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

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        setExtracting(true)
        setResult(null)
        extractRef.current = null

        try {
            const extracted = await postFaceExtract(imagePaths, slots)
            if (ac.signal.aborted) return

            extractRef.current = extracted
            setUploadTags(uploads.map((item) => SLOT_DEFS[item.index]?.tag ?? item.label))
            setResult({
                content: '',
                face_type: extracted.face_type,
                complexion: extracted.complexion,
                overview: extracted.summary,
                stops: [],
                organs: [],
                summary: extracted.summary,
                summaries: extracted.summaries
            })
            setPhase('reading')
        } catch (e) {
            if (!ac.signal.aborted) {
                const msg = e instanceof Error ? e.message : '识别失败'
                if (msg.length > 20) {
                    openAlertModal({ title: '识别失败', content: msg })
                } else {
                    void Taro.showToast({ title: msg, icon: 'none' })
                }
            }
        } finally {
            setExtracting(false)
        }
    }, [validate, loading, paths])

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

            interpretingRef.current = true
            setInterpreting(true)

            txId = points.transaction_id

            const interpreted = await postFaceInterpret({ features: extracted.features })
            setResult({
                ...interpreted,
                summary: extracted.summary,
                summaries: extracted.summaries
            })
            refreshQuota()
        } catch (e) {
            await refundOnFailure(txId)
            const msg = e instanceof Error ? e.message : '解读失败'
            if (msg.length > 20) {
                openAlertModal({ title: '解读失败', content: msg })
            } else {
                void Taro.showToast({ title: msg, icon: 'none' })
            }
        } finally {
            interpretingRef.current = false
            setInterpreting(false)
        }
    }, [hasFullReading, refreshQuota])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        setPhase('upload')
        setPaths([null, null, null])
        setUploadTags([])
        setResult(null)
        setExtracting(false)
        setInterpreting(false)
        extractRef.current = null
        uploadMetaRef.current = null
    }, [])

    const canGoBack = phase === 'reading'

    const goBack = useCallback(() => {
        abortRef.current?.abort()
        interpretingRef.current = false
        setPhase('upload')
        setResult(null)
        setExtracting(false)
        setInterpreting(false)
    }, [])

    const submitLabel = extracting
        ? '正 在 识 别 面 象'
        : interpreting
            ? '正 在 参 详 解 读'
            : (phase === 'reading' && !hasFullReading ? 'AI 参 详 解 读' : '开 始 识 别')
    const submitLabelLoading = extracting || interpreting

    return {
        phase,
        paths,
        loading,
        extracting,
        interpreting,
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
