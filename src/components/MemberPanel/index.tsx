import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'

import PendingText, { LoadingDots } from '@/components/LoadingDots'
import { POINTS_FEATURE_COST } from '@/constants/pointsFeatures'
import { usePoints } from '@/hooks/usePoints'
import {
    fetchMemberPlans,
    fetchPointsLedger,
    postMemberOrder,
    postPaymentConfirm,
    postPointsCheckin,
    postRechargeOrder,
    type MemberPlan,
    type PointsLedgerItem,
    type RechargePlan
} from '@/services/pointsApi'
import { getShellSettingsState, subscribeShellSettings } from '@/utils/shellSettings'
import { ensureLoggedIn } from '@/utils/requireAuth'

import './index.scss'

type TabKey = 'overview' | 'checkin' | 'tx' | 'recharge' | 'member'
export type MemberPanelTabKey = TabKey
type PayMethod = 'wechat' | 'alipay'

const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'checkin', label: '签到' },
    { key: 'tx', label: '流水' },
    { key: 'recharge', label: '充值' },
    { key: 'member', label: '会员' }
]

/** 后端 7 日循环签到奖励（与 postPointsCheckin 一致），第 7 天为满周奖励 */
const WEEK: { lbl: string; amt: number; bonus?: boolean }[] = [
    { lbl: '第1天', amt: 5 },
    { lbl: '第2天', amt: 5 },
    { lbl: '第3天', amt: 8 },
    { lbl: '第4天', amt: 8 },
    { lbl: '第5天', amt: 10 },
    { lbl: '第6天', amt: 10 },
    { lbl: '第7天', amt: 20, bonus: true }
]

const PAID_RUNES = ['道', '玄', '尊']

// ---------------- icons ----------------
const IC = {
    arrowLeft: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round'><path d='M15 18l-6-6 6-6' /></svg>
    ),
    plus: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.8} strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' /></svg>
    ),
    check: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.7} strokeLinecap='round' strokeLinejoin='round'><path d='M20 6L9 17l-5-5' /></svg>
    ),
    checkBold: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round'><path d='M20 6L9 17l-5-5' /></svg>
    ),
    coin: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='8.5' /><rect x='9.5' y='9.5' width='5' height='5' transform='rotate(45 12 12)' /></svg>
    ),
    cast: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinecap='round' strokeLinejoin='round'><line x1='4' y1='6' x2='20' y2='6' /><line x1='4' y1='10' x2='10' y2='10' /><line x1='14' y1='10' x2='20' y2='10' /><line x1='4' y1='14' x2='20' y2='14' /><line x1='4' y1='18' x2='10' y2='18' /><line x1='14' y1='18' x2='20' y2='18' /></svg>
    ),
    wallet: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='6' width='18' height='13' rx='2.5' /><path d='M3 10h18' /><circle cx='16.5' cy='14' r='1.2' /></svg>
    ),
    fire: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinecap='round' strokeLinejoin='round'><path d='M12 3c1 3.5 4 4.5 4 8a4 4 0 0 1-8 0c0-1.2.4-2 1-2.8C9 10 9 8 12 3z' /><path d='M12 21a5 5 0 0 0 5-5c0-2-1-3.5-2-4.5.2 2-1 3-1.5 3.2.3-2-1.5-4.2-3-5C11 12 8 13 8 16a4 4 0 0 0 4 5z' /></svg>
    ),
    star: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinecap='round' strokeLinejoin='round'><path d='M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z' /></svg>
    ),
    book: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinecap='round' strokeLinejoin='round'><path d='M4 5.5A2 2 0 0 1 6 4h6v15H6a2 2 0 0 0-2 1.5z' /><path d='M20 5.5A2 2 0 0 0 18 4h-6v15h6a2 2 0 0 1 2 1.5z' /></svg>
    ),
    disc: (
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.6} strokeLinecap='round' strokeLinejoin='round'><line x1='19' y1='5' x2='5' y2='19' /><circle cx='8' cy='8' r='2' /><circle cx='16' cy='16' r='2' /></svg>
    )
}

function formatYuan (cents: number): string {
    const yuan = cents / 100
    return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2)
}

