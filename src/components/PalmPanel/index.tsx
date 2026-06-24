import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useRef, useState } from 'react'

import MarkdownView from '@/components/MarkdownView'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { openAlertModal } from '@/utils/confirmModal'
import { postPalmAnalyze, streamPalmText, type PalmAnalyzeResponse } from '@/services/palmApi'

import './index.scss'

type Phase = 'upload' | 'reading'
type HandSide = 'left' | 'right'

const UPLOAD_TIPS = [
    '请在自然光下拍摄，避免阴影遮挡',
    '手掌平展，掌纹清晰可见',
    '建议拍摄完整手掌，含五指根部'
]

async function pickPalmImage (): Promise<string | null> {
    try {
        const res = await Taro.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera']
        })
        return res.tempFilePaths[0] ?? null
    } catch {
        return null
    }
}

export default function PalmPanel () {
    const [phase, setPhase] = useState<Phase>('upload')
    const [leftPath, setLeftPath] = useState<string | null>(null)
    const [rightPath, setRightPath] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [streaming, setStreaming] = useState(false)
    const [streamText, setStreamText] = useState('')
    const [result, setResult] = useState<PalmAnalyzeResponse | null>(null)

    const abortRef = useRef<AbortController | null>(null)

    const chooseHand = useCallback(async (side: HandSide) => {
        const path = await pickPalmImage()
        if (!path) return
        if (side === 'left') setLeftPath(path)
        else setRightPath(path)
    }, [])

    const clearHand = useCallback((side: HandSide, e?: { stopPropagation?: () => void }) => {
        e?.stopPropagation?.()
        if (side === 'left') setLeftPath(null)
        else setRightPath(null)
    }, [])

    const validate = useCallback((): string | null => {
        if (!leftPath) return '请上传左手掌纹'
        if (!rightPath) return '请上传右手掌纹'
        return null
    }, [leftPath, rightPath])

    const submit = useCallback(async () => {
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }
        if (loading) return
        if (!ensureLoggedIn()) return

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        setLoading(true)
        setStreaming(false)
        setStreamText('')
        setResult(null)

        try {
            const resp = await postPalmAnalyze(leftPath!, rightPath!)
            if (ac.signal.aborted) return

            setResult(resp)
            setPhase('reading')
            setStreaming(true)

            await streamPalmText(resp.content, (chunk) => {
                setStreamText((prev) => prev + chunk)
            }, ac.signal)
        } catch (e) {
            if (!ac.signal.aborted) {
                const msg = e instanceof Error ? e.message : '解析失败'
                if (msg.length > 20) {
                    openAlertModal({ title: '解析失败', content: msg })
                } else {
                    void Taro.showToast({ title: msg, icon: 'none' })
                }
            }
        } finally {
            setLoading(false)
            setStreaming(false)
        }
    }, [validate, loading, leftPath, rightPath])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        setPhase('upload')
        setLeftPath(null)
        setRightPath(null)
        setResult(null)
        setStreamText('')
        setStreaming(false)
        setLoading(false)
    }, [])

    const renderUploadSlot = (side: HandSide, path: string | null, label: string) => (
        <View className='palm-panel__slot'>
            <Text className='palm-panel__slot-label'>{label}</Text>
            <View
                className={`palm-panel__upload ${path ? 'palm-panel__upload--filled' : ''}`}
                onClick={() => void chooseHand(side)}
            >
                {path
                    ? (
                        <>
                            <Image className='palm-panel__preview' src={path} mode='aspectFill' />
                            <View
                                className='palm-panel__clear'
                                onClick={(e) => clearHand(side, e)}
                            >
                                <Text className='palm-panel__clear-txt'>×</Text>
                            </View>
                        </>
                    )
                    : (
                        <View className='palm-panel__upload-placeholder'>
                            <Text className='palm-panel__upload-icon'>+</Text>
                            <Text className='palm-panel__upload-hint'>点击上传</Text>
                        </View>
                    )}
            </View>
        </View>
    )

    return (
        <View className='palm-panel'>
            <View className='palm-panel__scroll'>
                <View className='palm-panel__head'>
                    <Text className='palm-panel__title'>掌纹解析</Text>
                    <Text className='palm-panel__subtitle'>左右掌纹 · 三线五丘 · 参详解读</Text>
                </View>

                {phase === 'upload' && (
                    <View className='palm-panel__form'>
                        <View className='palm-panel__tips'>
                            {UPLOAD_TIPS.map((tip) => (
                                <Text key={tip} className='palm-panel__tip-line'>· {tip}</Text>
                            ))}
                        </View>

                        <View className='palm-panel__upload-row'>
                            {renderUploadSlot('left', leftPath, '左手掌纹')}
                            {renderUploadSlot('right', rightPath, '右手掌纹')}
                        </View>

                        <View
                            className={`palm-panel__cta ${loading ? 'palm-panel__cta--disabled' : ''}`}
                            onClick={() => void submit()}
                        >
                            <Text className='palm-panel__cta-txt'>
                                {loading ? '正在识别掌纹并生成解读…' : '开始解析'}
                            </Text>
                        </View>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='palm-panel__reading'>
                        {(result.left_summary || result.right_summary) && (
                            <View className='palm-panel__meta'>
                                {result.left_summary && (
                                    <View className='palm-panel__meta-row'>
                                        <Text className='palm-panel__meta-k'>左手</Text>
                                        <Text className='palm-panel__meta-v'>{result.left_summary}</Text>
                                    </View>
                                )}
                                {result.right_summary && (
                                    <View className='palm-panel__meta-row'>
                                        <Text className='palm-panel__meta-k'>右手</Text>
                                        <Text className='palm-panel__meta-v'>{result.right_summary}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View className='palm-panel__reading-box'>
                            <View className='palm-panel__reading-head'>
                                <Text className='palm-panel__reading-title'>掌 纹 详 解</Text>
                                {streaming && <View className='palm-panel__stream-dot' />}
                            </View>
                            {streamText
                                ? <MarkdownView className='palm-panel__reading-md' content={streamText} />
                                : (
                                    <Text className='palm-panel__reading-wait'>
                                        {streaming ? '掌纹洞开，解读将至…' : '暂无内容'}
                                    </Text>
                                )}
                        </View>

                        {!streaming && (
                            <View className='palm-panel__ghost-btn' onClick={reset}>
                                <Text className='palm-panel__ghost-txt'>重新上传</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}
