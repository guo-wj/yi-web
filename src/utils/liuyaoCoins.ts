/** 三枚铜钱摇卦：字面=2，字面=3，合计 6/7/8/9 定爻 */

export type YaoValue = 6 | 7 | 8 | 9

export interface YaoLine {
    value: YaoValue
    /** true=花(3)，false=字(2) */
    coins: [boolean, boolean, boolean]
}

export interface HexagramInfo {
    number: number
    name: string
    title: string
}

export const YAO_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'] as const

export const YAO_TYPE_LABEL: Record<YaoValue, string> = {
    6: '老阴',
    7: '少阳',
    8: '少阴',
    9: '老阳'
}

/** 二进制索引（初爻=bit0）→ 卦象 */
const HEX_BY_BINARY: HexagramInfo[] = [
    { number: 2, name: '坤', title: '坤为地' },
    { number: 24, name: '复', title: '地雷复' },
    { number: 7, name: '师', title: '地水师' },
    { number: 19, name: '临', title: '地泽临' },
    { number: 15, name: '谦', title: '地山谦' },
    { number: 36, name: '明夷', title: '地火明夷' },
    { number: 46, name: '升', title: '地风升' },
    { number: 11, name: '泰', title: '地天泰' },
    { number: 16, name: '豫', title: '雷地豫' },
    { number: 51, name: '震', title: '震为雷' },
    { number: 40, name: '解', title: '雷水解' },
    { number: 54, name: '归妹', title: '雷泽归妹' },
    { number: 62, name: '小过', title: '雷山小过' },
    { number: 55, name: '丰', title: '雷火丰' },
    { number: 32, name: '恒', title: '雷风恒' },
    { number: 34, name: '大壮', title: '雷天大壮' },
    { number: 8, name: '比', title: '水地比' },
    { number: 4, name: '蒙', title: '山水蒙' },
    { number: 29, name: '坎', title: '坎为水' },
    { number: 59, name: '涣', title: '风水涣' },
    { number: 39, name: '蹇', title: '水山蹇' },
    { number: 63, name: '既济', title: '水火既济' },
    { number: 48, name: '井', title: '水风井' },
    { number: 5, name: '需', title: '水天需' },
    { number: 45, name: '萃', title: '泽地萃' },
    { number: 17, name: '随', title: '泽雷随' },
    { number: 47, name: '困', title: '泽水困' },
    { number: 58, name: '兑', title: '兑为泽' },
    { number: 31, name: '咸', title: '泽山咸' },
    { number: 49, name: '革', title: '泽火革' },
    { number: 28, name: '大过', title: '泽风大过' },
    { number: 43, name: '夬', title: '泽天夬' },
    { number: 23, name: '剥', title: '山地剥' },
    { number: 3, name: '屯', title: '水雷屯' },
    { number: 27, name: '颐', title: '山雷颐' },
    { number: 41, name: '损', title: '山泽损' },
    { number: 52, name: '艮', title: '艮为山' },
    { number: 22, name: '贲', title: '山火贲' },
    { number: 18, name: '蛊', title: '山风蛊' },
    { number: 26, name: '大畜', title: '山天大畜' },
    { number: 35, name: '晋', title: '火地晋' },
    { number: 21, name: '噬嗑', title: '火雷噬嗑' },
    { number: 64, name: '未济', title: '火水未济' },
    { number: 38, name: '睽', title: '火泽睽' },
    { number: 56, name: '旅', title: '火山旅' },
    { number: 30, name: '离', title: '离为火' },
    { number: 50, name: '鼎', title: '火风鼎' },
    { number: 14, name: '大有', title: '火天大有' },
    { number: 20, name: '观', title: '风地观' },
    { number: 42, name: '益', title: '风雷益' },
    { number: 60, name: '节', title: '水风节' },
    { number: 61, name: '中孚', title: '风泽中孚' },
    { number: 53, name: '渐', title: '风山渐' },
    { number: 37, name: '家人', title: '风火家人' },
    { number: 57, name: '巽', title: '巽为风' },
    { number: 9, name: '小畜', title: '风天小畜' },
    { number: 12, name: '否', title: '天地否' },
    { number: 25, name: '无妄', title: '天雷无妄' },
    { number: 6, name: '讼', title: '天水讼' },
    { number: 10, name: '履', title: '天泽履' },
    { number: 33, name: '遁', title: '天山遁' },
    { number: 13, name: '同人', title: '天火同人' },
    { number: 44, name: '姤', title: '天风姤' },
    { number: 1, name: '乾', title: '乾为天' }
]

export function isYang (value: YaoValue): boolean {
    return value === 7 || value === 9
}

export function isChanging (value: YaoValue): boolean {
    return value === 6 || value === 9
}

/** 随机掷三枚铜钱 */
export function tossCoins (): YaoLine {
    const coins: [boolean, boolean, boolean] = [
        Math.random() < 0.5,
        Math.random() < 0.5,
        Math.random() < 0.5
    ]
    const sum = coins.reduce((acc, hua) => acc + (hua ? 3 : 2), 0) as YaoValue
    return { value: sum, coins }
}

export function linesToBinary (lines: YaoLine[]): number {
    return lines.reduce((acc, line, i) => {
        return acc | (isYang(line.value) ? (1 << i) : 0)
    }, 0)
}

export function getHexagram (lines: YaoLine[]): HexagramInfo {
    const binary = linesToBinary(lines)
    return HEX_BY_BINARY[binary] ?? { number: 0, name: '?', title: '未知卦' }
}

/** 动爻变后之卦 */
export function getChangedHexagram (lines: YaoLine[]): HexagramInfo | null {
    const changing = lines.some((l) => isChanging(l.value))
    if (!changing) return null
    const changed = lines.map((line) => {
        if (line.value === 9) return { ...line, value: 8 as YaoValue }
        if (line.value === 6) return { ...line, value: 7 as YaoValue }
        return line
    })
    return getHexagram(changed)
}

export function getChangingIndices (lines: YaoLine[]): number[] {
    return lines
        .map((line, i) => (isChanging(line.value) ? i : -1))
        .filter((i) => i >= 0)
}
