import { isMobile } from '@/utils/device'
import PalmPanelPC from './pc'
import PalmPanelMobile from './mobile'

export default function PalmPanel () {
    return isMobile() ? <PalmPanelMobile /> : <PalmPanelPC />
}
