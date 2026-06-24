/** 梅花易数起卦算法（邵雍体例） */

export interface MeihuaGua {
    number: number
    name: string
    lowerTrigram: string
    upperTrigram: string
    /** 六爻阴阳，自下而上，1=阳 0=阴 */
    bits: number[]
}

export interface MeihuaCastResult {
    method: string
    /** 起卦依据摘要 */
    basis: string
    upperNum: number
    lowerNum: number
    movingLine: number
    benGua: MeihuaGua
    bianGua: MeihuaGua | null
    /** 体卦（主） */
    tiTrigram: string
    /** 用卦（客） */
    yongTrigram: string
}

const TRIGRAM_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] as const

const TRIGRAM_BITS: Record<string, [number, number, number]> = {
    乾: [1, 1, 1],
    兑: [1, 1, 0],
    离: [1, 0, 1],
    震: [1, 0, 0],
    巽: [0, 1, 1],
    坎: [0, 1, 0],
    艮: [0, 0, 1],
    坤: [0, 0, 0]
}

const HEX_MATRIX = [
    [1, 43, 14, 34, 9, 5, 26, 11],
    [10, 58, 38, 54, 61, 60, 41, 19],
    [13, 49, 30, 55, 37, 63, 22, 36],
    [25, 17, 21, 51, 42, 3, 27, 24],
    [44, 28, 50, 32, 57, 48, 18, 46],
    [6, 47, 64, 40, 59, 29, 4, 7],
    [33, 31, 56, 62, 53, 39, 52, 15],
    [12, 45, 35, 16, 20, 8, 23, 2]
]

const HEX_NAMES: Record<number, string> = {
    1: '乾为天', 2: '坤为地', 3: '水雷屯', 4: '山水蒙', 5: '水天需', 6: '天水讼',
    7: '地水师', 8: '水地比', 9: '风天小畜', 10: '天泽履', 11: '地天泰', 12: '天地否',
    13: '天火同人', 14: '火天大有', 15: '地山谦', 16: '雷地豫', 17: '泽雷随', 18: '山风蛊',
    19: '地泽临', 20: '风地观', 21: '火雷噬嗑', 22: '山火贲', 23: '山地剥', 24: '地雷复',
    25: '天雷无妄', 26: '山天大畜', 27: '山雷颐', 28: '泽风大过', 29: '坎为水', 30: '离为火',
    31: '泽山咸', 32: '雷风恒', 33: '天山遁', 34: '雷天大壮', 35: '火地晋', 36: '地火明夷',
    37: '风火家人', 38: '火泽睽', 39: '水山蹇', 40: '雷水解', 41: '山泽损', 42: '风雷益',
    43: '泽天夬', 44: '天风姤', 45: '泽地萃', 46: '地风升', 47: '泽水困', 48: '水风井',
    49: '泽火革', 50: '火风鼎', 51: '震为雷', 52: '艮为山', 53: '风山渐', 54: '雷泽归妹',
    55: '雷火丰', 56: '火山旅', 57: '巽为风', 58: '兑为泽', 59: '风水涣', 60: '水泽节',
    61: '风泽中孚', 62: '雷山小过', 63: '水火既济', 64: '火水未济'
}

function mod8 (n: number): number {
    const r = n % 8
    return r === 0 ? 8 : r
}

function mod6 (n: number): number {
    const r = n % 6
    return r === 0 ? 6 : r
}

function trigramAt (num: number): string {
    return TRIGRAM_ORDER[num - 1] ?? '坤'
}

function buildGua (upperNum: number, lowerNum: number): MeihuaGua {
    const upper = trigramAt(upperNum)
    const lower = trigramAt(lowerNum)
    const bits = [...TRIGRAM_BITS[lower]!, ...TRIGRAM_BITS[upper]!]
    const li = lowerNum - 1
    const ui = upperNum - 1
    const number = HEX_MATRIX[li]?.[ui] ?? 0
    return {
        number,
        name: HEX_NAMES[number] ?? '未知卦',
        lowerTrigram: lower,
        upperTrigram: upper,
        bits
    }
}

