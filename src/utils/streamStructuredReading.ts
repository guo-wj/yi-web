const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function streamText (
    text: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
): Promise<void> {
    const chars = [...text]
    for (let i = 0; i < chars.length; i += 3) {
        if (signal?.aborted) return
        onChunk(chars.slice(i, i + 3).join(''))
        await sleep(18)
    }
}

interface PreviewHintItem {
    key: string
    hint: string
}

/** 识象预览：摘要 → 分图摘要 → 逐卡片流式展示初识短评 */
export async function revealExtractPreview (opts: {
    overview: string
    summaries: string[]
    items: PreviewHintItem[]
    onOverview: (chunk: string) => void
    onSummary: (index: number, chunk: string) => void
    onItemStart: (key: string) => void
    onHint: (key: string, chunk: string) => void
    signal?: AbortSignal
}): Promise<void> {
    if (opts.overview) {
        await streamText(opts.overview, opts.onOverview, opts.signal)
    }
    for (let i = 0; i < opts.summaries.length; i++) {
        const text = opts.summaries[i]
        if (!text) continue
        await streamText(text, (chunk) => opts.onSummary(i, chunk), opts.signal)
    }
    for (const item of opts.items) {
        if (opts.signal?.aborted) return
        opts.onItemStart(item.key)
        if (item.hint) {
            await streamText(item.hint, (chunk) => opts.onHint(item.key, chunk), opts.signal)
        }
    }
}

interface StructuredItem {
    key: string
    description: string
}

/** 结构化解读：先出卡片骨架，再逐段流式填充正文 */
export async function revealStructuredReading (opts: {
    overview: string
    items: StructuredItem[][]
    closingSummary: string
    adviceItems: string[]
    onOverview: (chunk: string) => void
    onItemDesc: (key: string, chunk: string) => void
    onClosing: (chunk: string) => void
    onAdviceItem: (index: number, chunk: string) => void
    signal?: AbortSignal
}): Promise<void> {
    if (opts.overview) {
        await streamText(opts.overview, opts.onOverview, opts.signal)
    }
    for (const group of opts.items) {
        for (const item of group) {
            if (!item.description) continue
            await streamText(item.description, (chunk) => opts.onItemDesc(item.key, chunk), opts.signal)
        }
    }
    if (opts.closingSummary) {
        await streamText(opts.closingSummary, opts.onClosing, opts.signal)
    }
    for (let i = 0; i < opts.adviceItems.length; i++) {
        const item = opts.adviceItems[i]
        if (!item) continue
        await streamText(item, (chunk) => opts.onAdviceItem(i, chunk), opts.signal)
    }
}