/** 流水时间：今天 HH:mm / 昨天 HH:mm / M月D日 HH:mm */
function formatTxDate (iso: string): string {
    const d = new Date(iso.replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ')
    const now = new Date()
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    const yest = new Date(now)
    yest.setDate(now.getDate() - 1)
    if (sameDay(d, now)) return `今天 ${hm}`
    if (sameDay(d, yest)) return `昨天 ${hm}`
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

function ledgerTitle (item: PointsLedgerItem): string {
    if (item.note) return item.note
    const typeMap: Record<string, string> = {
        grant: '积分获得',
        consume: '积分消耗',
        refund: '积分退回',
        expire: '积分过期',
        admin: '积分调整',
        checkin: '每日签到',
        recharge: '积分充值'
    }
    return typeMap[item.type] ?? item.type
}

function planFeatureList (plan: MemberPlan): string[] {
    const feats = [
        `每月赠 ${plan.monthly_points} 积分`,
        `全部起卦 ${Math.round(plan.discount * 10)} 折`
    ]
    if (plan.qian_free_daily > 0) feats.push(`每日灵签免费 ${plan.qian_free_daily} 次`)
    if (plan.liuyao_free_daily > 0) feats.push(`六爻起卦免费 ${plan.liuyao_free_daily} 次/日`)
    if (plan.meihua_free_daily > 0) feats.push(`梅花易数免费 ${plan.meihua_free_daily} 次/日`)
    if (plan.bazi_free_daily > 0) feats.push(`八字命理免费 ${plan.bazi_free_daily} 次/日`)
    if (plan.palm_free_daily > 0) feats.push(`掌纹解析免费 ${plan.palm_free_daily} 次/日`)
    if (plan.face_free_daily > 0) feats.push(`面相解析免费 ${plan.face_free_daily} 次/日`)
    return feats
}

function parseMemberTab (raw?: string): TabKey {
    if (raw === 'ledger') return 'tx'
    if (['overview', 'checkin', 'tx', 'recharge', 'member'].includes(raw ?? '')) {
        return raw as TabKey
    }
    return 'overview'
}

interface MemberPanelProps {
    /** 嵌入功能页 shell，隐藏返回与页头 */
    embedded?: boolean
    initialTab?: TabKey
}

export default function MemberPanel ({
    embedded = false,
    initialTab: initialTabProp
}: MemberPanelProps) {
    const [tab, setTab] = useState<TabKey>(() => parseMemberTab(initialTabProp))
    const { theme } = useSyncExternalStore(subscribeShellSettings, getShellSettingsState, getShellSettingsState)
    const { balance, refresh, loading } = usePoints()

    const [ledger, setLedger] = useState<PointsLedgerItem[]>([])
    const [plans, setPlans] = useState<{ members: MemberPlan[]; recharge: RechargePlan[] } | null>(null)
    const [txFilter, setTxFilter] = useState<'all' | 'in' | 'out'>('all')
    const [selPkg, setSelPkg] = useState<string | null>(null)
    const [payMethod, setPayMethod] = useState<PayMethod>('wechat')
    const [busy, setBusy] = useState(false)

    const reloadLedger = useCallback(() => {
        void fetchPointsLedger(1, 50).then((res) => setLedger(res.items)).catch(() => {})
    }, [])

    useEffect(() => {
        if (initialTabProp) {
            setTab(parseMemberTab(initialTabProp))
        }
    }, [initialTabProp])

    useEffect(() => {
        if (!ensureLoggedIn()) {
            if (embedded) return
            void Taro.navigateBack().catch(() => {
                void Taro.reLaunch({ url: '/pages/index/index' })
            })
            return
        }
        void refresh()
        reloadLedger()
        void fetchMemberPlans().then(setPlans).catch(() => {})
    }, [embedded, refresh, reloadLedger])

    // 默认选中第一个充值套餐
    useEffect(() => {
        if (selPkg === null && plans?.recharge?.length) {
            setSelPkg(plans.recharge[0].id)
        }
    }, [plans, selPkg])

    // ---------- 派生：会员/身份 ----------
    const isMember = (balance?.member_discount ?? 1) < 1 || !!balance?.member_expire_at
    const tierRune = isMember ? '道' : '凡'
    const tierLabel = balance?.member_label ?? '普通用户'
    const expireText = balance?.member_expire_at
        ? `有效期至 ${balance.member_expire_at.slice(0, 10)}`
        : '尚未开通会员'

    // ---------- 派生：签到周期 ----------
    const today = new Date().toISOString().slice(0, 10)
    const streak = balance?.checkin_streak ?? 0
    const checkedInToday = balance?.last_checkin_date === today
    const doneInCycle = streak === 0
        ? 0
        : (checkedInToday ? ((streak - 1) % 7) + 1 : streak % 7)
    const remainToBonus = 7 - doneInCycle
    const cycleGot = WEEK.slice(0, doneInCycle).reduce((s, d) => s + d.amt, 0)
    const todayRewardIdx = checkedInToday ? Math.max(0, doneInCycle - 1) : doneInCycle
    const todayReward = WEEK[Math.min(todayRewardIdx, 6)].amt
    const ARC = 301.6
    const arcOffset = ARC * (1 - doneInCycle / 7)

    // ---------- 派生：流水聚合 ----------
    const filteredTx = useMemo(
        () => ledger.filter((x) => txFilter === 'all' || (txFilter === 'in' ? x.amount >= 0 : x.amount < 0)),
        [ledger, txFilter]
    )
    const netRecent = useMemo(() => {
        const cutoff = Date.now() - 30 * 864e5
        return ledger.reduce((sum, x) => {
            const t = new Date(x.created_at.replace(' ', 'T')).getTime()
            return t >= cutoff ? sum + x.amount : sum
        }, 0)
    }, [ledger])

    const stats = useMemo(() => {
        const ym = today.slice(0, 7)
        const inMonth = ledger.filter((x) => x.created_at.slice(0, 7) === ym)
        const castCount = inMonth.filter((x) => x.type === 'consume' || x.amount < 0).length
        const gain = inMonth.reduce((s, x) => (x.amount > 0 ? s + x.amount : s), 0)
        const spend = inMonth.reduce((s, x) => (x.amount < 0 ? s - x.amount : s), 0)
        return [
            { ico: IC.fire, num: streak, u: '天', lbl: '连续签到' },
            { ico: IC.cast, num: castCount, u: '次', lbl: '本月起卦' },
            { ico: IC.coin, num: gain, u: '', lbl: '本月获得' },
            { ico: IC.wallet, num: spend, u: '', lbl: '本月消耗' }
        ]
    }, [ledger, streak, today])

    const perks = useMemo(() => [
        { ic: IC.book, b: '今日灵签', s: `每日首签免费，再签 ${POINTS_FEATURE_COST.qian} 积分` },
        { ic: IC.cast, b: '六爻 · 梅花易数', s: `每次 ${POINTS_FEATURE_COST.liuyao} 积分` },
        { ic: IC.star, b: '八字命理排盘', s: `每次 ${POINTS_FEATURE_COST.bazi} 积分，含五行详批` },
        { ic: IC.disc, b: '掌纹 · 面相解析', s: `每次 ${POINTS_FEATURE_COST.palm} 积分` }
    ], [])

    // ---------- 派生：充值套餐 ----------
    const bestPkgId = useMemo(() => {
        const list = plans?.recharge ?? []
        if (!list.length) return null
        return list.reduce((best, p) => (p.bonus_pct > (best?.bonus_pct ?? -1) ? p : best), list[0]).id
    }, [plans])
    const selectedPkg = (plans?.recharge ?? []).find((p) => p.id === selPkg) ?? null

    // ---------- 会员方案卡片 ----------
    const planCards = useMemo(() => {
        const cards: {
            id: string | null
            rune: string
            name: string
            tag: string
            num: string
            per: string
            feats: string[]
            feat: boolean
            cta: 'solid' | 'outline' | 'current'
        }[] = [
            {
                id: null,
                rune: '凡',
                name: isMember ? '普通用户' : tierLabel,
                tag: '当前身份 · 免费',
                num: '0',
                per: '免费',
                feats: ['每日灵签首签免费', '按次消耗积分起卦', '基础解卦文案'],
                feat: false,
                cta: isMember ? 'outline' : 'current'
            }
        ]
        ;(plans?.members ?? []).forEach((plan, i) => {
            const current = balance?.member_tier === plan.id
            cards.push({
                id: plan.id,
                rune: PAID_RUNES[i] ?? '尊',
                name: plan.label,
                tag: '按月订阅 · 随时可退',
                num: formatYuan(plan.price_cents),
                per: '/月',
                feats: planFeatureList(plan),
                feat: i === 0 && !current,
                cta: current ? 'current' : (i === 0 ? 'solid' : 'outline')
            })
        })
        return cards
    }, [plans, balance?.member_tier, isMember, tierLabel])

    // ---------- 交互 ----------
    const onBack = () => {
        void Taro.navigateBack().catch(() => {
            void Taro.reLaunch({ url: '/pages/index/index' })
        })
    }

    const onCheckin = useCallback(async () => {
        if (busy || checkedInToday) return
        setBusy(true)
        try {
            const res = await postPointsCheckin()
            void Taro.showToast({ title: `签到 +${res.reward} 积分`, icon: 'none' })
            await refresh()
            reloadLedger()
        } catch (e) {
            void Taro.showToast({ title: e instanceof Error ? e.message : '签到失败', icon: 'none' })
        } finally {
            setBusy(false)
        }
    }, [busy, checkedInToday, refresh, reloadLedger])

    const onRecharge = useCallback(async () => {
        if (busy || !selectedPkg) return
        setBusy(true)
        try {
            const { order_id } = await postRechargeOrder(selectedPkg.id)
            await postPaymentConfirm(order_id)
            void Taro.showToast({ title: '充值成功', icon: 'none' })
            await refresh()
            reloadLedger()
        } catch (e) {
            void Taro.showToast({ title: e instanceof Error ? e.message : '充值失败', icon: 'none' })
        } finally {
            setBusy(false)
        }
    }, [busy, selectedPkg, refresh, reloadLedger])

    const onSubscribe = useCallback(async (tier: string) => {
        if (busy) return
        setBusy(true)
        try {
            const { order_id } = await postMemberOrder(tier)
            await postPaymentConfirm(order_id)
            void Taro.showToast({ title: '开通成功', icon: 'none' })
            await refresh()
            reloadLedger()
        } catch (e) {
            void Taro.showToast({ title: e instanceof Error ? e.message : '开通失败', icon: 'none' })
        } finally {
            setBusy(false)
        }
    }, [busy, refresh, reloadLedger])

    const txRow = (item: PointsLedgerItem): ReactNode => {
        const isIn = item.amount >= 0
        return (
            <View key={item.id} className='tx-row'>
                <View className={`tx-ic ${isIn ? 'in' : 'out'}`}>{isIn ? IC.coin : IC.cast}</View>
                <View className='tx-body'>
                    <Text className='tx-title'>{ledgerTitle(item)}</Text>
                    <Text className='tx-date'>{formatTxDate(item.created_at)}</Text>
                </View>
                <Text className={`tx-amt ${isIn ? 'in' : 'out'}`}>{isIn ? '+' : ''}{item.amount}</Text>
            </View>
        )
    }

    return (
        <View className={`mc ${embedded ? 'mc--embedded' : ''} mc--theme-${theme}`}>
            {!embedded && (
                <View className='mc-head'>
                    <View className='mc-head__l'>
                        <View className='mc-back' onClick={onBack}>{IC.arrowLeft}</View>
                        <View>
                            <Text className='mc-title'>会员中心</Text>
                            <Text className='mc-sub'>积分 · 权益 · 修行之资</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* ============ TABS ============ */}
            <View className='mc-tabs'>
                {TABS.map((t) => (
                    <View
                        key={t.key}
                        className={`mc-tab ${tab === t.key ? 'mc-tab--active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        <Text className='mc-tab__label'>{t.label}</Text>
                    </View>
                ))}
            </View>

            {/* ============ 概览 ============ */}
            <View className={`mc-panel ${tab === 'overview' ? 'mc-panel--active' : ''}`}>
                <View className='card hero'>
                    <View className='hero-l'>
                        <View className='hero-label'>当前积分</View>
                        <View className='hero-pts'>
                            {loading && !balance
                                ? <LoadingDots />
                                : <Text>{balance?.balance ?? 0}</Text>}
                            <Text className='unit'>积分</Text>
                        </View>
                        <View className='hero-tier'>
                            <Text className='tier-badge'>
                                <Text className='tb-rune'>{tierRune}</Text>{tierLabel}
                            </Text>
                            <Text className='hero-expire'>{expireText}</Text>
                        </View>
                    </View>
                    <View className='hero-r'>
                        <View className='hero-nextbar'>
                            <View className='nb-top'>
                                <Text>距满周签到奖励</Text>
                                <Text className='nb-val'>{remainToBonus > 0 ? `还差 ${remainToBonus} 天` : '本周已满勤'}</Text>
                            </View>
                            <View className='nb-track'>
                                <View className='nb-fill' style={{ width: `${(doneInCycle / 7) * 100}%` }} />
                            </View>
                        </View>
                        <View className='hero-actions'>
                            <View className='btn btn-gold' onClick={() => setTab('recharge')}>
                                {IC.plus}<Text>充值积分</Text>
                            </View>
                            <View className='btn btn-ghost' onClick={() => setTab('checkin')}>
                                {IC.check}<Text>每日签到</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className='stat-grid'>
                    {stats.map((s) => (
                        <View key={s.lbl} className='card stat'>
                            <View className='stat-ico'>{s.ico}</View>
                            <View className='stat-num'>
                                <Text>{s.num}</Text>{!!s.u && <Text className='sn-u'>{s.u}</Text>}
                            </View>
                            <Text className='stat-lbl'>{s.lbl}</Text>
                        </View>
                    ))}
                </View>

                <View className='ov-cols'>
                    <View className='card'>
                        <View className='card-hd'>
                            <Text className='card-t'>最近流水</Text>
                            <Text className='card-more' onClick={() => setTab('tx')}>查看全部 ›</Text>
                        </View>
                        <View className='mini-tx'>
                            {ledger.length === 0
                                ? <View className='tx-empty'>暂无流水记录</View>
                                : ledger.slice(0, 4).map((x) => txRow(x))}
                        </View>
                    </View>
                    <View className='card'>
                        <View className='card-hd'>
                            <Text className='card-t'>积分用途</Text>
                        </View>
                        <View className='perks'>
                            {perks.map((p) => (
                                <View key={p.b} className='perk'>
                                    <View className='perk-ic'>{p.ic}</View>
                                    <View className='perk-tx'>
                                        <Text className='pt-b'>{p.b}</Text>
                                        <Text className='pt-s'>{p.s}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* ============ 签到 ============ */}
            <View className={`mc-panel ${tab === 'checkin' ? 'mc-panel--active' : ''}`}>
                <View className='ci-top'>
                    <View className='card ci-streak'>
                        <View className='streak-ring'>
                            <svg viewBox='0 0 108 108'>
                                <circle cx='54' cy='54' r='48' fill='none' stroke='var(--line)' strokeWidth={7} />
                                <circle
                                    cx='54' cy='54' r='48' fill='none' stroke='var(--gold)' strokeWidth={7}
                                    strokeLinecap='round' strokeDasharray={ARC} strokeDashoffset={arcOffset}
                                />
                            </svg>
                            <View style={{ textAlign: 'center' }}>
                                <View className='sr-num'>{streak}</View>
                                <View className='sr-u'>天连签</View>
                            </View>
                        </View>
                        <View className='ci-streak-tx'>
                            <Text className='cst-h3'>持之以恒</Text>
                            <View className='cst-p'>
                                <Text className='cst-line'>
                                    连续签到累计得 <Text className='b'>{cycleGot}</Text> 积分
                                </Text>
                                <Text className='cst-line'>
                                    {remainToBonus > 0
                                        ? <>再签 <Text className='b'>{remainToBonus}</Text> 天可得满周奖励 <Text className='b'>+20</Text></>
                                        : '本周已满勤，明日开启新周期'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View className='card ci-today'>
                        <Text className='ct-lbl'>今日签到可得</Text>
                        <View className='ct-reward'>+<Text className='b'>{todayReward}</Text> 积分</View>
                        <View
                            className={`btn-checkin ${checkedInToday ? 'done' : ''}`}
                            onClick={onCheckin}
                        >
                            <Text>{checkedInToday ? `今日已签到 +${todayReward}` : '立即签到'}</Text>
                        </View>
                    </View>
                </View>

                <View className='card ci-week'>
                    <View className='ci-week-hd'>
                        <Text className='cw-t'>本周签到</Text>
                        <Text className='cw-hint'>连签越久，得分越多</Text>
                    </View>
                    <View className='day-row'>
                        {WEEK.map((d, i) => {
                            const done = i < doneInCycle
                            const isToday = !checkedInToday && i === doneInCycle && doneInCycle < 7
                            return (
                                <View
                                    key={d.lbl}
                                    className={`day ${done ? 'done' : ''} ${isToday ? 'today' : ''} ${d.bonus ? 'bonus' : ''}`}
                                >
                                    <Text className='d-lbl'>{d.lbl}</Text>
                                    <Text className='d-coin'>{d.bonus ? '★' : `+${d.amt}`}</Text>
                                    <Text className='d-amt'>{d.amt} 积分</Text>
                                    <View className='d-check'>{IC.checkBold}</View>
                                </View>
                            )
                        })}
                    </View>
                </View>
            </View>

            {/* ============ 流水 ============ */}
            <View className={`mc-panel ${tab === 'tx' ? 'mc-panel--active' : ''}`}>
                <View className='tx-bar'>
                    {([['all', '全部'], ['in', '收入'], ['out', '支出']] as const).map(([k, label]) => (
                        <View
                            key={k}
                            className={`chip ${txFilter === k ? 'chip--active' : ''}`}
                            onClick={() => setTxFilter(k)}
                        >
                            <Text>{label}</Text>
                        </View>
                    ))}
                    <Text className='tx-total'>
                        近 30 天净得 <Text className='b'>{netRecent >= 0 ? '+' : ''}{netRecent}</Text> 积分
                    </Text>
                </View>
                <View className='card'>
                    <View className='tx-list'>
                        {filteredTx.length === 0
                            ? <View className='tx-empty'>暂无记录</View>
                            : filteredTx.map((x) => txRow(x))}
                    </View>
                </View>
            </View>

            {/* ============ 充值 ============ */}
            <View className={`mc-panel ${tab === 'recharge' ? 'mc-panel--active' : ''}`}>
                <View className='pkg-grid'>
                    {(plans?.recharge ?? []).map((pkg) => {
                        const bonusPts = Math.round(pkg.points * pkg.bonus_pct / 100)
                        const isTag = pkg.id === bestPkgId && pkg.bonus_pct > 0
                        const sel = pkg.id === selPkg
                        return (
                            <View
                                key={pkg.id}
                                className={`card pkg ${sel ? 'sel' : ''} ${isTag ? 'hastag' : ''}`}
                                onClick={() => setSelPkg(pkg.id)}
                            >
                                {isTag && <Text className='pkg-tag'>最超值</Text>}
                                <View className='pkg-radio' />
                                <View className='pkg-pts'>{pkg.points}<Text className='pu'>积分</Text></View>
                                <Text className={`pkg-bonus ${bonusPts > 0 ? '' : 'hidden'}`}>
                                    {bonusPts > 0 ? `额外赠 ${bonusPts} 积分` : '—'}
                                </Text>
                                <View className='pkg-price'><Text className='cur'>¥</Text>{formatYuan(pkg.price_cents)}</View>
                            </View>
                        )
                    })}
                </View>
                <View className='card pay-row'>
                    <Text className='pay-lbl'>支付方式</Text>
                    <View className='pay-opts'>
                        {([['wechat', '微信支付'], ['alipay', '支付宝']] as const).map(([k, label]) => (
                            <View
                                key={k}
                                className={`pay-opt ${payMethod === k ? 'pay-opt--active' : ''}`}
                                onClick={() => setPayMethod(k)}
                            >
                                <Text className='po-dot' /><Text>{label}</Text>
                            </View>
                        ))}
                    </View>
                    <View className='pay-go'>
                        <Text className='pay-sum'>
                            应付 <Text className='b'>¥{selectedPkg ? formatYuan(selectedPkg.price_cents) : '0'}</Text>
                        </Text>
                        <View
                            className={`btn-pay ${busy ? 'busy' : ''}`}
                            onClick={onRecharge}
                        >
                            {busy
                                ? <PendingText>处理中</PendingText>
                                : <Text>确认充值</Text>}
                        </View>
                    </View>
                </View>
            </View>

            {/* ============ 会员 ============ */}
            <View className={`mc-panel ${tab === 'member' ? 'mc-panel--active' : ''}`}>
                <View className='plan-grid'>
                    {planCards.map((p) => (
                        <View key={p.id ?? 'free'} className={`card plan ${p.feat ? 'feat' : ''}`}>
                            <View className='plan-rune'>{p.rune}</View>
                            <Text className='plan-name'>{p.name}</Text>
                            <Text className='plan-tag'>{p.tag}</Text>
                            <View className='plan-price'>
                                <Text className='pp-cur'>¥</Text>
                                <Text className='pp-num'>{p.num}</Text>
                                <Text className='pp-per'>{p.per}</Text>
                            </View>
                            <View className='plan-feats'>
                                {p.feats.map((f) => (
                                    <View key={f} className='plan-feat'>{IC.check}<Text>{f}</Text></View>
                                ))}
                            </View>
                            {p.cta === 'current'
                                ? <View className='plan-btn current'><Text>当前方案</Text></View>
                                : (
                                    <View
                                        className={`plan-btn ${p.cta}`}
                                        onClick={() => p.id && onSubscribe(p.id)}
                                    >
                                        <Text>立即开通</Text>
                                    </View>
                                )}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    )
}
