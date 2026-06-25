import { isMobile } from '@/utils/device'
import BaziPanelPC from './pc'
import BaziPanelMobile from './mobile'

export default function BaziPanel () {
    return isMobile() ? <BaziPanelMobile /> : <BaziPanelPC />
}
