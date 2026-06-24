export type MdBlock =
    | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
    | { type: 'paragraph'; text: string }

const HEADING_RE = /^(#{1,4})\s+(.+)$/

export function parseMarkdown (source: string): MdBlock[] {
    if (!source.trim()) return []

    const blocks: MdBlock[] = []
    const lines = source.replace(/\r\n/g, '\n').split('\n')
    let paragraph: string[] = []

    const flushParagraph = () => {
        const text = paragraph.join('\n').trim()
        if (text) blocks.push({ type: 'paragraph', text })
        paragraph = []
    }

    for (const rawLine of lines) {
        const line = rawLine.trimEnd()
        const trimmed = line.trim()

        const heading = trimmed.match(HEADING_RE)
        if (heading) {
            flushParagraph()
            blocks.push({
                type: 'heading',
                level: heading[1].length as 1 | 2 | 3 | 4,
                text: heading[2].trim()
            })
            continue
        }

        if (!trimmed) {
            flushParagraph()
            continue
        }

        paragraph.push(line)
    }

    flushParagraph()
    return blocks
}

export type MdInlinePart =
    | { type: 'text'; value: string }
    | { type: 'strong'; value: string }

const INLINE_STRONG_RE = /(\*\*[^*]+\*\*)/g

export function parseInline (text: string): MdInlinePart[] {
    if (!text.includes('**')) return [{ type: 'text', value: text }]

    const parts: MdInlinePart[] = []
    for (const segment of text.split(INLINE_STRONG_RE)) {
        if (!segment) continue
        const strong = segment.match(/^\*\*(.+)\*\*$/)
        if (strong) {
            parts.push({ type: 'strong', value: strong[1] })
            continue
        }
        parts.push({ type: 'text', value: segment })
    }
    return parts
}
