import Taro from '@tarojs/taro'

const MAX_EDGE = 1280
const JPEG_QUALITY = 0.72

function mimeFromPath (path: string): string {
    const lower = path.toLowerCase()
    if (lower.includes('.png')) return 'image/png'
    if (lower.includes('.webp')) return 'image/webp'
    if (lower.includes('.gif')) return 'image/gif'
    return 'image/jpeg'
}

async function compressViaCanvas (src: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
            const width = Math.max(1, Math.round(img.width * scale))
            const height = Math.max(1, Math.round(img.height * scale))
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('图片压缩失败'))
                return
            }
            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
        }
        img.onerror = () => reject(new Error('图片读取失败'))
        img.src = src
    })
}

async function compressImagePath (path: string): Promise<string> {
    if (typeof window !== 'undefined' && (path.startsWith('blob:') || path.startsWith('http'))) {
        return compressViaCanvas(path)
    }

    try {
        const { tempFilePath } = await Taro.compressImage({ src: path, quality: 75 })
        return tempFilePath || path
    } catch {
        return path
    }
}

/** 将本地 / blob 图片转为 data URL，H5 会先缩放压缩以控制上传体积 */
export async function pathToDataUrl (path: string): Promise<string> {
    const filePath = await compressImagePath(path)
    if (filePath.startsWith('data:')) return filePath

    if (typeof window !== 'undefined' && (filePath.startsWith('blob:') || filePath.startsWith('http'))) {
        const res = await fetch(filePath)
        const blob = await res.blob()
        const mime = blob.type?.startsWith('image/') ? blob.type : mimeFromPath(filePath)
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('图片读取失败'))
            reader.readAsDataURL(blob)
        })
    }

    const mime = mimeFromPath(filePath)
    return new Promise((resolve, reject) => {
        Taro.getFileSystemManager().readFile({
            filePath,
            encoding: 'base64',
            success: (r) => {
                const raw = r.data
                if (typeof raw !== 'string') {
                    reject(new Error('图片读取失败'))
                    return
                }
                resolve(`data:${mime};base64,${raw}`)
            },
            fail: () => reject(new Error('图片读取失败'))
        })
    })
}
