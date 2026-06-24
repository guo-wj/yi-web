import type { AuthUser } from '@/utils/auth'

import { apiRequest } from './http'

/** 与 yi-back-end POST /api/auth/* 对齐 */

export interface AuthTokenResponse {
    token: string
    token_type: string
    expires_in: number
    user: AuthUser
}

export interface AccountLoginRequest {
    account: string
    password: string
}

export interface AccountRegisterRequest {
    account: string
    password: string
    invite_code?: string
}

/** 登录：手机号或邮箱 + 密码 */
export async function login (body: AccountLoginRequest): Promise<AuthTokenResponse> {
    const data = await apiRequest<AuthTokenResponse>('/api/auth/login', {
        method: 'POST',
        data: body,
        fallbackError: '登录失败'
    })
    if (!data?.token || !data.user) {
        throw new Error('返回数据格式异常')
    }
    return data
}

/** 注册：手机号或邮箱 + 密码 */
export async function register (body: AccountRegisterRequest): Promise<AuthTokenResponse> {
    const data = await apiRequest<AuthTokenResponse>('/api/auth/register', {
        method: 'POST',
        data: body,
        fallbackError: '注册失败'
    })
    if (!data?.token || !data.user) {
        throw new Error('返回数据格式异常')
    }
    return data
}

/** 获取当前登录用户信息，用于恢复会话 */
export async function fetchMe (): Promise<AuthUser> {
    return apiRequest<AuthUser>('/api/auth/me', {
        auth: true,
        fallbackError: '获取用户信息失败'
    })
}

/** @deprecated 使用 login */
export const loginPhone = (body: { phone: string, password: string }) =>
    login({ account: body.phone, password: body.password })

/** @deprecated 使用 register */
export const registerPhone = (body: { phone: string, password: string, invite_code?: string }) =>
    register({ account: body.phone, password: body.password, invite_code: body.invite_code })

/** @deprecated 使用 login */
export const loginEmail = (body: { email: string, password: string }) =>
    login({ account: body.email, password: body.password })

/** @deprecated 使用 register */
export const registerEmail = (body: { email: string, password: string, invite_code?: string }) =>
    register({ account: body.email, password: body.password, invite_code: body.invite_code })

