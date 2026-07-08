import { Text } from '@tarojs/components'

interface UploadTipsStripProps {
    tips: readonly string[]
    /** 面板 BEM 前缀，如 face-panel / palm-m */
    classPrefix: string
}

/** 掌纹 / 面相上传页顶部须知（纯文字，与底部 form-hint 同款） */
export default function UploadTipsStrip ({ tips, classPrefix: p }: UploadTipsStripProps) {
    return (
        <Text className={`${p}__form-hint ${p}__form-hint--lead`}>{tips.join(' · ')}</Text>
    )
}
