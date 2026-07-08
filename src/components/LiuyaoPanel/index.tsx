import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import PendingText from '@/components/LoadingDots'
import coinBackImg from '@/assets/images/back.png'
import coinFrontImg from '@/assets/images/front.png'

import DivineSetup, { type DivineMethodOption } from '@/components/DivineSetup'
import GuaPanel from '@/components/GuaPanel'
import MarkdownView from '@/components/MarkdownView'
import PanelBackButton from '@/components/PanelBackButton'
import { LIUYAO_PROMPTS } from '@/constants/liuyaoPrompts'
import { fetchPointsQuota, type PointsQuota } from '@/services/pointsApi'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { isLoggedIn } from '@/utils/auth'
import { ensurePoints, refundOnFailure } from '@/utils/ensurePoints'
import {
    postLiuyaoCast,
    postLiuyaoInterpret,
    streamInterpretationText,
    type LiuyaoCastResponse
} from '@/services/liuyaoApi'
import {
    isYang,
    tossCoins,
    YAO_LABELS,
    YAO_TYPE_LABEL,
    type YaoLine
} from '@/utils/liuyaoCoins'

import './index.scss'

type Phase = 'setup' | 'casting' | 'done' | 'result'
type ShakeMode = 'manual' | 'auto'
type CoinFace = 'zi' | 'bei'

const SHAKE_MS = 880
const AUTO_GAP_MS = 750
const AUTO_FIRST_MS = 650

