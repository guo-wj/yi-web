import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useEffect, useState, useSyncExternalStore } from 'react'
import UserMenu from '@/components/UserMenu'
import FeatureIcon from '@/components/FeatureIcon'
import LotteryPanel from '@/components/LotteryPanel'
import HuangliPanel from '@/components/HuangliPanel'
import LiuyaoPanel from '@/components/LiuyaoPanel'
import BaziPanel from '@/components/BaziPanel'
import MeihuaPanel from '@/components/MeihuaPanel'
import PalmPanel from '@/components/PalmPanel'
import FacePanel from '@/components/FacePanel'
import pinIcon from '@/assets/icons/pin.svg'
import { FEATURE_ITEMS, getFeatureByKey } from '@/constants/features'
import { useFeatureState } from './components/shared'
import {
    getShellSettingsState,
    subscribeShellSettings
} from '@/utils/shellSettings'
import './pc.scss'

type ShellRail = 'collapsed' | 'expanded'

const RAIL_KEY = 'yi-web:pc-rail'

function readStoredRail (): ShellRail {
    try {
        const stored = Taro.getStorageSync(RAIL_KEY)
        if (stored === 'collapsed' || stored === 'expanded') return stored
    } catch { /* noop */ }
    return 'collapsed'
}

export default function FeaturePagePC () {
    const { theme } = useSyncExternalStore(
        subscribeShellSettings,
        getShellSettingsState,
        getShellSettingsState
    )
    const [rail, setRail] = useState<ShellRail>(readStoredRail)
    const { activeKey, selectFeature, syncFeatureKey } = useFeatureState()

    useLoad((options) => {
        const raw = options?.key as string | undefined
        syncFeatureKey(raw)
    })

    useEffect(() => {
        try { Taro.setStorageSync(RAIL_KEY, rail) } catch { /* noop */ }
    }, [rail])

    const active = getFeatureByKey(activeKey)

    return (
        <View className={`feature-shell feature-shell--theme-${theme} feature-shell--rail-${rail}`}>

            {/* ===================== RAIL ===================== */}
            <View className='feature-shell__rail'>
                <View className='feature-shell__brand'>
                    <View className='feature-shell__brand-mark'>
                        <Text className='feature-shell__brand-char'>易</Text>
                    </View>
                    <View className='feature-shell__brand-text'>
                        <Text className='feature-shell__brand-name'>易AI</Text>
                        <Text className='feature-shell__brand-cap'>YI AI</Text>
                    </View>
                </View>

                <View className='feature-shell__nav'>
                    {FEATURE_ITEMS.map((item) => (
                        <View
                            key={item.key}
                            className={`feature-shell__nav-item ${activeKey === item.key ? 'feature-shell__nav-item--active' : ''}`}
                            onClick={() => selectFeature(item.key)}
                        >
                            <View className='feature-shell__nav-icon-box'>
                                <FeatureIcon
                                    className='feature-shell__nav-icon'
                                    src={item.icon}
                                    scale={item.iconScale}
                                />
                            </View>
                            <Text className='feature-shell__nav-label'>{item.title}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* ===================== MAIN ===================== */}
            <View className='feature-shell__main'>
                <View className='feature-shell__topbar'>
                    <View
                        className='feature-shell__icon-btn'
                        onClick={() => setRail((v) => (v === 'expanded' ? 'collapsed' : 'expanded'))}
                    >
                        <FeatureIcon className='feature-shell__topbar-icon' src={pinIcon} />
                    </View>
                    <View className='feature-shell__crumb'>
                        <Text className='feature-shell__crumb-root'>易AI</Text>
                        <Text className='feature-shell__crumb-sep'>／</Text>
                        <Text className='feature-shell__crumb-cur'>{active.title}</Text>
                        <Text className='feature-shell__crumb-sub'>· {active.sub}</Text>
                    </View>
                    <View className='feature-shell__spacer' />
                    <View className='feature-shell__topbar-user'>
                        <UserMenu dock='topbar-inline' uiMode='pc' />
                    </View>
                </View>

                <View className='feature-shell__content' key={activeKey}>
                    {activeKey === 'qian' ? (
                        <View className='feature-shell__panel feature-shell__panel--flush'>
                            <LotteryPanel />
                        </View>
                    ) : activeKey === 'huangli' ? (
                        <View className='feature-shell__panel feature-shell__panel--flush'>
                            <HuangliPanel />
                        </View>
                    ) : activeKey === 'liuyao' ? (
                        <View className='feature-shell__panel feature-shell__panel--flush'>
                            <LiuyaoPanel />
                        </View>
                    ) : activeKey === 'bazi' ? (
                        <View className='feature-shell__panel feature-shell__panel--flush'>
                            <BaziPanel />
                        </View>
                    ) : activeKey === 'ziwei' ? (
                        <View className='feature-shell__panel feature-shell__panel--flush'>
                            <MeihuaPanel />
                        </View>
                    ) : activeKey === 'zhangwen' ? (
                        <View className='feature-shell__panel feature-shell__panel--flush'>
                            <PalmPanel />
                        </View>
                    ) : activeKey === 'mianxiang' ? (
                        <View className='feature-shell__panel feature-shell__panel--flush'>
                            <FacePanel />
                        </View>
                    ) : (
                        <View className='feature-shell__panel feature-shell__soon'>
                            <View className='feature-shell__soon-emblem'>
                                <View className='feature-shell__soon-ring' />
                                <View className='feature-shell__soon-ring feature-shell__soon-ring--r2' />
                                <View className='feature-shell__soon-dot feature-shell__soon-dot--n' />
                                <View className='feature-shell__soon-dot feature-shell__soon-dot--s' />
                                <View className='feature-shell__soon-dot feature-shell__soon-dot--e' />
                                <View className='feature-shell__soon-dot feature-shell__soon-dot--w' />
                                <FeatureIcon
                                    className='feature-shell__soon-icon'
                                    src={active.icon}
                                    scale={active.iconScale}
                                />
                            </View>
                            <Text className='feature-shell__soon-title'>{active.title}</Text>
                            <View className='feature-shell__soon-poem'>
                                {(active.soonPoem ?? '').split('\n').map((line, i) => (
                                    <Text key={i} className='feature-shell__soon-poem-line'>{line}</Text>
                                ))}
                            </View>
                            <Text className='feature-shell__soon-pill'>敬请期待 · COMING SOON</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    )
}
