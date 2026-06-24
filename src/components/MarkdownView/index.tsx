import { View, Text } from '@tarojs/components'
import { useMemo } from 'react'

import { parseInline, parseMarkdown, type MdBlock } from './parseMarkdown'
import './index.scss'

interface MarkdownViewProps {
    content: string
    className?: string
}

function InlineText ({ text }: { text: string }) {
    const parts = useMemo(() => parseInline(text), [text])

    if (parts.length === 1 && parts[0].type === 'text') {
        return <>{parts[0].value}</>
    }

    return (
        <>
            {parts.map((part, index) => (
                part.type === 'strong'
                    ? <Text key={index} className='md-view__strong'>{part.value}</Text>
                    : <Text key={index}>{part.value}</Text>
            ))}
        </>
    )
}

function MarkdownBlock ({ block }: { block: MdBlock }) {
    if (block.type === 'heading') {
        return (
            <Text className={`md-view__h md-view__h${block.level}`}>
                <InlineText text={block.text} />
            </Text>
        )
    }

    return (
        <Text className='md-view__p'>
            <InlineText text={block.text} />
        </Text>
    )
}

export default function MarkdownView ({ content, className }: MarkdownViewProps) {
    const blocks = useMemo(() => parseMarkdown(content), [content])

    if (!blocks.length) return null

    return (
        <View className={`md-view ${className ?? ''}`}>
            {blocks.map((block, index) => (
                <MarkdownBlock key={index} block={block} />
            ))}
        </View>
    )
}