const LIUYAO_MODES: DivineMethodOption[] = [
    { key: 'auto', label: '自动摇卦', caption: '凝神一念成' },
    { key: 'manual', label: '手动摇卦', caption: '亲手摇六次' }
]

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export default function LiuyaoPanel () {
    const [phase, setPhase] = useState<Phase>('setup')
    const [question, setQuestion] = useState('')
    const [mode, setMode] = useState<ShakeMode>('auto')
    const [lines, setLines] = useState<YaoLine[]>([])
    const [shaking, setShaking] = useState(false)
    const [coinFaces, setCoinFaces] = useState<(CoinFace | null)[]>([null, null, null])
    const [coinsDone, setCoinsDone] = useState(false)
    const [castResult, setCastResult] = useState<LiuyaoCastResponse | null>(null)
    const [castingApi, setCastingApi] = useState(false)
    const [interpreting, setInterpreting] = useState(false)
    const [streamText, setStreamText] = useState('')
    const [streaming, setStreaming] = useState(false)
    const [quota, setQuota] = useState<PointsQuota | null>(null)
    const [hasInterpretation, setHasInterpretation] = useState(false)

    const interpretingRef = useRef(false)
    const abortRef = useRef<AbortController | null>(null)
    const coinElRefs = useRef<(HTMLElement | null)[]>([null, null, null])
    const coinInnerRefs = useRef<(HTMLElement | null)[]>([null, null, null])
    const coinAngles = useRef<number[]>([0, 0, 0])
    const castingRef = useRef(false)

    useEffect(() => {
        if (!isLoggedIn()) {
            setQuota(null)
            return
        }
        void fetchPointsQuota('liuyao').then(setQuota).catch(() => {})
    }, [])

    useEffect(() => {
        ;[coinFrontImg, coinBackImg].forEach((src) => {
            const img = new window.Image()
            img.decoding = 'async'
            img.src = src
        })
    }, [])

    const refreshQuota = useCallback(() => {
        if (!isLoggedIn()) return
        void fetchPointsQuota('liuyao').then(setQuota).catch(() => {})
    }, [])

    const castRequestBody = useCallback(() => ({
        question: question.trim(),
        yao_values: lines.map((l) => l.value)
    }), [question, lines])

    const castOne = useCallback(async () => {
        if (castingRef.current || lines.length >= 6) return
        castingRef.current = true
        setShaking(true)
        setCoinsDone(false)

        const toss = tossCoins()
        // coins[i] true=背(阳,3) false=字(阴,2)
        const faces: CoinFace[] = toss.coins.map((b) => (b ? 'bei' : 'zi'))

        coinElRefs.current.forEach((el, i) => {
            if (el) {
                el.classList.remove('liuyao-panel__coin--tossing')
                void el.offsetWidth
                el.classList.add('liuyao-panel__coin--tossing')
            }
            const inner = coinInnerRefs.current[i]
            if (inner) {
                const cur = coinAngles.current[i] ?? 0
                const target = faces[i] === 'zi' ? 0 : 180
                let a = cur + 360 * (3 + Math.floor(Math.random() * 2))
                a = a - (a % 360) + target
                if (a <= cur) a += 360
                coinAngles.current[i] = a
                window.setTimeout(() => { inner.style.transform = `rotateY(${a}deg)` }, 120)
            }
        })

        await sleep(SHAKE_MS)
        setCoinFaces(faces)
        setCoinsDone(true)
        setLines((prev) => [...prev, toss])
        setShaking(false)
        castingRef.current = false
    }, [lines.length])

    const startCasting = useCallback(() => {
        const q = question.trim()
        if (!q) {
            void Taro.showToast({ title: '请先输入或选择问事', icon: 'none' })
            return
        }
        abortRef.current?.abort()
        setCastResult(null)
        setStreamText('')
        setLines([])
        setCoinFaces([null, null, null])
        setCoinsDone(false)
        setPhase('casting')
    }, [question])

    // 自动摇卦
    useEffect(() => {
        if (phase !== 'casting' || mode !== 'auto' || shaking || lines.length >= 6) return
        const delay = lines.length === 0 ? AUTO_FIRST_MS : AUTO_GAP_MS
        const t = window.setTimeout(() => { void castOne() }, delay)
        return () => window.clearTimeout(t)
    }, [phase, mode, shaking, lines.length, castOne])

    useEffect(() => {
        if (phase === 'casting' && lines.length >= 6 && !shaking) {
            setPhase('done')
        }
    }, [phase, lines.length, shaking])

    const viewHexagram = useCallback(async () => {
        if (lines.length < 6 || castingApi) return
        if (!ensureLoggedIn()) return
        setCastingApi(true)
        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        try {
            const result = await postLiuyaoCast(castRequestBody())
            if (ac.signal.aborted) return

            setCastResult(result)
            setStreamText('')
            setHasInterpretation(false)
            setPhase('result')
        } catch (e) {
            if (!ac.signal.aborted) {
                const msg = e instanceof Error ? e.message : '生成卦象失败'
                void Taro.showToast({ title: msg.length > 20 ? '生成卦象失败' : msg, icon: 'none' })
            }
        } finally {
            setCastingApi(false)
        }
    }, [lines, castingApi, castRequestBody])

    const onInterpret = useCallback(async () => {
        if (!castResult || interpretingRef.current || hasInterpretation) return
        if (!ensureLoggedIn()) return

        let txId: number | undefined
        try {
            const { quoteForFeature } = await import('@/hooks/usePoints')
            const quote = await quoteForFeature({ feature: 'liuyao' })
            const skipConfirm = quote.uses_free_quota

            const points = await ensurePoints({
                feature: 'liuyao',
                idempotency_key: `liuyao:interpret:${lines.map((l) => l.value).join('')}:${Date.now()}`,
                skipConfirm
            })
            if (!points) return

            interpretingRef.current = true
            setInterpreting(true)

            txId = points.transaction_id

            const resp = await postLiuyaoInterpret(castRequestBody())
            if (abortRef.current?.signal.aborted) return

            setHasInterpretation(true)
            setStreaming(true)
            setStreamText('')

            await streamInterpretationText(resp.interpretation, (chunk) => {
                setStreamText((prev) => prev + chunk)
            }, abortRef.current?.signal)
            refreshQuota()
        } catch (e) {
            await refundOnFailure(txId)
            if (!abortRef.current?.signal.aborted) {
                const msg = e instanceof Error ? e.message : '解卦失败'
                void Taro.showToast({ title: msg.length > 20 ? '解卦失败' : msg, icon: 'none' })
            }
        } finally {
            interpretingRef.current = false
            setInterpreting(false)
            setStreaming(false)
        }
    }, [castResult, hasInterpretation, castRequestBody, lines, refreshQuota])

    const resetAll = useCallback(() => {
        if (interpretingRef.current || streaming) return
        abortRef.current?.abort()
        setPhase('setup')
        setCastResult(null)
        setLines([])
        setCoinFaces([null, null, null])
        setCoinsDone(false)
        setStreamText('')
        setStreaming(false)
        setCastingApi(false)
        setInterpreting(false)
        setHasInterpretation(false)
        setShaking(false)
        castingRef.current = false
    }, [streaming])

    const canGoBack = phase !== 'setup'

    const goBack = useCallback(() => {
        if (interpretingRef.current || streaming) return
        abortRef.current?.abort()
        interpretingRef.current = false
        setInterpreting(false)
        setStreaming(false)
        setStreamText('')
        setCastResult(null)
        setHasInterpretation(false)
        setLines([])
        setCoinFaces([null, null, null])
        setCoinsDone(false)
        setCastingApi(false)
        setShaking(false)
        castingRef.current = false
        setPhase('setup')
    }, [streaming])

    // 自下而上倒序展示：上爻在最上
    const displayRows = useMemo((): (YaoLine | null)[] => {
        const rows: (YaoLine | null)[] = []
        for (let i = 5; i >= 0; i--) rows.push(lines[i] ?? null)
        return rows
    }, [lines])

    // 已完成 N 爻显示 N（未起为 0）；摇卦中显示正在摇的第 N 爻
    const castStatusText = useMemo(() => {
        if (lines.length === 0 && !shaking) return '待摇初爻'
        if (shaking) return `第${lines.length + 1}/6爻`
        const latest = lines[lines.length - 1]
        if (!latest) return '待摇初爻'
        return `第${lines.length}/6爻 - ${YAO_TYPE_LABEL[latest.value]}`
    }, [lines, shaking])

    const inSession = phase === 'casting' || phase === 'done'
    const inResult = phase === 'result'
    const interpretBusy = interpreting || streaming
    const panelClass = [
        'liuyao-panel',
        inSession ? 'liuyao-panel--session' : '',
        inResult ? 'liuyao-panel--result' : ''
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <View className={panelClass}>
            <View className='liuyao-panel__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} disabled={interpretBusy} />}

                {phase === 'setup' && (
                    <DivineSetup
                        prompts={LIUYAO_PROMPTS}
                        question={question}
                        onQuestionChange={setQuestion}
                        inputPlaceholder='或写下你的问事，凝神默念三遍…'
                        methodLabel='摇卦方式'
                        methods={LIUYAO_MODES}
                        activeMethod={mode}
                        onMethodChange={(k) => setMode(k as ShakeMode)}
                        ctaText='凝 神 起 卦'
                        onCast={startCasting}
                    />
                )}

                {inSession && (
                    <View className='liuyao-panel__session'>
                        <View className='liuyao-panel__q-card'>
                            <Text className='liuyao-panel__q-tag'>所问</Text>
                            <Text className='liuyao-panel__q-text'>{question.trim()}</Text>
                            <View
                                className={`liuyao-panel__q-edit ${interpretBusy ? 'liuyao-panel__q-edit--disabled' : ''}`}
                                onClick={() => { if (!interpretBusy) goBack() }}
                            >
                                <Text>改</Text>
                            </View>
                        </View>

                        <View className='liuyao-panel__cast-grid'>
                            <View className='liuyao-panel__altar'>
                                <View className='liuyao-panel__altar-ring' />
                                <View className='liuyao-panel__coins'>
                                    {[0, 1, 2].map((i) => {
                                        const face = coinFaces[i]
                                        return (
                                            <View
                                                key={i}
                                                className={`liuyao-panel__coin-cell ${coinsDone ? 'liuyao-panel__coin-cell--done' : ''}`}
                                            >
                                                <View className='liuyao-panel__coin-stage'>
                                                    <View
                                                        className='liuyao-panel__coin'
                                                        ref={(el) => { coinElRefs.current[i] = el as unknown as HTMLElement | null }}
                                                    >
                                                        <View
                                                            className='liuyao-panel__coin-inner'
                                                            ref={(el) => { coinInnerRefs.current[i] = el as unknown as HTMLElement | null }}
                                                        >
                                                            <View className='liuyao-panel__cface liuyao-panel__cface--zi'>
                                                                <Image
                                                                    className='liuyao-panel__coin-img'
                                                                    src={coinFrontImg}
                                                                    mode='aspectFit'
                                                                    lazyLoad={false}
                                                                />
                                                            </View>
                                                            <View className='liuyao-panel__cface liuyao-panel__cface--bei'>
                                                                <Image
                                                                    className='liuyao-panel__coin-img'
                                                                    src={coinBackImg}
                                                                    mode='aspectFit'
                                                                    lazyLoad={false}
                                                                />
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                                <Text
                                                    className={`liuyao-panel__coin-label ${face === 'bei' ? 'liuyao-panel__coin-label--bei' : ''}`}
                                                >
                                                    {face === 'bei' ? '背' : face === 'zi' ? '字' : '—'}
                                                </Text>
                                            </View>
                                        )
                                    })}
                                </View>
                                <View className='liuyao-panel__cast-meta'>
                                    <Text className='liuyao-panel__cast-status'>{castStatusText}</Text>
                                </View>
                            </View>

                            <View className='liuyao-panel__yaopanel'>
                                <View className='liuyao-panel__yp-head'>
                                    <Text className='liuyao-panel__yp-title'>卦象渐成</Text>
                                    <Text className='liuyao-panel__yp-note'>自下而上</Text>
                                </View>
                                <View className='liuyao-panel__yp-rows'>
                                    {displayRows.map((line, i) => {
                                        const idx = 5 - i
                                        const filled = line !== null
                                        const yang = filled ? isYang(line.value) : false
                                        const mark = filled
                                            ? (line.value === 9 ? '○' : line.value === 6 ? '✕' : '')
                                            : ''
                                        return (
                                            <View
                                                key={idx}
                                                className={`liuyao-panel__yao-row ${filled ? 'liuyao-panel__yao-row--filled' : ''}`}
                                            >
                                                <Text className='liuyao-panel__yao-name'>{YAO_LABELS[idx]}</Text>
                                                <View className='liuyao-panel__yao-bar'>
                                                    {filled && !yang
                                                        ? (
                                                            <>
                                                                <View className='liuyao-panel__yao-seg' />
                                                                <View className='liuyao-panel__yao-seg' />
                                                            </>
                                                        )
                                                        : <View className='liuyao-panel__yao-seg' />}
                                                </View>
                                                <Text className='liuyao-panel__yao-mark'>{mark}</Text>
                                            </View>
                                        )
                                    })}
                                </View>
                            </View>
                        </View>

                        {phase === 'casting' && mode === 'manual' && (
                            <View
                                className={`liuyao-panel__cta liuyao-panel__cta--cast ${shaking ? 'liuyao-panel__cta--disabled' : ''}`}
                                onClick={() => { if (!shaking) void castOne() }}
                            >
                                {shaking
                                    ? <PendingText className='liuyao-panel__cta-txt'>铜钱摇动中</PendingText>
                                    : <Text className='liuyao-panel__cta-txt'>摇 卦</Text>}
                            </View>
                        )}

                        {phase === 'casting' && mode === 'auto' && (
                            <View className='liuyao-panel__cta liuyao-panel__cta--cast liuyao-panel__cta--disabled'>
                                <PendingText className='liuyao-panel__cta-txt'>自动摇卦中</PendingText>
                            </View>
                        )}

                        {phase === 'done' && (
                            <View
                                className={`liuyao-panel__cta liuyao-panel__cta--cast ${castingApi ? 'liuyao-panel__cta--disabled' : ''}`}
                                onClick={() => void viewHexagram()}
                            >
                                {castingApi
                                    ? <PendingText className='liuyao-panel__cta-txt'>生成卦象中</PendingText>
                                    : <Text className='liuyao-panel__cta-txt'>查 看 卦 象</Text>}
                            </View>
                        )}
                    </View>
                )}

                {phase === 'result' && castResult && (
                    <View className='liuyao-panel__result'>
                        <View className='liuyao-panel__result-body'>
                            <View className='liuyao-panel__q-card'>
                                <Text className='liuyao-panel__q-tag'>所问</Text>
                                <Text className='liuyao-panel__q-text'>{question.trim()}</Text>
                            </View>

                            {quota && quota.free_remaining > 0 && (
                                <Text className='liuyao-panel__quota'>
                                    今日免费解卦剩余 {quota.free_remaining} 次
                                </Text>
                            )}

                            <View className='liuyao-panel__hex-cards'>
                                <GuaPanel role='本卦' gua={castResult.ben_gua} lines={castResult.lines} />
                                {castResult.bian_gua && (
                                    <>
                                        <View className='liuyao-panel__hex-arrow'><Text>变</Text></View>
                                        <GuaPanel role='变卦' gua={castResult.bian_gua} />
                                    </>
                                )}
                            </View>

                            {(hasInterpretation || streaming || streamText) && (
                                <View className='liuyao-panel__reading'>
                                    <View className='liuyao-panel__reading-head'>
                                        <Text className='liuyao-panel__reading-title'>机 断</Text>
                                        {streaming
                                            ? <PendingText className='liuyao-panel__reading-pill'>推演中</PendingText>
                                            : <Text className='liuyao-panel__reading-pill'>玄机已断</Text>}
                                    </View>
                                    {streamText
                                        ? <MarkdownView className='liuyao-panel__reading-md' content={streamText} />
                                        : (
                                            streaming
                                                ? <PendingText className='liuyao-panel__reading-wait'>卦象洞开，解语将至</PendingText>
                                                : <Text className='liuyao-panel__reading-wait'>暂无解卦内容</Text>
                                        )}
                                </View>
                            )}
                        </View>

                        <View className={`liuyao-panel__result-foot ${hasInterpretation ? 'liuyao-panel__result-foot--single' : ''}`}>
                            <View
                                className={`liuyao-panel__foot-btn liuyao-panel__foot-btn--ghost ${interpretBusy ? 'liuyao-panel__foot-btn--disabled' : ''}`}
                                onClick={() => { if (!interpretBusy) resetAll() }}
                            >
                                <Text className='liuyao-panel__foot-btn-txt'>重新起卦</Text>
                            </View>
                            {!hasInterpretation && (
                                <View
                                    className={`liuyao-panel__foot-btn liuyao-panel__foot-btn--primary ${interpretBusy ? 'liuyao-panel__foot-btn--disabled' : ''}`}
                                    onClick={() => { if (!interpretBusy) void onInterpret() }}
                                >
                                    {interpreting
                                        ? <PendingText className='liuyao-panel__foot-btn-txt liuyao-panel__foot-btn-txt--primary'>解卦中</PendingText>
                                        : <Text className='liuyao-panel__foot-btn-txt liuyao-panel__foot-btn-txt--primary'>解卦</Text>}
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </View>
    )
}
