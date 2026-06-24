export const USER_DISPLAY_NAME = '游客'

const PHONE_RE = /^1\d{10}$/

export function userInitial (name: string): string {
    const trimmed = name.trim()
    if (!trimmed || trimmed === '游客') return '游'
    if (PHONE_RE.test(trimmed)) return trimmed.slice(-1)
    return [...trimmed][0] ?? '?'
}

export function formatUserLabel (user: { phone?: string | null, email?: string | null } | null): string {
    if (!user) return USER_DISPLAY_NAME
    if (user.phone) return maskPhone(user.phone)
    if (user.email) {
        const mail = user.email
        if (mail.endsWith('@phone.yijian.local')) {
            return maskPhone(mail.replace('@phone.yijian.local', ''))
        }
        return maskEmail(mail)
    }
    return USER_DISPLAY_NAME
}

export function maskPhone (phone: string): string {
    if (phone.length !== 11) return phone
    return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

export function isValidPhone (phone: string): boolean {
    return PHONE_RE.test(phone.trim())
}

export function isValidPassword (password: string): boolean {
    const value = password.trim()
    return value.length >= 6 && value.length <= 64
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail (email: string): boolean {
    return EMAIL_RE.test(email.trim())
}

export function maskEmail (email: string): string {
    const trimmed = email.trim()
    const at = trimmed.indexOf('@')
    if (at <= 1) return trimmed
    return `${trimmed.slice(0, 2)}***${trimmed.slice(at)}`
}
