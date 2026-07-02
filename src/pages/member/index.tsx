import { useRouter } from '@tarojs/taro'
import MemberPanel, { type MemberPanelTabKey } from '@/components/MemberPanel'

function parseTab (raw?: string): MemberPanelTabKey | undefined {
    if (!raw) return undefined
    if (raw === 'ledger') return 'tx'
    if (['overview', 'checkin', 'tx', 'recharge', 'member'].includes(raw)) {
        return raw as MemberPanelTabKey
    }
    return undefined
}

/** 独立路由页：重定向到内嵌 Panel，保留 deep link 兼容 */
export default function MemberPage () {
    const router = useRouter()
    return <MemberPanel initialTab={parseTab(router.params.tab)} />
}
