import { isMobile } from '@/utils/device'
import HuangliPanelPC from './pc'
import HuangliPanelMobile from './mobile'

export default function HuangliPanel () {
    return isMobile() ? <HuangliPanelMobile /> : <HuangliPanelPC />
}
