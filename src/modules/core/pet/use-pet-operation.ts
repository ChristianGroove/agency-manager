'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePet } from './pet-provider'

type Finish = (state: 'happy' | 'error' | 'idle') => void

/** Optional visual feedback; no provider means business operations continue normally. */
export function usePetOperation() {
    const beginOperation = usePet()?.beginOperation
    const active = useRef<Finish | null>(null)
    useEffect(() => () => { active.current?.('idle') }, [])
    return useCallback(() => {
        active.current?.('idle')
        const finish = beginOperation?.() || (() => {})
        active.current = finish
        return (state: 'happy' | 'error' | 'idle') => {
            finish(state)
            if (active.current === finish) active.current = null
        }
    }, [beginOperation])
}
