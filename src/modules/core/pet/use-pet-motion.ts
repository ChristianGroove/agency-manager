'use client'

import { useCallback, useSyncExternalStore } from 'react'

export function usePetMedia(query: string) {
    const subscribe = useCallback((change: () => void) => {
        const media = window.matchMedia(query)
        media.addEventListener('change', change)
        return () => media.removeEventListener('change', change)
    }, [query])
    const snapshot = useCallback(() => window.matchMedia(query).matches, [query])
    return useSyncExternalStore(subscribe, snapshot, () => false)
}

const visibilitySubscribe = (change: () => void) => {
    document.addEventListener('visibilitychange', change)
    return () => document.removeEventListener('visibilitychange', change)
}
const visibilitySnapshot = () => !document.hidden
export function usePetPageVisible() {
    return useSyncExternalStore(visibilitySubscribe, visibilitySnapshot, () => false)
}
