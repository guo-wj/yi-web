import { isMobile } from '@/utils/device'
import FacePanelPC from './pc'
import FacePanelMobile from './mobile'

export default function FacePanel () {
    return isMobile() ? <FacePanelMobile /> : <FacePanelPC />
}
