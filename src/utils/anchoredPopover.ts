export interface RectLike {
    top: number
    left: number
    right: number
    bottom: number
    width: number
    height: number
}

export type PopoverAlign = 'start' | 'end' | 'upper-right'

/** 相对整个页面视口（非弹窗自身）保留的边距 */
export const PAGE_VIEWPORT_MARGIN = 20
const POPOVER_GAP = 10

export function getPageViewportInsets (): {
    top: number
    right: number
    bottom: number
    left: number
} {
    const margin = PAGE_VIEWPORT_MARGIN
    return {
        top: margin,
        right: margin,
        bottom: margin,
        left: margin
    }
}

export function rectFromElement (el: HTMLElement): RectLike {
    return el.getBoundingClientRect()
}

function clampHorizontal (
    left: number,
    popoverWidth: number,
    vw: number,
    insetLeft: number,
    insetRight: number
): number {
    const minLeft = insetLeft
    const maxLeft = Math.max(minLeft, vw - popoverWidth - insetRight)
    return Math.max(minLeft, Math.min(left, maxLeft))
}

function clampVertical (
    top: number,
    popoverHeight: number,
    vh: number,
    insetTop: number,
    insetBottom: number
): number {
    const minTop = insetTop
    const maxTop = Math.max(minTop, vh - popoverHeight - insetBottom)
    return Math.max(minTop, Math.min(top, maxTop))
}

export function computeAnchoredPopoverPosition (
    anchor: RectLike,
    popoverWidth: number,
    popoverHeight: number,
    align: PopoverAlign = 'start'
): { top: number; left: number } {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 375
    const vh = typeof window !== 'undefined' ? window.innerHeight : 667
    const insets = getPageViewportInsets()
    const gap = POPOVER_GAP

    const maxWidth = vw - insets.left - insets.right
    const width = Math.min(popoverWidth, maxWidth)

    let left: number
    if (align === 'end') {
        left = anchor.right - width
        if (left < insets.left) {
            left = vw - width - insets.right
        }
    } else if (align === 'upper-right') {
        left = anchor.right
        if (left + width > vw - insets.right) {
            left = vw - width - insets.right
        }
    } else {
        left = anchor.left
    }

    left = clampHorizontal(left, width, vw, insets.left, insets.right)

    let top = anchor.top - gap - popoverHeight
    if (top < insets.top) {
        top = anchor.bottom + gap
    }
    top = clampVertical(top, popoverHeight, vh, insets.top, insets.bottom)

    return { top, left }
}
