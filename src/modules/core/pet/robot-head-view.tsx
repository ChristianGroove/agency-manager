'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot } from 'lucide-react'
import { RobotHead } from './vendor/robot-heads/src/RobotHead'
import { usePetMedia, usePetPageVisible } from './use-pet-motion'
import type { PetSettings, PetState } from './config'

export interface RobotHeadViewProps {
    settings: PetSettings
    palette: { color: string; trimColor: string; screenColor: string }
    state: PetState
    size: number
    animate?: boolean
    hibernating?: boolean
    onFailure?: () => void
}

export function RobotHeadView({ settings, palette, state, size, animate = false, hibernating = false, onFailure }: RobotHeadViewProps) {
    const reducedMotion = usePetMedia('(prefers-reduced-motion: reduce)')
    const finePointer = usePetMedia('(any-hover: hover) and (any-pointer: fine)')
    const visible = usePetPageVisible()
    const [failed, setFailed] = useState(false)
    const [inViewport, setInViewport] = useState(true)
    const [settled, setSettled] = useState(false)
    const nodeRef = useRef<HTMLSpanElement>(null)
    const tracking = settings.interactive && state === 'idle' && finePointer
    const contextualRest = settings.animation === 'contextual' && settled
    const paused = hibernating || (!animate && !tracking) || settings.animation === 'off' || reducedMotion || !visible || !inViewport || (contextualRest && !tracking)
    const pointerOnly = tracking && settings.animation !== 'continuous' && (!animate || contextualRest)

    useEffect(() => {
        if (!animate || settings.animation !== 'contextual') return
        const busy = state === 'thinking' || state === 'working' || state === 'searching'
        const timer = setTimeout(() => setSettled(true), busy ? 15000 : 2500)
        return () => clearTimeout(timer)
    }, [animate, settings.animation, state])

    useEffect(() => {
        const element = nodeRef.current
        if (failed || !element || typeof IntersectionObserver === 'undefined') return
        const observer = new IntersectionObserver(entries => setInViewport(entries[0]?.isIntersecting ?? false))
        observer.observe(element)
        return () => observer.disconnect()
    }, [failed])

    if (failed) return <Bot aria-hidden style={{ width: size, height: size }} />
    return <span ref={nodeRef} aria-hidden="true" className="block shrink-0" style={{ width: size, height: size }}>
        <RobotHead
            shape={settings.shape} state={state} size={size} {...palette}
            speed={settings.speed} paused={paused} pointerOnly={pointerOnly} interactive={tracking}
            antenna={settings.antenna} floorShadow={settings.floorShadow} seed={0.3}
            onRenderError={() => { setFailed(true); onFailure?.() }}
        />
    </span>
}
