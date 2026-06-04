import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import lotteryTubeImg from '@/assets/images/lottery-tube.png'

import {
  postLotteryDraw,
  type LotteryDrawResponse
} from '@/services/lotteryApi'

import './index.scss'

export interface LotteryPanelProps {
  today?: { dateLine: string; weekdayLine: string }
}

function formatTodayCn (): { dateLine: string; weekdayLine: string } {
  const d = new Date()
  const mon = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return {
    dateLine: `${mon}月${day}日`,
    weekdayLine: `${weekdays[d.getDay()]} · 今日运势`
  }
}

const SHAKE_MS = 720

export default function LotteryPanel ({ today: todayProp }: LotteryPanelProps) {
  const today = useMemo(() => todayProp ?? formatTodayCn(), [todayProp])

  const [loading, setLoading] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [result, setResult] = useState<LotteryDrawResponse | null>(null)
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drawInFlightRef = useRef(false)

  const pillPreview = useMemo(() => {
    if (result?.slip) {
      const n = 500 + result.slip.id * 7
      return {
        left: '今日最热门',
        mid: `第 ${result.slip.id} 签 ${result.slip.tier}`,
        right: `${n} 人已抽中`
      }
    }
    return {
      left: '今日最热门',
      mid: '摇签后揭晓',
      right: '541 人已抽中'
    }
  }, [result])

  const goHome = useCallback(() => {
    void Taro.reLaunch({ url: '/pages/index/index' })
  }, [])

  const runDraw = useCallback(async () => {
    if (drawInFlightRef.current) return
    drawInFlightRef.current = true
    setLoading(true)
    setErrorMsg(null)
    try {
      const data = await postLotteryDraw({})
      setResult(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '抽签失败，请稍后重试'
      setErrorMsg(msg)
      void Taro.showToast({ title: msg.length > 20 ? '抽签失败' : msg, icon: 'none' })
    } finally {
      setLoading(false)
      drawInFlightRef.current = false
    }
  }, [])

  /** 接口在点击后立即发起，避免仅依赖摇签定时器（卸载/Strict Mode 清定时器会导致不请求） */
  const onShakeDraw = useCallback(() => {
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current)
      shakeTimerRef.current = null
    }
    setShaking(true)
    shakeTimerRef.current = setTimeout(() => {
      shakeTimerRef.current = null
      setShaking(false)
    }, SHAKE_MS)
    void runDraw()
  }, [runDraw])

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) {
        clearTimeout(shakeTimerRef.current)
      }
    }
  }, [])

  const ctaClass =
    loading || shaking
      ? 'lottery-panel__cta lottery-panel__cta--disabled'
      : 'lottery-panel__cta'

  return (
    <View className='lottery-panel'>
      <View className='lottery-panel__back' onClick={goHome}>
        <Text className='lottery-panel__back-txt'>← 返回首页</Text>
      </View>

      <View className='lottery-panel__date-block'>
        <Text className='lottery-panel__date-big'>{today.dateLine}</Text>
        <Text className='lottery-panel__date-sub'>{today.weekdayLine}</Text>
      </View>

      <View className='lottery-panel__pill'>
        <Text className='lottery-panel__pill-hot'>🔥 {pillPreview.left}</Text>
        <Text className='lottery-panel__pill-div'>|</Text>
        <Text className='lottery-panel__pill-mid'>{pillPreview.mid}</Text>
        <Text className='lottery-panel__pill-div'>|</Text>
        <Text className='lottery-panel__pill-right'>{pillPreview.right}</Text>
      </View>

      <View
        className={`lottery-panel__tube-stage ${shaking ? 'lottery-panel__tube-stage--shake' : ''}`}
      >
        <View className='lottery-panel__tube-shadow' />
        <View className='lottery-panel__tube-img-wrap'>
          <Image
            className='lottery-panel__tube-img'
            src={lotteryTubeImg}
            mode='widthFix'
          />
        </View>
      </View>

      <Text className='lottery-panel__title'>观音灵签</Text>
      <Text className='lottery-panel__desc'>静心凝神，摇签即得今日指引</Text>

      <View className={ctaClass} onClick={() => void onShakeDraw()}>
        <Text className='lottery-panel__cta-txt'>
          {loading ? '解签中…' : shaking ? '摇签中…' : '摇签求运势'}
        </Text>
      </View>

      {errorMsg && (
        <View className='lottery-panel__err'>
          <Text>{errorMsg}</Text>
        </View>
      )}

      {result && (
        <View className='lottery-panel__result'>
          <View className='lottery-panel__result-meta'>
            <Text>{result.lunar_summary}</Text>
          </View>

          <View className='lottery-panel__result-slip'>
            <View className='lottery-panel__result-head'>
              <Text className='lottery-panel__result-id'>第 {result.slip.id} 签</Text>
              <Text className='lottery-panel__result-tier'>{result.slip.tier}</Text>
            </View>
            <Text className='lottery-panel__result-title'>{result.slip.title}</Text>
            <Text className='lottery-panel__result-poem'>{result.slip.poem}</Text>
          </View>

          <Text className='lottery-panel__result-sec-title'>解签</Text>
          <Text className='lottery-panel__result-interpret'>{result.interpretation}</Text>
        </View>
      )}
    </View>
  )
}
