import { View, Text, Textarea } from '@tarojs/components'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'

import './index.scss'

const INPUT_MIN_H = 28
const INPUT_MAX_H = 84

function syncTextareaHeight (wrap: HTMLElement | null) {
    if (!wrap || typeof window === 'undefined') return
    const ta = wrap.querySelector('textarea')
    if (!ta) return
    ta.style.height = `${INPUT_MIN_H}px`
    const next = Math.min(INPUT_MAX_H, Math.max(INPUT_MIN_H, ta.scrollHeight))
    ta.style.height = `${next}px`
    const core = ta.closest('taro-textarea-core') as HTMLElement | null
    if (core) core.style.height = `${next}px`
}

export interface DivineMethodOption {
    key: string
    label: string
    caption?: string
}

interface DivineSetupProps {
    /** 跑马灯问事预设 */
    prompts: readonly string[]
    question: string
    onQuestionChange: (value: string) => void
    inputPlaceholder?: string
    inputMaxLength?: number
    /** 分段控件标题，如「摇卦方式」「起卦方式」 */
    methodLabel: string
    methods: DivineMethodOption[]
    activeMethod: string
    onMethodChange: (key: string) => void
    /** 方式相关的附加面板（如梅花的时钟卡 / 数字卡） */
    children?: ReactNode
    ctaText: string
    ctaDisabled?: boolean
    onCast: () => void
    hint?: string
}

/**
 * 占卜类「第一页」通用起卦表单：问事跑马灯 + 输入框 + 方式分段切换 + 起卦按钮。
 * 六爻、梅花等共用，保证首页 UI 完全一致。
 */
export default function DivineSetup ({
    prompts,
    question,
    onQuestionChange,
    inputPlaceholder = '写下你想问的事，凝神默念三遍…',
    inputMaxLength = 80,
    methodLabel,
    methods,
    activeMethod,
    onMethodChange,
    children,
    ctaText,
    ctaDisabled = false,
    onCast,
    hint
}: DivineSetupProps) {
    const activeIndex = Math.max(0, methods.findIndex((m) => m.key === activeMethod))
    const loop = [...prompts, ...prompts]
    const inputWrapRef = useRef<HTMLDivElement>(null)

    const handleQuestionInput = useCallback((value: string) => {
        onQuestionChange(value)
        requestAnimationFrame(() => syncTextareaHeight(inputWrapRef.current))
    }, [onQuestionChange])

    useEffect(() => {
        requestAnimationFrame(() => syncTextareaHeight(inputWrapRef.current))
    }, [question])

    return (
        <View className='dv-setup'>
            <View className='dv-setup__section'>
                <View className='dv-setup__divider'>
                    <View className='dv-setup__divider-rule' />
                    <Text className='dv-setup__divider-txt'>心有所问</Text>
                    <View className='dv-setup__divider-rule' />
                </View>

                <View className='dv-setup__marquee'>
                    <View className='dv-setup__marquee-track'>
                        {loop.map((p, i) => (
                            <View
                                key={`${p}-${i}`}
                                className={`dv-setup__chip ${question === p ? 'dv-setup__chip--active' : ''}`}
                                onClick={() => onQuestionChange(p)}
                            >
                                <Text className='dv-setup__chip-txt'>{p}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View className='dv-setup__input-wrap' ref={inputWrapRef}>
                    <View className='dv-setup__input-badge'>
                        <Text>问</Text>
                    </View>
                    <Textarea
                        className='dv-setup__input'
                        value={question}
                        placeholder={inputPlaceholder}
                        placeholderClass='dv-setup__input-ph'
                        maxlength={inputMaxLength}
                        autoHeight
                        onInput={(e) => handleQuestionInput(e.detail.value)}
                    />
                </View>
            </View>

            <View className='dv-setup__mode-row'>
                <Text className='dv-setup__mode-label'>{methodLabel}</Text>
                <View className='dv-setup__seg'>
                    <View
                        className='dv-setup__seg-thumb'
                        style={{
                            width: `calc((100% - 10px) / ${methods.length})`,
                            transform: `translateX(${activeIndex * 100}%)`
                        }}
                    />
                    {methods.map((m) => (
                        <View
                            key={m.key}
                            className={`dv-setup__seg-opt ${m.key === activeMethod ? 'dv-setup__seg-opt--active' : ''}`}
                            onClick={() => onMethodChange(m.key)}
                        >
                            <Text className='dv-setup__seg-t'>{m.label}</Text>
                            {m.caption ? <Text className='dv-setup__seg-d'>{m.caption}</Text> : null}
                        </View>
                    ))}
                </View>
            </View>

            {children}

            <View
                className={`dv-setup__cta ${ctaDisabled ? 'dv-setup__cta--disabled' : ''}`}
                onClick={() => { if (!ctaDisabled) onCast() }}
            >
                <Text className='dv-setup__cta-txt'>{ctaText}</Text>
            </View>

            {hint ? <Text className='dv-setup__hint'>{hint}</Text> : null}
        </View>
    )
}
