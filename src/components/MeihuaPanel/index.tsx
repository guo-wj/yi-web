import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'

import DivineSetup from '@/components/DivineSetup'
import GuaPanel from '@/components/GuaPanel'
import MarkdownView from '@/components/MarkdownView'
import PendingText from '@/components/LoadingDots'
import PanelBackButton from '@/components/PanelBackButton'
import {
    MEIHUA_METHODS,
    MEIHUA_PROMPTS,
    type MeihuaMethod
} from '@/constants/meihuaOptions'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { isLoggedIn } from '@/utils/auth'
import { fetchPointsQuota, type PointsQuota } from '@/services/pointsApi'
import { ensurePoints, refundOnFailure } from '@/utils/ensurePoints'
import { getAlmanacDay, type AlmanacResponse } from '@/services/almanacApi'
import {
    postMeihuaCast,
    postMeihuaDivine,
    streamInterpretationText,
    type MeihuaCastResponse,
    type MeihuaDivineRequest,
    type MeihuaGua
} from '@/services/meihuaApi'

import './index.scss'

type Phase = 'setup' | 'casting' | 'result'
type TileState = 'idle' | 'rolling' | 'locked'
type TileKind = 'up' | 'low' | 'yao'

interface TileData {
    display: string
    state: TileState
    sym: string
    tri: string
}

const YAO_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'] as const

/** 动爻无八卦符号，用本卦该爻阴阳动变标记（与卦象区 ○/✕ 一致） */
function movingLineMark (gua: MeihuaGua, line: number): string {
    const bit = gua.bits[line - 1]
    if (bit === 1) return '○'
    if (bit === 0) return '✕'
    return '动'
}

const SHICHEN_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

/** 先天八卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8 */
const PRENUM: Record<string, number> = { 乾: 1, 兑: 2, 离: 3, 震: 4, 巽: 5, 坎: 6, 艮: 7, 坤: 8 }
const TRI_SYM: Record<string, string> = { 乾: '☰', 兑: '☱', 离: '☲', 震: '☳', 巽: '☴', 坎: '☵', 艮: '☶', 坤: '☷' }
const TRI_ELEM: Record<string, string> = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' }
const WUXING: Record<string, string> = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' }
const WCLASS: Record<string, string> = { 金: 'jin', 木: 'mu', 水: 'shui', 火: 'huo', 土: 'tu' }
const GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

interface Tiyong {
    be: string
    ue: string
    rel: string
    luck: string
    lclass: string
    head: string
}

function calcTiyong (body: string, use: string): Tiyong {
    const be = WUXING[body] ?? '', ue = WUXING[use] ?? ''
    if (be === ue) return { be, ue, rel: '体用比和', luck: '吉', lclass: 'good', head: '同气相求，得朋之助' }
    if (GEN[ue] === be) return { be, ue, rel: '用生体', luck: '大吉', lclass: 'good', head: '外来生扶，事半功倍' }
    if (KE[ue] === be) return { be, ue, rel: '用克体', luck: '凶', lclass: 'bad', head: '外力相逼，宜守不宜进' }
    if (GEN[be] === ue) return { be, ue, rel: '体生用', luck: '小凶', lclass: 'flat', head: '心力外耗，需量力而为' }
    return { be, ue, rel: '体克用', luck: '小吉', lclass: 'fair', head: '我能制事，惟须费力' }
}

function tyAdvice (luck: string): string {
    switch (luck) {
        case '大吉': return '所谋多有贵人或外缘相助，宜把握时机、顺势而为。'
        case '吉': return '内外协调、力量相当，守正循序则诸事可成。'
        case '小吉': return '事虽可成，然须亲力亲为，留意耗费心力与资源。'
        case '小凶': return '主体能量易被外事牵动消耗，宜节用、缓图，不必强求。'
        default: return '外缘相逼、阻力偏大，近期宜守不宜攻，避其锋而后图。'
    }
}

function shichenZhi (d: Date): string {
    return SHICHEN_ZHI[Math.floor(((d.getHours() + 1) % 24) / 2)]!
}

