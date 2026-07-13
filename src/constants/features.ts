import iconHuangli from '@/assets/icons/huangli.svg'
import iconQian from '@/assets/icons/qian.svg'
import iconLiuyao from '@/assets/icons/liuyao.svg'
import iconZiwei from '@/assets/icons/ziwei.svg'
import iconBazi from '@/assets/icons/bazi.svg'
import iconHand from '@/assets/icons/hand.svg'
import iconFace from '@/assets/icons/face.svg'
import iconVip from '@/assets/icons/vip.svg'
// import iconTaluo from '@/assets/icons/taluo.svg' // 塔罗牌暂未开放

export type FeatureKey = 'huangli' | 'qian' | 'liuyao' | 'ziwei' | 'bazi' | 'zhangwen' | 'mianxiang' | 'member' // | 'taluo'

export type FeatureBadge = 'HOT' | 'NEW'

export interface FeatureItem {
    key: FeatureKey
    title: string
    desc: string
    /** 顶栏面包屑副标题，如「每日宜忌 · 干支历法」 */
    sub: string
    icon: string
    badge?: FeatureBadge
    /** 视觉补偿缩放，默认 1 */
    iconScale?: number
    /** 未上线功能的「敬请期待」占位诗句，支持 \n 换行 */
    soonPoem?: string
}

/** 首页四宫格 & 详情侧栏共用 */
export const FEATURE_ITEMS: FeatureItem[] = [
    {
        key: 'huangli',
        title: '老黄历',
        desc: '查宜忌吉凶，择日出行',
        sub: '每日宜忌 · 干支历法',
        icon: iconHuangli
    },
    {
        key: 'qian',
        title: '今日灵签',
        desc: 'AI 解签问运，一日一签',
        sub: '静心摇签 · 灵签指引',
        icon: iconQian
    },
    {
        key: 'liuyao',
        title: '六爻起卦',
        desc: '心念一动，卦象自成',
        sub: '纳甲六爻 · 动变之机',
        icon: iconLiuyao
    },
    {
        key: 'ziwei',
        title: '梅花易数',
        desc: '观象起数，体用生克',
        sub: '先天起数 · 体用生克',
        icon: iconZiwei,
        badge: 'HOT'
    },
    {
        key: 'bazi',
        title: '八字命理',
        desc: '四柱推演，详批命理',
        sub: '四柱排盘 · 五行格局',
        icon: iconBazi,
        badge: 'NEW'
    },
    {
        key: 'zhangwen',
        title: '掌纹解析',
        desc: '上传掌纹，AI 解读',
        sub: '左右掌纹 · 三线五丘',
        icon: iconHand,
        badge: 'NEW'
    },
    {
        key: 'mianxiang',
        title: '面相解析',
        desc: '上传面部，AI 解读',
        sub: '五官气色 · 三停九部',
        icon: iconFace,
        badge: 'NEW'
    }
    // {
    //     key: 'taluo',
    //     title: '塔罗牌',
    //     desc: '牌阵指引，照见内心',
    //     sub: '大阿卡那 · 牌阵解读',
    //     icon: iconTaluo,
    //     iconScale: 0.84,
    //     soonPoem: '二十二张大阿卡那，\n映照心之所向。'
    // }
]

/** 侧栏底部固定入口（不在首页四宫格展示） */
export const MEMBER_FEATURE: FeatureItem = {
    key: 'member',
    title: '会员中心',
    desc: '积分充值 · 会员权益',
    sub: '积分 · 权益 · 修行之资',
    icon: iconVip,
    iconScale: 0.88
}

export function getFeatureByKey (key: string | undefined): FeatureItem {
    if (key === 'member') return MEMBER_FEATURE
    const found = FEATURE_ITEMS.find((f) => f.key === key)
    return found ?? FEATURE_ITEMS[0]
}

export function isFeatureKey (key: string | undefined): key is FeatureKey {
    return key === 'member' || FEATURE_ITEMS.some((f) => f.key === key)
}
