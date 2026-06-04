import Taro from '@tarojs/taro'

const MOBILE_UA_REGEXP = /Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini|Mobile/i

export function isMobile (): boolean {
  try {
    const env = Taro.getEnv()

    if (env !== Taro.ENV_TYPE.WEB) {
      return true
    }
  } catch {
    /* 非 Taro 环境时继续走浏览器判断 */
  }

  if (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string') {
    return MOBILE_UA_REGEXP.test(navigator.userAgent)
  }

  return false
}