function pad2 (n: number): string {
    return n < 10 ? `0${n}` : String(n)
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const rnd = (max: number) => Math.floor(Math.random() * max) + 1

/** 初始：三格皆「待演」，逐格依次揭晓（上→下→动爻） */
const IDLE_TILES: Record<TileKind, TileData> = {
    up: { display: '—', state: 'idle', sym: '', tri: '' },
    low: { display: '—', state: 'idle', sym: '', tri: '' },
    yao: { display: '—', state: 'idle', sym: '', tri: '' }
}

interface BuildRow { filled: boolean, mark: string }

function Orb ({ role, trigram }: { role: string, trigram: string }) {
    const elem = WUXING[trigram] ?? ''
    return (
        <View className='meihua-panel__gua-orb'>
            <View className={`meihua-panel__orb meihua-panel__orb--${WCLASS[elem] ?? 'tu'}`}>
                <Text className='meihua-panel__orb-tri'>{TRI_SYM[trigram]}</Text>
                <Text className='meihua-panel__orb-name'>{trigram}</Text>
            </View>
            <Text className='meihua-panel__orb-role'>
                {role}<Text className='meihua-panel__orb-role-b'>{trigram}</Text>
            </Text>
            <Text className='meihua-panel__orb-elem'>五行属{elem}</Text>
        </View>
    )
}

export default function MeihuaPanel () {
    const [phase, setPhase] = useState<Phase>('setup')
    const [method, setMethod] = useState<MeihuaMethod>('time')
    const [question, setQuestion] = useState('')
    const [numberInput, setNumberInput] = useState('')
    const [result, setResult] = useState<MeihuaCastResponse | null>(null)
    const [streamText, setStreamText] = useState('')
    const [streaming, setStreaming] = useState(false)
    const [now, setNow] = useState(() => new Date())
    const [almanac, setAlmanac] = useState<AlmanacResponse | null>(null)

    // 演数成卦动画
    const [tiles, setTiles] = useState<Record<TileKind, TileData>>(IDLE_TILES)
    const [conjureSub, setConjureSub] = useState('观此刻之数，分定上下')
    const [buildRows, setBuildRows] = useState<BuildRow[]>([])
    const [buildShow, setBuildShow] = useState(false)
    const [quota, setQuota] = useState<PointsQuota | null>(null)
    const [castAnimDone, setCastAnimDone] = useState(false)
    const [interpreting, setInterpreting] = useState(false)

    const abortRef = useRef<AbortController | null>(null)
    const castRunRef = useRef(0)
    const rollIvRef = useRef<number | null>(null)
    const resultRef = useRef<MeihuaCastResponse | null>(null)
    const castBodyRef = useRef<MeihuaDivineRequest | null>(null)
    const interpretationRef = useRef<string | null>(null)
    const resultShownRef = useRef(false)
    const castBusyRef = useRef(false)
    const interpretingRef = useRef(false)

    useEffect(() => {
        if (!isLoggedIn()) {
            setQuota(null)
            return
        }
        void fetchPointsQuota('meihua').then(setQuota).catch(() => {})
    }, [])

    const refreshQuota = useCallback(() => {
        if (!isLoggedIn()) return
        void fetchPointsQuota('meihua').then(setQuota).catch(() => {})
    }, [])

    // 时间起卦预览：每秒更新的时钟
    useEffect(() => {
        if (phase !== 'setup' || method !== 'time') return
        const t = window.setInterval(() => setNow(new Date()), 1000)
        return () => window.clearInterval(t)
    }, [phase, method])

    // 拉取当日农历干支用于预览卡片
    useEffect(() => {
        let alive = true
        getAlmanacDay()
            .then((res) => { if (alive) setAlmanac(res) })
            .catch(() => {})
        return () => { alive = false }
    }, [])

    const clearRoll = useCallback(() => {
        if (rollIvRef.current != null) {
            window.clearInterval(rollIvRef.current)
            rollIvRef.current = null
        }
    }, [])

    useEffect(() => () => { clearRoll(); abortRef.current?.abort() }, [clearRoll])

    const validate = useCallback((): string | null => {
        if (!question.trim()) return '请先输入或选择问事'
        if (method === 'number') {
            const n = Number(numberInput.trim())
            if (!numberInput.trim() || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
                return '请输入一个正整数'
            }
        }
        return null
    }, [question, method, numberInput])

    const startStream = useCallback((text: string) => {
        const ac = abortRef.current
        setStreaming(true)
        setStreamText('')
        void streamInterpretationText(
            text,
            (chunk) => setStreamText((prev) => prev + chunk),
            ac?.signal
        ).finally(() => setStreaming(false))
    }, [])

    const lockTile = useCallback((kind: TileKind, num: number | string, sym: string, tri: string) => {
        setTiles((prev) => ({ ...prev, [kind]: { display: String(num), state: 'locked', sym, tri } }))
    }, [])

    const snapTilesFromCast = useCallback((res: MeihuaCastResponse) => {
        const upT = res.upper_trigram
        const lowT = res.lower_trigram
        const upN = PRENUM[upT] ?? 0
        const lowN = PRENUM[lowT] ?? 0
        const yao = res.moving_line
        setTiles({
            up: { display: String(upN), state: 'locked', sym: TRI_SYM[upT] ?? '', tri: `${upT}　${TRI_ELEM[upT] ?? ''}` },
            low: { display: String(lowN), state: 'locked', sym: TRI_SYM[lowT] ?? '', tri: `${lowT}　${TRI_ELEM[lowT] ?? ''}` },
            yao: {
                display: String(yao),
                state: 'locked',
                sym: movingLineMark(res.ben_gua, yao),
                tri: `第 ${yao} 爻 · 动`
            }
        })
    }, [])

    const finishToResult = useCallback(() => {
        if (resultShownRef.current) return
        castRunRef.current += 1
        clearRoll()
        if (resultRef.current) snapTilesFromCast(resultRef.current)
        resultShownRef.current = true
        setCastAnimDone(false)
        setBuildShow(false)
        setBuildRows([])
        setPhase('result')
        setStreaming(false)
        setStreamText('')
    }, [clearRoll, snapTilesFromCast])

    const startRollInterval = useCallback(() => {
        rollIvRef.current = window.setInterval(() => {
            setTiles((prev) => ({
                up: prev.up.state === 'rolling' ? { ...prev.up, display: String(rnd(8)) } : prev.up,
                low: prev.low.state === 'rolling' ? { ...prev.low, display: String(rnd(8)) } : prev.low,
                yao: prev.yao.state === 'rolling' ? { ...prev.yao, display: String(rnd(6)) } : prev.yao
            }))
        }, 50)
    }, [])

    const runCastAnimation = useCallback(async (res: MeihuaCastResponse) => {
        const runId = ++castRunRef.current
        const alive = () => castRunRef.current === runId
        const upT = res.upper_trigram, lowT = res.lower_trigram
        const upN = PRENUM[upT] ?? 0, lowN = PRENUM[lowT] ?? 0
        const yao = res.moving_line

        const subSteps = method === 'time'
            ? ['年月日之数，定上卦', '并此刻时辰，定下卦', '总数除六，定动爻']
            : ['由心念之数，定上卦', '合此刻时辰，定下卦', '总数除六，定动爻']
        const setRolling = (kind: TileKind) =>
            setTiles((prev) => ({ ...prev, [kind]: { ...prev[kind], state: 'rolling' } }))

        const reveal = async (kind: TileKind, sub: string, num: number, sym: string, tri: string) => {
            setConjureSub(sub)
            setRolling(kind)
            await sleep(920)
            if (!alive()) return false
            lockTile(kind, num, sym, tri)
            return true
        }

        await sleep(280)
        if (!alive()) return
        if (!(await reveal('up', subSteps[0], upN, TRI_SYM[upT] ?? '', `${upT}　${TRI_ELEM[upT] ?? ''}`))) return
        await sleep(320)
        if (!alive()) return
        if (!(await reveal('low', subSteps[1], lowN, TRI_SYM[lowT] ?? '', `${lowT}　${TRI_ELEM[lowT] ?? ''}`))) return
        await sleep(320)
        if (!alive()) return
        if (!(await reveal('yao', subSteps[2], yao, movingLineMark(res.ben_gua, yao), `第 ${yao} 爻 · 动`))) return
        clearRoll()
        if (!alive()) return
        setCastAnimDone(true)
        setConjureSub('三数已定 · 点击下方「直接看卦」')
    }, [method, lockTile, clearRoll])

    const cast = useCallback(async () => {
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }
        if (!ensureLoggedIn()) return
        if (castBusyRef.current) return

        const body: MeihuaDivineRequest = method === 'number'
            ? { method: 'number', question: question.trim(), number: Number(numberInput.trim()) }
            : { method: 'time', question: question.trim() }
        castBodyRef.current = body

        castBusyRef.current = true

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac
        resultShownRef.current = false
        resultRef.current = null
        interpretationRef.current = null

        const isTime = method === 'time'
        setResult(null)
        setStreamText('')
        setStreaming(false)
        setBuildRows([])
        setBuildShow(false)
        setCastAnimDone(false)
        setTiles(IDLE_TILES)
        setConjureSub(isTime ? '凝神，取此刻天地之数…' : '凝神，演心念之数…')
        setPhase('casting')

        clearRoll()
        startRollInterval()

        try {
            const cast = await postMeihuaCast(body)
            if (ac.signal.aborted) return
            resultRef.current = cast
            setResult(cast)
            await runCastAnimation(cast)
        } catch (e) {
            if (!ac.signal.aborted) {
                clearRoll()
                setPhase('setup')
                const msg = e instanceof Error ? e.message : '起卦失败'
                void Taro.showToast({ title: msg.length > 20 ? '起卦失败' : msg, icon: 'none' })
            }
        } finally {
            castBusyRef.current = false
        }
    }, [validate, method, question, numberInput, clearRoll, runCastAnimation, startRollInterval])

    const onInterpret = useCallback(async () => {
        const body = castBodyRef.current
        if (!body || !result || interpretingRef.current || streamText) return
        if (!ensureLoggedIn()) return

        let txId: number | undefined
        try {
            const { quoteForFeature } = await import('@/hooks/usePoints')
            const quote = await quoteForFeature({ feature: 'meihua' })
            const skipConfirm = quote.uses_free_quota

            const points = await ensurePoints({
                feature: 'meihua',
                idempotency_key: `meihua:interpret:${method}:${question.trim()}:${Date.now()}`,
                skipConfirm
            })
            if (!points) return

            interpretingRef.current = true
            setInterpreting(true)

            txId = points.transaction_id

            const full = await postMeihuaDivine(body)
            if (abortRef.current?.signal.aborted) return

            interpretationRef.current = full.interpretation
            startStream(full.interpretation)
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
        }
    }, [result, streamText, method, question, startStream, refreshQuota])

    const skipToResult = useCallback(() => {
        if (resultRef.current) finishToResult()
    }, [finishToResult])

    const reset = useCallback(() => {
        if (interpretingRef.current || streaming) return
        abortRef.current?.abort()
        castRunRef.current += 1
        clearRoll()
        resultShownRef.current = false
        resultRef.current = null
        interpretationRef.current = null
        castBodyRef.current = null
        castBusyRef.current = false
        interpretingRef.current = false
        setInterpreting(false)
        setPhase('setup')
        setResult(null)
        setStreamText('')
        setStreaming(false)
        setBuildRows([])
        setBuildShow(false)
        setCastAnimDone(false)
        setTiles(IDLE_TILES)
    }, [clearRoll, streaming])

    const canGoBack = phase !== 'setup'

    const goBack = useCallback(() => {
        if (interpretingRef.current || streaming) return
        abortRef.current?.abort()
        castRunRef.current += 1
        clearRoll()
        castBusyRef.current = false
        interpretingRef.current = false
        setInterpreting(false)
        setStreaming(false)
        setStreamText('')
        setBuildRows([])
        setBuildShow(false)
        setCastAnimDone(false)
        setTiles(IDLE_TILES)
        resultShownRef.current = false
        resultRef.current = null
        interpretationRef.current = null
        setResult(null)
        setPhase('setup')
    }, [clearRoll, streaming])

    const tile = useCallback((kind: TileKind, cap: string) => {
        const t = tiles[kind]
        return (
            <View className={`meihua-panel__tile meihua-panel__tile--${t.state} ${kind === 'yao' ? 'meihua-panel__tile--yao' : ''}`}>
                <Text className='meihua-panel__tile-cap'>{cap}</Text>
                <View className='meihua-panel__tile-num-wrap'>
                    <Text
                        key={t.state === 'rolling' ? `${kind}-${t.display}` : `${kind}-locked`}
                        className={`meihua-panel__tile-num ${t.state === 'rolling' ? 'meihua-panel__tile-num--roll' : ''}`}
                    >
                        {t.display}
                    </Text>
                </View>
                <Text className='meihua-panel__tile-sym'>{t.sym}</Text>
                <Text className='meihua-panel__tile-tri'>{t.tri}</Text>
            </View>
        )
    }, [tiles])

    const ty = result ? calcTiyong(result.ti_trigram, result.yong_trigram) : null
    const basisRows: [string, string][] = result
        ? [
            ['方式', result.method_label],
            ['依据', result.method_detail],
            ['上卦', `先天 ${PRENUM[result.upper_trigram] ?? '—'} 数 · ${result.upper_trigram}（${TRI_ELEM[result.upper_trigram] ?? ''}）`],
            ['下卦', `先天 ${PRENUM[result.lower_trigram] ?? '—'} 数 · ${result.lower_trigram}（${TRI_ELEM[result.lower_trigram] ?? ''}）`],
            ['动爻', `第 ${result.moving_line} 爻`],
            ['体用', `体${result.ti_trigram}（${WUXING[result.ti_trigram] ?? ''}）· 用${result.yong_trigram}（${WUXING[result.yong_trigram] ?? ''}）`]
        ]
        : []

    const interpretBusy = interpreting || streaming

    return (
        <View className={`meihua-panel ${phase === 'casting' ? 'meihua-panel--casting' : ''}`}>
            <View className='meihua-panel__scroll'>
                {canGoBack && <PanelBackButton onClick={goBack} disabled={interpretBusy} />}

                {phase === 'setup' && (
                    <DivineSetup
                        prompts={MEIHUA_PROMPTS}
                        question={question}
                        onQuestionChange={setQuestion}
                        inputPlaceholder='写下你想问的事，凝神默念三遍…'
                        methodLabel='起卦方式'
                        methods={MEIHUA_METHODS}
                        activeMethod={method}
                        onMethodChange={(k) => setMethod(k as MeihuaMethod)}
                        ctaText='演　数　起　卦'
                        onCast={() => void cast()}
                    >
                        {method === 'time' && (
                            <View className='meihua-panel__mode-panel'>
                                <View className='meihua-panel__clock-card'>
                                    <View className='meihua-panel__shi-dial'>
                                        <Text className='meihua-panel__shi-branch'>{shichenZhi(now)}</Text>
                                        <Text className='meihua-panel__shi-cap'>时</Text>
                                        <View className='meihua-panel__shi-tick meihua-panel__shi-tick--n' />
                                        <View className='meihua-panel__shi-tick meihua-panel__shi-tick--s' />
                                        <View className='meihua-panel__shi-tick meihua-panel__shi-tick--e' />
                                        <View className='meihua-panel__shi-tick meihua-panel__shi-tick--w' />
                                    </View>
                                    {almanac
                                        ? (
                                            <Text className='meihua-panel__clock-lunar'>
                                                {`${almanac.lunar.year_ganzhi}年 ${almanac.lunar.month_day}`}
                                            </Text>
                                        )
                                        : <PendingText className='meihua-panel__clock-lunar'>正在推算农历</PendingText>}
                                    <Text className='meihua-panel__clock-greg'>
                                        {now.getFullYear()} · {pad2(now.getMonth() + 1)} · {pad2(now.getDate())}
                                        <Text className='meihua-panel__clock-time'>
                                            {`  ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`}
                                        </Text>
                                    </Text>
                                    <Text className='meihua-panel__clock-note'>
                                        上、下卦取此刻农历年月日时；动爻另加分秒，每次起卦可不同
                                    </Text>
                                </View>
                            </View>
                        )}

                        {method === 'number' && (
                            <View className='meihua-panel__mode-panel'>
                                <View className='meihua-panel__num-card'>
                                    <Text className='meihua-panel__num-label'>心念之数</Text>
                                    <Input
                                        className='meihua-panel__num-input'
                                        value={numberInput}
                                        placeholder='⋯'
                                        placeholderClass='meihua-panel__num-ph'
                                        type='number'
                                        onInput={(e) => setNumberInput(e.detail.value)}
                                    />
                                    <View className='meihua-panel__num-foot'>
                                        <Text className='meihua-panel__num-hint'>凝神默想，随手写下一个正整数</Text>
                                        <View
                                            className='meihua-panel__num-rand'
                                            onClick={() => setNumberInput(String(Math.floor(Math.random() * 9999) + 1))}
                                        >
                                            <Text className='meihua-panel__num-rand-txt'>随手拈来</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                    </DivineSetup>
                )}

                {phase === 'casting' && (
                    <View className='meihua-panel__cast'>
                        <View className='meihua-panel__q-card'>
                            <Text className='meihua-panel__q-tag'>所问</Text>
                            <Text className='meihua-panel__q-text'>{question.trim()}</Text>
                            <View
                                className={`meihua-panel__q-edit ${interpretBusy ? 'meihua-panel__q-edit--disabled' : ''}`}
                                onClick={() => { if (!interpretBusy) goBack() }}
                            >
                                <Text>改</Text>
                            </View>
                        </View>

                        <View className='meihua-panel__conjure'>
                            <Text className='meihua-panel__conjure-title'>演 数 成 卦</Text>
                            <Text className='meihua-panel__conjure-sub'>{conjureSub}</Text>

                            <View className='meihua-panel__tiles'>
                                {tile('up', '上 卦 数')}
                                {tile('low', '下 卦 数')}
                                {tile('yao', '动 爻')}
                            </View>

                            {buildShow && (
                                <View className='meihua-panel__build meihua-panel__build--show'>
                                    {buildRows.map((r, i) => {
                                        const yang = (result?.ben_gua.bits[i] ?? 0) === 1
                                        return (
                                            <View
                                                key={i}
                                                className={`meihua-panel__bl ${r.filled ? 'meihua-panel__bl--filled' : ''} ${r.mark ? 'meihua-panel__bl--move' : ''}`}
                                            >
                                                <Text className='meihua-panel__bl-name'>{YAO_LABELS[i]}</Text>
                                                <View className='meihua-panel__bl-bar'>
                                                    {yang
                                                        ? <View className='meihua-panel__bl-seg' />
                                                        : (
                                                            <>
                                                                <View className='meihua-panel__bl-seg' />
                                                                <View className='meihua-panel__bl-seg' />
                                                            </>
                                                        )}
                                                </View>
                                                <Text className='meihua-panel__bl-mk'>{r.mark}</Text>
                                            </View>
                                        )
                                    })}
                                </View>
                            )}
                        </View>

                        <View className='meihua-panel__cast-foot'>
                            <View
                                className={`meihua-panel__btn-skip ${castAnimDone ? 'meihua-panel__btn-skip--ready' : ''}`}
                                onClick={skipToResult}
                            >
                                <Text className='meihua-panel__btn-skip-txt'>直接看卦</Text>
                            </View>
                        </View>
                    </View>
                )}

                {phase === 'result' && result && ty && (
                    <View className='meihua-panel__result'>
                        <View className='meihua-panel__res-q'>
                            <Text className='meihua-panel__q-tag'>所问</Text>
                            <Text className='meihua-panel__res-q-text'>{question.trim()}</Text>
                        </View>

                        {quota && quota.free_remaining > 0 && (
                            <Text className='meihua-panel__quota'>
                                今日免费解卦剩余 {quota.free_remaining} 次
                            </Text>
                        )}

                        <View className='meihua-panel__basis'>
                            {basisRows.map(([k, v]) => (
                                <View key={k} className='meihua-panel__basis-row'>
                                    <Text className='meihua-panel__basis-dt'>{k}</Text>
                                    <Text className='meihua-panel__basis-dd'>{v}</Text>
                                </View>
                            ))}
                        </View>

                        <View className='meihua-panel__tiyong'>
                            <View className='meihua-panel__ty-head'>
                                <Text className='meihua-panel__ty-title'>体用生克</Text>
                                <Text className={`meihua-panel__ty-luck meihua-panel__ty-luck--${ty.lclass}`}>{ty.luck}</Text>
                            </View>
                            <View className='meihua-panel__ty-flow'>
                                <Orb role='体 ' trigram={result.ti_trigram} />
                                <View className='meihua-panel__ty-rel'>
                                    <Text className='meihua-panel__rel-word'>{ty.rel}</Text>
                                    <View className='meihua-panel__rel-line' />
                                    <Text className='meihua-panel__rel-desc'>{ty.head}</Text>
                                </View>
                                <Orb role='用 ' trigram={result.yong_trigram} />
                            </View>
                            <View className='meihua-panel__ty-note'>
                                <Text className='meihua-panel__ty-note-text'>
                                    {`体卦为${result.ti_trigram}（${ty.be}），代表自身、所问之主体；用卦为${result.yong_trigram}（${ty.ue}），代表外事、应机之客体。二者${ty.rel}，${ty.head}——${tyAdvice(ty.luck)}`}
                                </Text>
                            </View>
                        </View>

                        <View className='meihua-panel__hex-cards'>
                            <GuaPanel role='本卦' gua={result.ben_gua} movingLine={result.moving_line} />
                            <GuaPanel role='变卦' gua={result.bian_gua} />
                            <GuaPanel role='互卦' gua={result.hu_gua} />
                        </View>

                        {!streamText && (
                            <View className='meihua-panel__actions'>
                                <View
                                    className={`meihua-panel__ghost-btn ${interpretBusy ? 'meihua-panel__ghost-btn--disabled' : ''}`}
                                    onClick={() => { if (!interpretBusy) reset() }}
                                >
                                    <Text className='meihua-panel__ghost-txt'>重 新 起 卦</Text>
                                </View>
                                <View
                                    className={`meihua-panel__cta meihua-panel__cta--interpret ${interpretBusy ? 'meihua-panel__cta--disabled' : ''}`}
                                    onClick={() => { if (!interpretBusy) void onInterpret() }}
                                >
                                    {interpreting
                                        ? <PendingText className='meihua-panel__cta-txt'>解卦中</PendingText>
                                        : <Text className='meihua-panel__cta-txt'>解 卦</Text>}
                                </View>
                            </View>
                        )}

                        {(streamText || streaming) && (
                            <View className='meihua-panel__reading'>
                            <View className='meihua-panel__reading-head'>
                                <Text className='meihua-panel__reading-title'>解 曰</Text>
                                {streaming
                                    ? <PendingText className='meihua-panel__reading-pill'>推演中</PendingText>
                                    : <Text className='meihua-panel__reading-pill'>玄机已断</Text>}
                            </View>
                            {streamText
                                ? <MarkdownView className='meihua-panel__reading-md' content={streamText} />
                                : (
                                    streaming
                                        ? <PendingText className='meihua-panel__reading-wait'>卦象洞开，解语将至</PendingText>
                                        : <Text className='meihua-panel__reading-wait'>暂无解卦内容</Text>
                                )}
                        </View>
                        )}

                    </View>
                )}
            </View>
        </View>
    )
}