function buildChangedGua (ben: MeihuaGua, movingLine: number): MeihuaGua {
    const bits = [...ben.bits] as number[]
    const idx = movingLine - 1
    bits[idx] = bits[idx] === 1 ? 0 : 1
    const lowerBits = bits.slice(0, 3) as [number, number, number]
    const upperBits = bits.slice(3, 6) as [number, number, number]
    const lowerName = Object.entries(TRIGRAM_BITS).find(([, b]) =>
        b[0] === lowerBits[0] && b[1] === lowerBits[1] && b[2] === lowerBits[2]
    )?.[0] ?? '坤'
    const upperName = Object.entries(TRIGRAM_BITS).find(([, b]) =>
        b[0] === upperBits[0] && b[1] === upperBits[1] && b[2] === upperBits[2]
    )?.[0] ?? '坤'
    const li = TRIGRAM_ORDER.indexOf(lowerName as typeof TRIGRAM_ORDER[number])
    const ui = TRIGRAM_ORDER.indexOf(upperName as typeof TRIGRAM_ORDER[number])
    const number = HEX_MATRIX[li]?.[ui] ?? 0
    return {
        number,
        name: HEX_NAMES[number] ?? '未知卦',
        lowerTrigram: lowerName,
        upperTrigram: upperName,
        bits
    }
}

function tiYong (upperNum: number, lowerNum: number, movingLine: number): { ti: string, yong: string } {
    const upper = trigramAt(upperNum)
    const lower = trigramAt(lowerNum)
    if (movingLine >= 4) {
        return { ti: lower, yong: upper }
    }
    return { ti: upper, yong: lower }
}

function finalize (
    method: string,
    basis: string,
    upperNum: number,
    lowerNum: number,
    movingSum: number
): MeihuaCastResult {
    const movingLine = mod6(movingSum)
    const benGua = buildGua(upperNum, lowerNum)
    const bianGua = buildChangedGua(benGua, movingLine)
    const { ti, yong } = tiYong(upperNum, lowerNum, movingLine)
    return {
        method,
        basis,
        upperNum,
        lowerNum,
        movingLine,
        benGua,
        bianGua,
        tiTrigram: ti,
        yongTrigram: yong
    }
}

/** 年支数：子1 … 亥12 */
export function yearBranchNum (year: number): number {
    return ((year - 4) % 12) + 1
}

/** 时支数：子1 … 亥12 */
export function hourBranchNum (hour: number): number {
    const h = hour === 0 ? 24 : hour
    if (h >= 23 || h < 1) return 1
    return Math.floor((h + 1) / 2)
}

export function castFromDateTime (date: Date): MeihuaCastResult {
    const y = yearBranchNum(date.getFullYear())
    const m = date.getMonth() + 1
    const d = date.getDate()
    const h = hourBranchNum(date.getHours())
    const upperSum = y + m + d
    const lowerSum = y + m + d + h
    const basis = `${date.getFullYear()}年${m}月${d}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}（年支${y}·时支${h}）`
    return finalize('时间起卦', basis, mod8(upperSum), mod8(lowerSum), lowerSum)
}

export function parseNumbers (raw: string): number[] {
    return raw
        .split(/[\s,，、]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0)
}

export function castFromNumbers (nums: number[]): MeihuaCastResult {
    if (nums.length === 0) throw new Error('请输入至少一个数字')

    if (nums.length === 1) {
        const n = Math.floor(nums[0]!)
        const upperNum = mod8(n)
        const lowerNum = mod8(Math.floor(n / 10) + (n % 10))
        return finalize('数字起卦', `单数 ${n}`, upperNum, lowerNum, n)
    }

    if (nums.length === 2) {
        const [a, b] = nums
        const sum = a! + b!
        return finalize('数字起卦', `${a}、${b}`, mod8(a!), mod8(b!), sum)
    }

    const [a, b, c] = nums
    return finalize('数字起卦', `${a}、${b}、${c}`, mod8(a!), mod8(b!), c!)
}

export function castFromText (text: string): MeihuaCastResult {
    const chars = [...text.trim()]
    if (chars.length === 0) throw new Error('请输入要起卦的文字')

    const total = chars.length
    const firstLen = Math.ceil(total / 2)
    const firstCount = firstLen
    const secondCount = total - firstLen
    const upperNum = mod8(firstCount)
    const lowerNum = mod8(secondCount)
    return finalize(
        '字数起卦',
        `共 ${total} 字，前 ${firstCount} / 后 ${secondCount}`,
        upperNum,
        lowerNum,
        total
    )
}

export function castFromDirection (directionNum: number, extraNum: number): MeihuaCastResult {
    const upperNum = mod8(directionNum)
    const lowerNum = mod8(extraNum)
    return finalize(
        '方位起卦',
        `方位数 ${directionNum}，配数 ${extraNum}`,
        upperNum,
        lowerNum,
        directionNum + extraNum
    )
}

export function castFromMind (): MeihuaCastResult {
    return castFromDateTime(new Date())
}

export const YAO_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'] as const

export function isYangBit (bit: number): boolean {
    return bit === 1
}
