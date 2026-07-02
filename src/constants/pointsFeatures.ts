/** 与后端 pricing_rules.feature 对齐 */
export type PointsFeature = 'qian' | 'liuyao' | 'meihua' | 'bazi' | 'palm' | 'face'

export const POINTS_FEATURE_LABELS: Record<PointsFeature, string> = {
    qian: '今日灵签',
    liuyao: '六爻起卦',
    meihua: '梅花易数',
    bazi: '八字命理',
    palm: '掌纹解析',
    face: '面相解析'
}

/** 默认定价（后端不可用时兜底） */
export const POINTS_FEATURE_COST: Record<PointsFeature, number> = {
    qian: 10,
    liuyao: 20,
    meihua: 20,
    bazi: 40,
    palm: 35,
    face: 35
}
