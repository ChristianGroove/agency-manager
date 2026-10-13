'use client'

import { useCallback, useEffect, useState } from 'react'

/** One deadline, renewed only by interacting with the robot, never by global cursor movement. */
export function usePetHibernation(enabled: boolean, minutes: number) {
    const [cycle, setCycle] = useState({ enabled, minutes, id: 0 })
    const [expiredCycle, setExpiredCycle] = useState<number | null>(null)
    // Adjust before committing children so changed settings cannot revive an expired cycle.
    if (cycle.enabled !== enabled || cycle.minutes !== minutes) {
        setCycle({ enabled, minutes, id: cycle.id + 1 })
    }
    const wake = useCallback(() => setCycle(current => ({ ...current, id: current.id + 1 })), [])
    const cycleId = cycle.id

    useEffect(() => {
        if (!enabled) return
        const duration = minutes * 60_000
        const deadline = Date.now() + duration
        const expire = () => setExpiredCycle(cycleId)
        const timer = setTimeout(expire, duration)
        // Timers may be throttled in background tabs. Returning does not grant another active window.
        const checkVisibility = () => { if (!document.hidden && Date.now() >= deadline) expire() }
        document.addEventListener('visibilitychange', checkVisibility)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('visibilitychange', checkVisibility)
        }
    }, [enabled, minutes, cycleId])

    return { sleeping: enabled && expiredCycle === cycleId, wake }
}
