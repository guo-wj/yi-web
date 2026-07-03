import { Text } from '@tarojs/components'

import './index.scss'

type LoadingDotsProps = {
    className?: string
    /** 点与点之间留空，适配「排 盘 中 …」等宽字距文案 */
    spaced?: boolean
}

export function LoadingDots ({ className = '', spaced = false }: LoadingDotsProps) {
    const rootClass = [
        'loading-dots',
        spaced ? 'loading-dots--spaced' : '',
        className
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <Text className={rootClass}>
            <Text className='loading-dots__char'>.</Text>
            <Text className='loading-dots__char'>.</Text>
            <Text className='loading-dots__char'>.</Text>
        </Text>
    )
}

type PendingTextProps = LoadingDotsProps & {
    children: string
}

/** 进行中状态文案 + 三点动画 */
export default function PendingText ({
    children,
    className = '',
    spaced = false
}: PendingTextProps) {
    return (
        <Text className={className}>
            {children}
            <LoadingDots spaced={spaced} />
        </Text>
    )
}
