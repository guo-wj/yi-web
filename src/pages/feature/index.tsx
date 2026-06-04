import FeaturePageMobile from './FeaturePageMobile'
import FeaturePagePC from './FeaturePagePC'
import { isMobile } from '@/utils/device'

export default function FeaturePage () {
  return isMobile() ? <FeaturePageMobile /> : <FeaturePagePC />
}
