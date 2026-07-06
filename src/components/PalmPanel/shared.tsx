import Taro from '@tarojs/taro'
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
    type PalmLineKey
} from '@/services/palmApi'

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

/** 掌纹面板的全部状态与交互逻辑，PC 与移动端视图共用 */
export function usePalmPanel () {
    const [phase, setPhase] = useState<Phase>('upload')
    const [leftPath, setLeftPath] = useState<string | null>(null)
    const [rightPath, setRightPath] = useState<string | null>(null)
    const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle')
    const [result, setResult] = useState<PalmAnalyzeResponse | null>(null)
    const [quota, setQuota] = useState<PointsQuota | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const extractRef = useRef<PalmExtractResponse | null>(null)
    const interpretingRef = useRef(false)

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
    const loading = loadingStage !== 'idle'
    const interpreting = loadingStage === 'interpret'
    const hasFullReading = Boolean(result?.lines?.length)

    const hintText = handCount === 0
        ? '请上传左右手掌纹，双呈则参验更精'
        : handCount === 1
            ? '再上传另一只手，方可参验成局'
            : '左右双掌俱全 · 参验更精'

    const chooseHand = useCallback(async (side: HandSide) => {
        const path = await pickPalmImage()
        if (!path) return
        if (side === 'left') setLeftPath(path)
        else setRightPath(path)
    }, [])

    const validate = useCallback((): string | null => {
        if (!leftPath) return '请上传左手掌纹'
        if (!rightPath) return '请上传右手掌纹'
        return null
    }, [leftPath, rightPath])

    const submit = useCallback(async () => {
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }
        if (loading) return
        if (!ensureLoggedIn()) return

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        setLoadingStage('extract')
        setResult(null)
        extractRef.current = null

        try {
            const extracted = await postPalmExtract(leftPath!, rightPath!)
            if (ac.signal.aborted) return

            extractRef.current = extracted
            setResult({
                content: '',
                overview: '',
                lines: [],
                mounts: [],
                palm_type: extracted.palm_type,
                complexion: extracted.complexion,
                primary_hand: extracted.primary_hand,
                left_summary: extracted.left_summary,
                right_summary: extracted.right_summary
            })
            setPhase('reading')
            refreshQuota()
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
            setLoadingStage('idle')
        }
    }, [validate, loading, leftPath, rightPath, refreshQuota])

    const onInterpret = useCallback(async () => {
        const extracted = extractRef.current
        if (!extracted || interpretingRef.current || hasFullReading) return
        if (!ensureLoggedIn()) return

        let txId: number | undefined
        try {
            const { quoteForFeature } = await import('@/hooks/usePoints')
            const quote = await quoteForFeature({ feature: 'palm' })
            const skipConfirm = quote.uses_free_quota

            const points = await ensurePoints({
                feature: 'palm',
                idempotency_key: `palm:interpret:${Date.now()}`,
                skipConfirm
            })
            if (!points) return

            interpretingRef.current = true
            setLoadingStage('interpret')

            txId = points.transaction_id

            const interpreted = await postPalmInterpret({
                left_features: extracted.left_features,
                right_features: extracted.right_features,
                primary_hand: extracted.primary_hand
            })

            setResult({
                ...interpreted,
                left_summary: extracted.left_summary,
                right_summary: extracted.right_summary
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
            setLoadingStage('idle')
        }
    }, [hasFullReading, refreshQuota])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        setPhase('upload')
        setLeftPath(null)
        setRightPath(null)
        setResult(null)
        setLoadingStage('idle')
        extractRef.current = null
    }, [])

    const canGoBack = phase === 'reading'

    const goBack = useCallback(() => {
        abortRef.current?.abort()
        interpretingRef.current = false
        setPhase('upload')
        setResult(null)
        setLoadingStage('idle')
    }, [])

    const submitLabel = loadingStage === 'extract'
        ? '正 在 识 别 掌 象'
        : loadingStage === 'interpret'
            ? '正 在 参 详 解 读'
            : (phase === 'reading' && !hasFullReading ? 'AI 参 详 解 读' : '开 始 识 别')
    const submitLabelLoading = loadingStage === 'extract' || loadingStage === 'interpret'

    const lead = result
        ? (result.primary_hand === 'right' ? '右手为主' : '左手为主')
        : ''
    const hands = [leftPath ? '左手' : null, rightPath ? '右手' : null].filter(Boolean).join(' / ')

    return {
        phase,
        leftPath,
        rightPath,
        loadingStage,
        result,
        quota,
        handCount,
        ready,
        loading,
        interpreting,
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
