import { isMobile } from '@/utils/device'
import LotteryPanelPC from './pc'
import LotteryPanelMobile from './mobile'

export default function LotteryPanel () {
    return isMobile() ? <LotteryPanelMobile /> : <LotteryPanelPC />
}
