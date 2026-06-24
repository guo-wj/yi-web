import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { login, register } from '@/services/authApi'
import { isValidEmail, isValidPassword, isValidPhone } from '@/constants/user'
import { LEGAL_DOCUMENTS, type LegalDocKey } from '@/constants/legalDocs'
import { setAuth } from '@/utils/auth'
import {
    closeAuthModal,
    consumeAuthModalSuccess,
    getAuthModalState,
    subscribeAuthModal,
    type AuthModalMode
} from '@/utils/authModal'
import { openAlertModal } from '@/utils/confirmModal'

import './index.scss'

type AccountChannel = 'phone' | 'email'

interface InputDetail {
    detail: { value: string }
}

function resolveAccountType (value: string): AccountChannel | null {
    const trimmed = value.trim()
    if (isValidPhone(trimmed)) return 'phone'
    if (isValidEmail(trimmed)) return 'email'
    return null
}

interface LoginModalProps {
    open: boolean
    initialMode?: AuthModalMode
    onClose?: () => void
    onSuccess?: () => void
}

function LoginModalForm ({
    open,
    initialMode = 'login',
    onClose,
    onSuccess
}: LoginModalProps) {
    const [mode, setMode] = useState<AuthModalMode>(initialMode)
    const [channel, setChannel] = useState<AccountChannel>('phone')
    const [account, setAccount] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [inviteCode, setInviteCode] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [legalDoc, setLegalDoc] = useState<LegalDocKey | null>(null)

    useEffect(() => {
        if (!open) return
        setMode(initialMode)
        setChannel('phone')
        setAccount('')
        setPhone('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setShowConfirmPassword(false)
        setSubmitting(false)
        setLegalDoc(null)
    }, [open, initialMode])

    const handleClose = useCallback(() => {
        onClose?.()
    }, [onClose])

    const validate = useCallback((): string | null => {
        if (mode === 'login') {
            const type = resolveAccountType(account)
            if (!type) {
                return account.includes('@') ? '请输入有效的邮箱' : '请输入有效的 11 位手机号'
            }
        } else if (channel === 'phone') {
            if (!isValidPhone(phone)) return '请输入有效的 11 位手机号'
        } else if (!isValidEmail(email)) {
            return '请输入有效的邮箱'
        }
        if (!isValidPassword(password)) return '密码至少 6 位'
        if (mode === 'register' && password !== confirmPassword) return '两次输入的密码不一致'
        return null
    }, [mode, account, channel, phone, email, password, confirmPassword])

    const onSubmit = useCallback(async () => {
        if (submitting) return
        const err = validate()
        if (err) {
            void Taro.showToast({ title: err, icon: 'none' })
            return
        }

        setSubmitting(true)
        try {
            const invite = inviteCode.trim() || undefined
            const data = mode === 'login'
                ? await login({ account: account.trim(), password })
                : await register({
                    account: (channel === 'phone' ? phone : email).trim(),
                    password,
                    invite_code: invite
                })

            setAuth(data.token, data.user)
            void Taro.showToast({
                title: mode === 'login' ? '登录成功' : '注册成功',
                icon: 'success'
            })
            onSuccess?.()
        } catch (e) {
            const msg = e instanceof Error ? e.message : '操作失败'
            if (msg.length > 20) {
                openAlertModal({ title: '提示', content: msg })
            } else {
                void Taro.showToast({ title: msg, icon: 'none' })
            }
        } finally {
            setSubmitting(false)
        }
    }, [submitting, validate, account, channel, phone, email, password, inviteCode, mode, onSuccess])

    const switchMode = useCallback((next: AuthModalMode) => {
        if (next === 'register' && mode === 'login') {
            const type = resolveAccountType(account)
            if (type === 'phone') {
                setChannel('phone')
                setPhone(account.trim())
            } else if (type === 'email') {
                setChannel('email')
                setEmail(account.trim())
            }
        } else if (next === 'login' && mode === 'register') {
            setAccount(channel === 'phone' ? phone : email)
        }
        setMode(next)
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setShowConfirmPassword(false)
    }, [mode, account, channel, phone, email])

    const switchChannel = useCallback((next: AccountChannel) => {
        setChannel(next)
        setPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setShowConfirmPassword(false)
    }, [])

    if (!open) return null

    const activeLegal = legalDoc ? LEGAL_DOCUMENTS[legalDoc] : null

    return (
        <View className='login-modal'>
            <View className='login-modal__mask' onClick={handleClose} />
            <View className='login-modal__panel' catchMove onClick={(e) => e.stopPropagation?.()}>
                <View className='login-modal__close' onClick={handleClose}>
                    <Text>×</Text>
                </View>

                <View className='login-modal__emblem'>
                    <Text className='login-modal__emblem-char'>易</Text>
                </View>

                <Text className='login-modal__title'>
                    {mode === 'login' ? '欢迎回来' : '开始您的命理探索之旅'}
                </Text>
                <Text className='login-modal__subtitle'>
                    {mode === 'login'
                        ? '登录后继续问事解卦与保存记录'
                        : '创建账户，解锁更多 AI 解读与会员权益'}
                </Text>

                {mode === 'register' && (
                    <View className='login-modal__channel'>
                        <View
                            className={`login-modal__channel-btn ${channel === 'phone' ? 'login-modal__channel-btn--active' : ''}`}
                            onClick={() => switchChannel('phone')}
                        >
                            <Text className='login-modal__channel-txt'>手机号</Text>
                        </View>
                        <View
                            className={`login-modal__channel-btn ${channel === 'email' ? 'login-modal__channel-btn--active' : ''}`}
                            onClick={() => switchChannel('email')}
                        >
                            <Text className='login-modal__channel-txt'>邮箱</Text>
                        </View>
                    </View>
                )}

                <View className='login-modal__field'>
                    <Text className='login-modal__field-icon'>
                        {mode === 'login' ? '👤' : channel === 'phone' ? '👤' : '✉️'}
                    </Text>
                    {mode === 'login' ? (
                        <Input
                            className='login-modal__input'
                            type='text'
                            maxlength={80}
                            placeholder='请输入手机号或邮箱'
                            placeholderClass='login-modal__placeholder'
                            value={account}
                            onInput={(e: InputDetail) => setAccount(e.detail.value)}
                        />
                    ) : (
                        <Input
                            className='login-modal__input'
                            type={channel === 'phone' ? 'number' : 'text'}
                            maxlength={channel === 'phone' ? 11 : 80}
                            placeholder={channel === 'phone' ? '请输入手机号' : '请输入邮箱'}
                            placeholderClass='login-modal__placeholder'
                            value={channel === 'phone' ? phone : email}
                            onInput={(e: InputDetail) => (
                                channel === 'phone'
                                    ? setPhone(e.detail.value)
                                    : setEmail(e.detail.value)
                            )}
                        />
                    )}
                </View>

                <View className='login-modal__field'>
                    <Text className='login-modal__field-icon'>🔒</Text>
                    <Input
                        className='login-modal__input'
                        password={!showPassword}
                        placeholder='请输入密码'
                        placeholderClass='login-modal__placeholder'
                        value={password}
                        onInput={(e: InputDetail) => setPassword(e.detail.value)}
                    />
                    <View
                        className='login-modal__eye'
                        onClick={() => setShowPassword((v) => !v)}
                    >
                        <Text>{showPassword ? '🙈' : '👁'}</Text>
                    </View>
                </View>

                {mode === 'register' && (
                    <>
                        <View className='login-modal__field'>
                            <Text className='login-modal__field-icon'>🔒</Text>
                            <Input
                                className='login-modal__input'
                                password={!showConfirmPassword}
                                placeholder='请再次输入密码'
                                placeholderClass='login-modal__placeholder'
                                value={confirmPassword}
                                onInput={(e: InputDetail) => setConfirmPassword(e.detail.value)}
                            />
                            <View
                                className='login-modal__eye'
                                onClick={() => setShowConfirmPassword((v) => !v)}
                            >
                                <Text>{showConfirmPassword ? '🙈' : '👁'}</Text>
                            </View>
                        </View>

                        <View className='login-modal__invite-label'>邀请码（选填）</View>
                        <View className='login-modal__field'>
                            <Text className='login-modal__field-icon'>🎁</Text>
                            <Input
                                className='login-modal__input'
                                placeholder='积分奖励可兑换解读或礼物'
                                placeholderClass='login-modal__placeholder'
                                value={inviteCode}
                                onInput={(e: InputDetail) => setInviteCode(e.detail.value)}
                            />
                        </View>
                        <Text className='login-modal__invite-hint'>
                            填写有效邀请码可获得额外积分或会员奖励
                        </Text>
                    </>
                )}

                <View
                    className={`login-modal__submit ${submitting ? 'login-modal__submit--disabled' : ''}`}
                    onClick={() => void onSubmit()}
                >
                    <Text>{submitting ? '提交中…' : mode === 'login' ? '登 录' : '注 册'}</Text>
                </View>

                <View
                    className='login-modal__switch'
                    onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                >
                    <Text className='login-modal__switch-txt'>
                        {mode === 'login' ? '还没有账户？' : '已有账户？立即登录'}
                    </Text>
                </View>

                <View className='login-modal__legal'>
                    <Text className='login-modal__legal-plain'>
                        {mode === 'login' ? '登录' : '注册'}即表示您同意
                    </Text>
                    <Text
                        className='login-modal__legal-link'
                        onClick={(e) => {
                            e.stopPropagation?.()
                            setLegalDoc('terms')
                        }}
                    >
                        服务条款
                    </Text>
                    <Text className='login-modal__legal-plain'>和</Text>
                    <Text
                        className='login-modal__legal-link'
                        onClick={(e) => {
                            e.stopPropagation?.()
                            setLegalDoc('privacy')
                        }}
                    >
                        隐私政策
                    </Text>
                </View>

                <View className='login-modal__brand-foot'>
                    <Text>易AI</Text>
                </View>
            </View>

            {activeLegal && (
                <View className='login-modal__doc-layer' catchMove>
                    <View
                        className='login-modal__doc-mask'
                        onClick={() => setLegalDoc(null)}
                    />
                    <View
                        className='login-modal__doc-panel'
                        onClick={(e) => e.stopPropagation?.()}
                    >
                        <View className='login-modal__doc-head'>
                            <Text className='login-modal__doc-title'>{activeLegal.title}</Text>
                            <View
                                className='login-modal__doc-close'
                                onClick={() => setLegalDoc(null)}
                            >
                                <Text>×</Text>
                            </View>
                        </View>
                        <View className='login-modal__doc-scroll'>
                            <Text className='login-modal__doc-updated'>
                                更新日期：{activeLegal.updatedAt}
                            </Text>
                            {activeLegal.sections.map((section) => (
                                <View key={section.heading} className='login-modal__doc-section'>
                                    <Text className='login-modal__doc-heading'>{section.heading}</Text>
                                    {section.paragraphs.map((p) => (
                                        <Text key={p} className='login-modal__doc-p'>{p}</Text>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            )}
        </View>
    )
}

/** 全局登录/注册弹窗，挂载到 body 以免被父级遮挡 */
export default function LoginModal () {
    const modal = useSyncExternalStore(subscribeAuthModal, getAuthModalState, getAuthModalState)

    const handleSuccess = useCallback(() => {
        const cb = consumeAuthModalSuccess()
        cb?.()
    }, [])

    if (!modal.open) return null

    const node = (
        <LoginModalForm
            open={modal.open}
            initialMode={modal.mode}
            onClose={closeAuthModal}
            onSuccess={handleSuccess}
        />
    )

    if (typeof document !== 'undefined') {
        return createPortal(node, document.body)
    }

    return node
}

export { LoginModalForm }
