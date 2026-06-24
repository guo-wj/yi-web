import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'

import DivineSetup from '@/components/DivineSetup'
import MarkdownView from '@/components/MarkdownView'
import {
    MEIHUA_METHODS,
    MEIHUA_PROMPTS,
    type MeihuaMethod
} from '@/constants/meihuaOptions'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { getAlmanacDay, type AlmanacResponse } from '@/services/almanacApi'
import {
    postMeihuaCast,
    postMeihuaDivine,
    streamInterpretationText,
    type MeihuaCastResponse,
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

function HexCard ({
    role,
    gua,
    movingLine,
    ghost
}: {
    role: string
    gua: MeihuaGua
    movingLine?: number
    ghost?: boolean
}) {
    return (
        <View className={`meihua-panel__hex ${ghost ? 'meihua-panel__hex--ghost' : ''}`}>
            <Text className='meihua-panel__hex-role'>{role}</Text>
            <Text className='meihua-panel__hex-name'>{gua.name}</Text>
            <Text className='meihua-panel__hex-meta'>
                第 {gua.number} 卦 · {gua.upper_trigram}上{gua.lower_trigram}下
            </Text>
            <View className='meihua-panel__hex-lines'>
                {gua.bits.map((bit, i) => {
                    const yang = bit === 1
                    const moving = !ghost && movingLine === i + 1
                    const mark = moving ? (yang ? '○' : '✕') : ''
                    return (
                        <View
                            key={i}
                            className={`meihua-panel__hex-line ${moving ? 'meihua-panel__hex-line--moving' : ''}`}
                        >
                            <Text className='meihua-panel__hl-name'>{YAO_LABELS[i]}</Text>
                            <View className='meihua-panel__hl-bar'>
                                {yang
                                    ? <View className='meihua-panel__hl-seg' />
                                    : (
                                        <>
                                            <View className='meihua-panel__hl-seg' />
                                            <View className='meihua-panel__hl-seg' />
                                        </>
                                    )}
                            </View>
                            <Text className='meihua-panel__hl-mk'>{mark}</Text>
                        </View>
                    )
                })}
            </View>
        </View>
    )
}

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

    const abortRef = useRef<AbortController | null>(null)
    const castRunRef = useRef(0)
    const rollIvRef = useRef<number | null>(null)
    const resultRef = useRef<MeihuaCastResponse | null>(null)
    const interpretationRef = useRef<string | null>(null)
    const resultShownRef = useRef(false)
    const castBusyRef = useRef(false)

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

    const finishToResult = useCallback(() => {
        if (resultShownRef.current) return
        resultShownRef.current = true
        castRunRef.current += 1
        clearRoll()
        setPhase('result')
        // 解读已就绪则直接流式输出；否则置「推演中」，待 /divine 返回后再流
        if (interpretationRef.current != null) {
            startStream(interpretationRef.current)
        } else {
            setStreaming(true)
            setStreamText('')
        }
    }, [clearRoll, startStream])

    const lockTile = useCallback((kind: TileKind, num: number | string, sym: string, tri: string) => {
        setTiles((prev) => ({ ...prev, [kind]: { display: String(num), state: 'locked', sym, tri } }))
    }, [])

    const runCastAnimation = useCallback(async (res: MeihuaCastResponse) => {
        const runId = ++castRunRef.current
        const alive = () => castRunRef.current === runId
        const upT = res.upper_trigram, lowT = res.lower_trigram
        const upN = PRENUM[upT] ?? 0, lowN = PRENUM[lowT] ?? 0
        const yao = res.moving_line
        const lines = res.ben_gua.bits
        const idx = yao - 1

        const isTime = method === 'time'
        const subSteps = isTime
            ? ['年月日之数，定上卦', '并此刻时辰，定下卦', '总数除六，定动爻']
            : ['由心念之数，定上卦', '合此刻时辰，定下卦', '总数除六，定动爻']
        const setRolling = (kind: TileKind) =>
            setTiles((prev) => ({ ...prev, [kind]: { ...prev[kind], state: 'rolling' } }))

        // 逐格依次揭晓：数字起卦本格滚动再定格，时间起卦取此刻之数直接亮出
        const reveal = async (kind: TileKind, sub: string, num: number, sym: string, tri: string) => {
            setConjureSub(sub)
            if (isTime) {
                await sleep(480)
            } else {
                setRolling(kind)
                await sleep(760)
            }
            if (!alive()) return false
            lockTile(kind, num, sym, tri)
            return true
        }

        await sleep(isTime ? 360 : 240); if (!alive()) return
        if (!(await reveal('up', subSteps[0], upN, TRI_SYM[upT] ?? '', `${upT}　${TRI_ELEM[upT] ?? ''}`))) return
        await sleep(300); if (!alive()) return
        if (!(await reveal('low', subSteps[1], lowN, TRI_SYM[lowT] ?? '', `${lowT}　${TRI_ELEM[lowT] ?? ''}`))) return
        await sleep(300); if (!alive()) return
        if (!(await reveal('yao', subSteps[2], yao, '', `第 ${yao} 爻 · 动`))) return
        clearRoll()
        await sleep(520); if (!alive()) return

        setBuildRows(lines.map(() => ({ filled: false, mark: '' })))
        setBuildShow(true)
        for (let s = 0; s < 6; s++) {
            await sleep(150); if (!alive()) return
            setBuildRows((prev) => prev.map((r, i) => (i === s ? { ...r, filled: true } : r)))
        }
        await sleep(220); if (!alive()) return
        setBuildRows((prev) => prev.map((r, i) => (i === idx ? { ...r, mark: lines[idx] === 1 ? '○' : '✕' } : r)))
        await sleep(820); if (!alive()) return
        finishToResult()
    }, [method, lockTile, clearRoll, finishToResult])

    const cast = useCallback(async () => {
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }
        if (!ensureLoggedIn()) return
        if (castBusyRef.current) return
        castBusyRef.current = true

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac
        resultShownRef.current = false
        resultRef.current = null

        const isTime = method === 'time'
        interpretationRef.current = null
        setResult(null)
        setStreamText('')
        setStreaming(false)
        setBuildRows([])
        setBuildShow(false)
        setTiles(IDLE_TILES)
        setConjureSub(isTime ? '凝神，取此刻天地之数…' : '凝神，演心念之数…')
        setPhase('casting')

        clearRoll()
        // 数字起卦：逐格滚动随机数（每次仅当前格滚动）；时间起卦取此刻之数，不滚动
        if (!isTime) {
            rollIvRef.current = window.setInterval(() => {
                setTiles((prev) => ({
                    up: prev.up.state === 'rolling' ? { ...prev.up, display: String(rnd(8)) } : prev.up,
                    low: prev.low.state === 'rolling' ? { ...prev.low, display: String(rnd(8)) } : prev.low,
                    yao: prev.yao.state === 'rolling' ? { ...prev.yao, display: String(rnd(6)) } : prev.yao
                }))
            }, 60)
        }

        const body = method === 'number'
            ? { method: 'number' as const, question: question.trim(), number: Number(numberInput.trim()) }
            : { method: 'time' as const, question: question.trim() }

        // 解读（含 LLM，较慢）后台并行获取，返回后再流式输出
        void postMeihuaDivine(body)
            .then((full) => {
                if (ac.signal.aborted) return
                interpretationRef.current = full.interpretation
                if (resultShownRef.current) startStream(full.interpretation)
            })
            .catch((e) => {
                if (ac.signal.aborted) return
                const msg = e instanceof Error ? e.message : '解读生成失败'
                interpretationRef.current = `（${msg.length > 30 ? '解读生成失败，请稍后重试' : msg}）`
                if (resultShownRef.current) startStream(interpretationRef.current)
            })

        try {
            // 起数成卦（无 LLM，秒级）→ 立即驱动演数动画与卦象展示
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
    }, [validate, method, question, numberInput, clearRoll, runCastAnimation, startStream])

    const skipToResult = useCallback(() => {
        if (resultRef.current) finishToResult()
    }, [finishToResult])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        castRunRef.current += 1
        clearRoll()
        resultShownRef.current = false
        resultRef.current = null
        interpretationRef.current = null
        castBusyRef.current = false
        setPhase('setup')
        setResult(null)
        setStreamText('')
        setStreaming(false)
        setBuildRows([])
        setBuildShow(false)
        setTiles(IDLE_TILES)
    }, [clearRoll])

    const tile = useCallback((kind: TileKind, cap: string) => {
        const t = tiles[kind]
        return (
            <View className={`meihua-panel__tile meihua-panel__tile--${t.state} ${kind === 'yao' ? 'meihua-panel__tile--yao' : ''}`}>
                <Text className='meihua-panel__tile-cap'>{cap}</Text>
                <Text className='meihua-panel__tile-num'>{t.display}</Text>
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

    return (
        <View className='meihua-panel'>
            <View className='meihua-panel__scroll'>
                <View className='meihua-panel__head'>
                    <Text className='meihua-panel__title'>梅花易数</Text>
                    <Text className='meihua-panel__subtitle'>先天起数 · 体用生克 · 观象玩占</Text>
                </View>

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
                        hint='先择问事，再观此刻之数'
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
                                    <Text className='meihua-panel__clock-lunar'>
                                        {almanac
                                            ? `${almanac.lunar.year_ganzhi}年 ${almanac.lunar.month_day}`
                                            : '正在推算农历…'}
                                    </Text>
                                    <Text className='meihua-panel__clock-greg'>
                                        {now.getFullYear()} · {pad2(now.getMonth() + 1)} · {pad2(now.getDate())}
                                        <Text className='meihua-panel__clock-time'>
                                            {`  ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`}
                                        </Text>
                                    </Text>
                                    <Text className='meihua-panel__clock-note'>
                                        点击起卦，以此刻农历年月日时之数，先天成卦
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
                            <View className='meihua-panel__q-edit' onClick={reset}>
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

                            <View className='meihua-panel__skip-row'>
                                <View className='meihua-panel__btn-skip' onClick={skipToResult}>
                                    <Text className='meihua-panel__btn-skip-txt'>直接看卦</Text>
                                </View>
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
                            <HexCard role='本　卦' gua={result.ben_gua} movingLine={result.moving_line} />
                            <View className='meihua-panel__hex-arrow'>
                                <Text className='meihua-panel__hex-arrow-t'>动而之</Text>
                                <Text className='meihua-panel__hex-arrow-s'>↓</Text>
                            </View>
                            <HexCard role='变　卦' gua={result.bian_gua} ghost />
                            <View className='meihua-panel__hex-arrow'>
                                <Text className='meihua-panel__hex-arrow-t'>互见</Text>
                                <Text className='meihua-panel__hex-arrow-s'>·</Text>
                            </View>
                            <HexCard role='互　卦' gua={result.hu_gua} ghost />
                        </View>

                        <View className='meihua-panel__reading'>
                            <View className='meihua-panel__reading-head'>
                                <Text className='meihua-panel__reading-title'>解 曰</Text>
                                <Text className='meihua-panel__reading-pill'>{streaming ? '推演中…' : '玄机已断'}</Text>
                            </View>
                            {streamText
                                ? <MarkdownView className='meihua-panel__reading-md' content={streamText} />
                                : (
                                    <Text className='meihua-panel__reading-wait'>
                                        {streaming ? '卦象洞开，解语将至…' : '暂无解卦内容'}
                                    </Text>
                                )}
                        </View>

                        {!streaming && (
                            <View className='meihua-panel__ghost-btn' onClick={reset}>
                                <Text className='meihua-panel__ghost-txt'>重 新 起 卦</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}
