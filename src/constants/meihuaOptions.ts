/** 梅花易数起卦方式（与后端 /api/meihua/divine 对齐） */

export type MeihuaMethod = 'time' | 'number'

export interface MeihuaMethodOption {
    key: MeihuaMethod
    label: string
    /** 分段切换控件下的短说明 */
    caption: string
    desc: string
    inputHint?: string
    inputPlaceholder?: string
}

export const MEIHUA_METHODS: MeihuaMethodOption[] = [
    {
        key: 'time',
        label: '时间起卦',
        caption: '以此刻天地之数',
        desc: '以当前时刻农历年月日时为基数取数成卦',
        inputHint: '起卦时刻',
        inputPlaceholder: '服务端当前时间'
    },
    {
        key: 'number',
        label: '数字起卦',
        caption: '心念一数成卦',
        desc: '输入一个正整数，取余定卦',
        inputHint: '心念之数',
        inputPlaceholder: '凝神默想，随手写下一个正整数'
    }
]

export const MEIHUA_PROMPTS = [
    '暗恋的人对我有感觉吗？',
    '异地恋还能走下去吗？',
    '正缘什么时候会出现？',
    '期末答辩能顺利通过吗？',
    '考编考公这次有希望吗？',
    '年终奖还有指望吗？',
    '现在跳槽是对的选择吗？',
    '项目 deadline 能顺利交差吗？',
    '副业搞钱这事靠谱吗？',
    '所问之事最后能成吗？',
    '欠款还能要回来吗？',
    '买的基金还能涨回来吗？'
] as const
