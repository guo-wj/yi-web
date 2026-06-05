/** Taro 部分环境下 statusBarHeight 可能为 NaN，直接参与运算会导致样式非法 */
export function safeNonNegativePx (value: unknown, fallback = 0): number {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return fallback
    return n
}
