import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import DivineSetup, { type DivineMethodOption } from '@/components/DivineSetup'
import MarkdownView from '@/components/MarkdownView'
import { LIUYAO_PROMPTS } from '@/constants/liuyaoPrompts'
import { ensureLoggedIn } from '@/utils/requireAuth'
import {
    postLiuyaoCast,
    streamInterpretationText,
    type LiuyaoCastResponse,
    type LiuyaoGua
} from '@/services/liuyaoApi'
import {
    isChanging,
    isYang,
    tossCoins,
    YAO_LABELS,
    YAO_TYPE_LABEL,
    type YaoLine,
    type YaoValue
} from '@/utils/liuyaoCoins'

import './index.scss'

type Phase = 'setup' | 'casting' | 'done' | 'reading'
type ShakeMode = 'manual' | 'auto'
type CoinFace = 'zi' | 'bei'

const SHAKE_MS = 880
const AUTO_GAP_MS = 750
const AUTO_FIRST_MS = 650

const LIUYAO_MODES: DivineMethodOption[] = [
    { key: 'manual', label: '手动摇卦', caption: '亲手摇六次' },
    { key: 'auto', label: '自动摇卦', caption: '凝神一念成' }
]

const TRI_SYM: Record<string, string> = {
    乾: '☰', 兑: '☱', 离: '☲', 震: '☳', 巽: '☴', 坎: '☵', 艮: '☶', 坤: '☷'
}
const TRI_ELEM: Record<string, string> = {
    乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地'
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function yaoLabel (v: YaoValue): string {
    return `${YAO_TYPE_LABEL[v]}${isChanging(v) ? ' · 动' : ''}`
}

function guaSym (gua: LiuyaoGua): string {
    return `${TRI_SYM[gua.upper_trigram] ?? ''}${TRI_SYM[gua.lower_trigram] ?? ''}`
}

function guaFullName (gua: LiuyaoGua): string {
    return `${TRI_ELEM[gua.upper_trigram] ?? ''}${TRI_ELEM[gua.lower_trigram] ?? ''}${gua.name}`
}

function HexCard ({
    role,
    gua,
    lines
}: {
    role: string
    gua: LiuyaoGua
    lines?: LiuyaoCastResponse['lines']
}) {
    // 自下而上：bits[0] = 初爻
    const rows = gua.bits.map((bit, i) => {
        const ln = lines?.find((l) => l.position === i + 1)
        const yang = ln ? ln.is_yang : bit === 1
        const moving = ln ? ln.is_moving : false
        return { yang, moving, mark: moving ? (yang ? '○' : '✕') : '' }
    })

    return (
        <View className='liuyao-panel__hex'>
            <Text className='liuyao-panel__hex-role'>{role}</Text>
            <Text className='liuyao-panel__hex-name'>{guaSym(gua)}　{gua.name}</Text>
            <Text className='liuyao-panel__hex-fullname'>{guaFullName(gua)}</Text>
            <View className='liuyao-panel__hex-lines'>
                {rows.map((r, i) => (
                    <View
                        key={i}
                        className={`liuyao-panel__hex-line ${r.moving ? 'liuyao-panel__hex-line--moving' : ''}`}
                    >
                        <Text className='liuyao-panel__hl-name'>{YAO_LABELS[i]}</Text>
                        <View className='liuyao-panel__hl-bar'>
                            {r.yang
                                ? <View className='liuyao-panel__hl-seg' />
                                : (
                                    <>
                                        <View className='liuyao-panel__hl-seg' />
                                        <View className='liuyao-panel__hl-seg' />
                                    </>
                                )}
                        </View>
                        <Text className='liuyao-panel__hl-mk'>{r.mark}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

export default function LiuyaoPanel () {
    const [phase, setPhase] = useState<Phase>('setup')
    const [question, setQuestion] = useState('')
    const [mode, setMode] = useState<ShakeMode>('manual')
    const [lines, setLines] = useState<YaoLine[]>([])
    const [shaking, setShaking] = useState(false)
    const [coinFaces, setCoinFaces] = useState<(CoinFace | null)[]>([null, null, null])
    const [coinsDone, setCoinsDone] = useState(false)
    const [lastYao, setLastYao] = useState('')
    const [lastYaoShow, setLastYaoShow] = useState(false)
    const [castResult, setCastResult] = useState<LiuyaoCastResponse | null>(null)
    const [castingApi, setCastingApi] = useState(false)
    const [streamText, setStreamText] = useState('')
    const [streaming, setStreaming] = useState(false)

    const castingRef = useRef(false)
    const abortRef = useRef<AbortController | null>(null)
    const coinElRefs = useRef<(HTMLElement | null)[]>([null, null, null])
    const coinInnerRefs = useRef<(HTMLElement | null)[]>([null, null, null])
    const coinAngles = useRef<number[]>([0, 0, 0])

    const castOne = useCallback(async () => {
        if (castingRef.current || lines.length >= 6) return
        castingRef.current = true
        setShaking(true)
        setLastYaoShow(false)
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
        setLines((prev) => {
            const next = [...prev, toss]
            setLastYao(`第${next.length}爻 — ${yaoLabel(toss.value)}`)
            return next
        })
        setLastYaoShow(true)
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
        setLastYao('')
        setLastYaoShow(false)
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
            const result = await postLiuyaoCast({
                question: question.trim(),
                yao_values: lines.map((l) => l.value)
            })
            if (ac.signal.aborted) return

            setCastResult(result)
            setPhase('reading')
            setStreaming(true)
            setStreamText('')

            await streamInterpretationText(result.interpretation, (chunk) => {
                setStreamText((prev) => prev + chunk)
            }, ac.signal)
        } catch (e) {
            if (!ac.signal.aborted) {
                const msg = e instanceof Error ? e.message : '生成卦象失败'
                void Taro.showToast({ title: msg.length > 20 ? '生成卦象失败' : msg, icon: 'none' })
            }
        } finally {
            setCastingApi(false)
            setStreaming(false)
        }
    }, [lines, question, castingApi])

    const resetAll = useCallback(() => {
        abortRef.current?.abort()
        setPhase('setup')
        setCastResult(null)
        setLines([])
        setCoinFaces([null, null, null])
        setCoinsDone(false)
        setLastYao('')
        setLastYaoShow(false)
        setStreamText('')
        setStreaming(false)
        setCastingApi(false)
        setShaking(false)
        castingRef.current = false
    }, [])

    // 自下而上倒序展示：上爻在最上
    const displayRows = useMemo((): (YaoLine | null)[] => {
        const rows: (YaoLine | null)[] = []
        for (let i = 5; i >= 0; i--) rows.push(lines[i] ?? null)
        return rows
    }, [lines])

    const counterNo = Math.min(lines.length + 1, 6)
    const inSession = phase === 'casting' || phase === 'done'

    return (
        <View className='liuyao-panel'>
            <View className='liuyao-panel__scroll'>
                <View className='liuyao-panel__head'>
                    <Text className='liuyao-panel__title'>六爻起卦</Text>
                    <Text className='liuyao-panel__subtitle'>三枚铜钱，六爻成卦，问天地之机变</Text>
                </View>

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
                        hint='先选定或写下问题，方可起卦'
                    />
                )}

                {inSession && (
                    <View className='liuyao-panel__session'>
                        <View className='liuyao-panel__q-card'>
                            <Text className='liuyao-panel__q-tag'>所问</Text>
                            <Text className='liuyao-panel__q-text'>{question.trim()}</Text>
                            <View className='liuyao-panel__q-edit' onClick={resetAll}>
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
                                                                <View className='liuyao-panel__hole' />
                                                                <Text className='liuyao-panel__cchar liuyao-panel__cchar--t'>天</Text>
                                                                <Text className='liuyao-panel__cchar liuyao-panel__cchar--b'>下</Text>
                                                                <Text className='liuyao-panel__cchar liuyao-panel__cchar--r'>太</Text>
                                                                <Text className='liuyao-panel__cchar liuyao-panel__cchar--l'>平</Text>
                                                            </View>
                                                            <View className='liuyao-panel__cface liuyao-panel__cface--bei'>
                                                                <View className='liuyao-panel__hole' />
                                                                <View className='liuyao-panel__bei-mark' />
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
                                    <Text className='liuyao-panel__counter'>
                                        第 <Text className='liuyao-panel__counter-n'>{counterNo}</Text> / 6 爻
                                    </Text>
                                    <Text
                                        className={`liuyao-panel__last-yao ${lastYaoShow ? 'liuyao-panel__last-yao--show' : ''}`}
                                    >
                                        {lastYao}
                                    </Text>
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
                                <Text className='liuyao-panel__cta-txt'>{shaking ? '铜钱摇动中…' : '摇 卦'}</Text>
                            </View>
                        )}

                        {phase === 'casting' && mode === 'auto' && (
                            <View className='liuyao-panel__cta liuyao-panel__cta--cast liuyao-panel__cta--disabled'>
                                <Text className='liuyao-panel__cta-txt'>自动摇卦中…</Text>
                            </View>
                        )}

                        {phase === 'done' && (
                            <View
                                className={`liuyao-panel__cta liuyao-panel__cta--cast ${castingApi ? 'liuyao-panel__cta--disabled' : ''}`}
                                onClick={() => void viewHexagram()}
                            >
                                <Text className='liuyao-panel__cta-txt'>{castingApi ? '生成卦象中…' : '查 看 卦 象'}</Text>
                            </View>
                        )}
                    </View>
                )}

                {phase === 'reading' && castResult && (
                    <View className='liuyao-panel__result'>
                        <View className='liuyao-panel__res-q'>
                            <Text className='liuyao-panel__q-tag'>所问</Text>
                            <Text className='liuyao-panel__res-q-text'>{question.trim()}</Text>
                        </View>

                        <View className='liuyao-panel__hex-cards'>
                            <HexCard role='本卦' gua={castResult.ben_gua} lines={castResult.lines} />
                            {castResult.bian_gua && (
                                <>
                                    <View className='liuyao-panel__hex-arrow'><Text>变</Text></View>
                                    <HexCard role='变卦' gua={castResult.bian_gua} />
                                </>
                            )}
                        </View>

                        <View className='liuyao-panel__reading'>
                            <View className='liuyao-panel__reading-head'>
                                <Text className='liuyao-panel__reading-title'>机 断</Text>
                                <Text className='liuyao-panel__reading-pill'>{streaming ? '推演中…' : '玄机已断'}</Text>
                            </View>
                            {streamText
                                ? <MarkdownView className='liuyao-panel__reading-md' content={streamText} />
                                : (
                                    <Text className='liuyao-panel__reading-wait'>
                                        {streaming ? '卦象洞开，解语将至…' : '暂无解卦内容'}
                                    </Text>
                                )}
                        </View>

                        {!streaming && (
                            <View className='liuyao-panel__ghost-btn' onClick={resetAll}>
                                <Text className='liuyao-panel__ghost-txt'>重 新 起 卦</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}
