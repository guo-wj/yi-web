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
    'TA还会联系我吗？',
    '我们会复合吗？',
    '这次考试结果如何？',
    '所求之事能成吗？',
    '最近财运怎么样？',
    '这次出行平安吗？',
    '这段缘分还能继续吗？'
] as const
