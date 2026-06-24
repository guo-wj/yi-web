import wechatQr from '@/assets/images/vx.jpg'

/** 更换 vx.jpg 后递增，避免浏览器缓存旧图 */
const QR_CACHE_VERSION = 2

export const WECHAT_QR_IMAGE = `${wechatQr}?v=${QR_CACHE_VERSION}`
