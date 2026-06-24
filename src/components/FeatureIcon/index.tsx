import { View } from '@tarojs/components'

import './index.scss'

interface FeatureIconProps {
    src: string
    className?: string
    scale?: number
}

export default function FeatureIcon ({ src, className, scale = 1 }: FeatureIconProps) {
    return (
        <View
            className={`feature-icon ${className ?? ''}`}
            style={{
                WebkitMaskImage: `url(${src})`,
                maskImage: `url(${src})`,
                ...(scale !== 1 ? { transform: `scale(${scale})` } : {})
            }}
        />
    )
}
