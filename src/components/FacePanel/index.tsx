import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useRef, useState } from 'react'

import MarkdownView from '@/components/MarkdownView'
import { ensureLoggedIn } from '@/utils/requireAuth'
import { openAlertModal } from '@/utils/confirmModal'
import {
    postFaceAnalyze,
    streamFaceText,
    type FaceAnalyzeResponse,
    type FaceSlot
} from '@/services/faceApi'

import './index.scss'

type Phase = 'upload' | 'reading'

const MAX_IMAGES = 3

const SLOT_DEFS: ReadonlyArray<{ key: FaceSlot; label: string }> = [
    { key: 'front', label: '正面照' },
    { key: 'side', label: '侧面照' },
    { key: 'extra', label: '补充角度' }
]

const UPLOAD_TIPS = [
    '请在自然光下拍摄，面部无遮挡',
    '正面平视镜头，五官清晰可见',
    '最多上传 3 张，至少 1 张'
]

async function pickFaceImage (): Promise<string | null> {
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

function collectUploads (paths: (string | null)[]) {
    return paths
        .map((path, index) => {
            if (!path) return null
            const slot = SLOT_DEFS[index]
            if (!slot) return null
            return { path, slot: slot.key, label: slot.label, index }
        })
        .filter((item): item is { path: string; slot: FaceSlot; label: string; index: number } => Boolean(item))
}

export default function FacePanel () {
    const [phase, setPhase] = useState<Phase>('upload')
    const [paths, setPaths] = useState<(string | null)[]>([null, null, null])
    const [uploadLabels, setUploadLabels] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [streaming, setStreaming] = useState(false)
    const [streamText, setStreamText] = useState('')
    const [result, setResult] = useState<FaceAnalyzeResponse | null>(null)

    const abortRef = useRef<AbortController | null>(null)

    const chooseSlot = useCallback(async (index: number) => {
        const path = await pickFaceImage()
        if (!path) return
        setPaths((prev) => {
            const next = [...prev]
            next[index] = path
            return next
        })
    }, [])

    const clearSlot = useCallback((index: number, e?: { stopPropagation?: () => void }) => {
        e?.stopPropagation?.()
        setPaths((prev) => {
            const next = [...prev]
            next[index] = null
            return next
        })
    }, [])

    const validate = useCallback((): string | null => {
        if (!paths.some(Boolean)) return '请至少上传一张面部图片'
        return null
    }, [paths])

    const submit = useCallback(async () => {
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }
        if (loading) return
        if (!ensureLoggedIn()) return

        const uploads = collectUploads(paths)
        const imagePaths = uploads.map((item) => item.path)
        const slots = uploads.map((item) => item.slot)

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        setLoading(true)
        setStreaming(false)
        setStreamText('')
        setResult(null)

        try {
            const resp = await postFaceAnalyze(imagePaths, slots)
            if (ac.signal.aborted) return

            setUploadLabels(uploads.map((item) => item.label))
            setResult(resp)
            setPhase('reading')
            setStreaming(true)

            await streamFaceText(resp.content, (chunk) => {
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
    }, [validate, loading, paths])

    const reset = useCallback(() => {
        abortRef.current?.abort()
        setPhase('upload')
        setPaths([null, null, null])
        setUploadLabels([])
        setResult(null)
        setStreamText('')
        setStreaming(false)
        setLoading(false)
    }, [])

    const renderUploadSlot = (index: number) => {
        const path = paths[index]
        const label = SLOT_DEFS[index]?.label ?? `照片 ${index + 1}`
        return (
            <View key={index} className='face-panel__slot'>
                <Text className='face-panel__slot-label'>{label}</Text>
                <View
                    className={`face-panel__upload ${path ? 'face-panel__upload--filled' : ''}`}
                    onClick={() => void chooseSlot(index)}
                >
                    {path
                        ? (
                            <>
                                <Image className='face-panel__preview' src={path} mode='aspectFill' />
                                <View
                                    className='face-panel__clear'
                                    onClick={(e) => clearSlot(index, e)}
                                >
                                    <Text className='face-panel__clear-txt'>×</Text>
                                </View>
                            </>
                        )
                        : (
                            <View className='face-panel__upload-placeholder'>
                                <Text className='face-panel__upload-icon'>+</Text>
                                <Text className='face-panel__upload-hint'>点击上传</Text>
                            </View>
                        )}
                </View>
            </View>
        )
    }

    const uploadedCount = paths.filter(Boolean).length
    const perImageSummaries = result?.summaries ?? []
    const summaryItems = perImageSummaries.length > 0
        ? perImageSummaries.map((summary, i) => ({
            summary,
            label: uploadLabels[i] ?? `图${i + 1}`
        }))
        : result?.summary
            ? [{ summary: result.summary, label: '综合摘要' }]
            : []

    return (
        <View className='face-panel'>
            <View className='face-panel__scroll'>
                <View className='face-panel__head'>
                    <Text className='face-panel__title'>面相解析</Text>
                    <Text className='face-panel__subtitle'>五官气色 · 三停九部 · 参详解读</Text>
                </View>

                {phase === 'upload' && (
                    <View className='face-panel__form'>
                        <View className='face-panel__tips'>
                            {UPLOAD_TIPS.map((tip) => (
                                <Text key={tip} className='face-panel__tip-line'>· {tip}</Text>
                            ))}
                        </View>

                        <View className='face-panel__upload-row'>
                            {Array.from({ length: MAX_IMAGES }, (_, i) => renderUploadSlot(i))}
                        </View>

                        <Text className='face-panel__count-hint'>
                            已上传 {uploadedCount} / {MAX_IMAGES} 张
                        </Text>

                        <View
                            className={`face-panel__cta ${loading ? 'face-panel__cta--disabled' : ''}`}
                            onClick={() => void submit()}
                        >
                            <Text className='face-panel__cta-txt'>
                                {loading ? '正在识别面相并生成解读…' : '开始解析'}
                            </Text>
                        </View>
                    </View>
                )}

                {phase === 'reading' && result && (
                    <View className='face-panel__reading'>
                        {summaryItems.length > 0 && (
                            <View className='face-panel__meta'>
                                {summaryItems.map((item, i) => (
                                    <View key={`${item.label}-${i}`} className='face-panel__meta-row'>
                                        <Text className='face-panel__meta-k'>{item.label}</Text>
                                        <Text className='face-panel__meta-v'>{item.summary}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View className='face-panel__reading-box'>
                            <View className='face-panel__reading-head'>
                                <Text className='face-panel__reading-title'>面 相 详 解</Text>
                                {streaming && <View className='face-panel__stream-dot' />}
                            </View>
                            {streamText
                                ? <MarkdownView className='face-panel__reading-md' content={streamText} />
                                : (
                                    <Text className='face-panel__reading-wait'>
                                        {streaming ? '面相洞开，解读将至…' : '暂无内容'}
                                    </Text>
                                )}
                        </View>

                        {!streaming && (
                            <View className='face-panel__ghost-btn' onClick={reset}>
                                <Text className='face-panel__ghost-txt'>重新上传</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}
