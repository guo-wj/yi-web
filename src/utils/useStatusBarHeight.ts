import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { safeNonNegativePx } from '@/utils/safeNumber'

export function useStatusBarHeight (): number {
  const [statusBarHeight, setStatusBarHeight] = useState(0)

  useLoad(() => {
    try {
      const win = Taro.getWindowInfo()
      setStatusBarHeight(safeNonNegativePx(win.statusBarHeight, 0))
    } catch {
      setStatusBarHeight(0)
    }
  })

  return safeNonNegativePx(statusBarHeight, 0)
}
