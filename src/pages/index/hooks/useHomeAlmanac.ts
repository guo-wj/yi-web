import { useEffect, useState } from 'react'

import { getAlmanacDay, type AlmanacResponse } from '@/services/almanacApi'
import { buildFortuneItems, buildTodayScore, type FortuneItem } from '../utils/homeFortune'

interface HomeAlmanacState {
    loading: boolean
    error: string | null
    data: AlmanacResponse | null
    fortuneItems: FortuneItem[]
    todayScore: number
}

export function useHomeAlmanac (): HomeAlmanacState {
    const [state, setState] = useState<HomeAlmanacState>({
        loading: true,
        error: null,
        data: null,
        fortuneItems: [],
        todayScore: 80
    })

    useEffect(() => {
        let cancelled = false
        void getAlmanacDay()
            .then((data) => {
                if (cancelled) return
                const fortuneItems = buildFortuneItems(data)
                setState({
                    loading: false,
                    error: null,
                    data,
                    fortuneItems,
                    todayScore: buildTodayScore(fortuneItems)
                })
            })
            .catch((e) => {
                if (cancelled) return
                setState({
                    loading: false,
                    error: e instanceof Error ? e.message : '加载失败',
                    data: null,
                    fortuneItems: [],
                    todayScore: 80
                })
            })
        return () => {
            cancelled = true
        }
    }, [])

    return state
}
