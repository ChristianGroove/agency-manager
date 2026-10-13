"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HelpChatMessage } from '../actions/ask-help-assistant'
import { cleanHelpMessage } from './help-message-content'

interface HelpTurnNavigatorProps {
    messages: HelpChatMessage[]
    activeTurn: number
    reducedMotion: boolean
    onSelect: (index: number) => void
}

export function HelpTurnNavigator({ messages, activeTurn, reducedMotion, onSelect }: HelpTurnNavigatorProps) {
    const [previewIndex, setPreviewIndex] = useState<number | null>(null)
    const navRef = useRef<HTMLElement>(null)
    const barsRef = useRef<(HTMLSpanElement | null)[]>([])
    const frameRef = useRef<number | null>(null)
    const pointerRef = useRef<{ clientY: number } | { position: number } | null>(null)
    const turns = messages.flatMap((message, index) => message.role === 'user' ? [{ message, index }] : [])

    const scheduleWave = useCallback(() => {
        if (frameRef.current !== null) return
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null
            const area = navRef.current
            if (!area) return
            const pointer = pointerRef.current
            const position = pointer === null ? null : 'position' in pointer ? pointer.position
                : (pointer.clientY - area.getBoundingClientRect().top + area.scrollTop) / 12 - 0.5
            const nearest = position === null ? null : Math.max(0, Math.min(area.childElementCount - 1, Math.round(position)))
            // Only the small preview changes React state. Bar geometry is updated once per frame,
            // without restarting CSS transitions or reconciling all buttons on every pointer event.
            const nextPreview = nearest === null ? null : Number(barsRef.current[nearest]?.dataset.index)
            setPreviewIndex(previous => previous === nextPreview ? previous : nextPreview)
            barsRef.current.forEach((bar, ordinal) => {
                if (!bar) return
                const influence = position === null ? 0 : reducedMotion ? Number(ordinal === nearest)
                    : Math.exp(-Math.pow((ordinal - position) / 2.2, 2))
                const active = bar.dataset.active === 'true'
                bar.style.width = `${Math.max(active ? 14 : 4, 4 + influence * 19.4)}px`
                bar.style.opacity = `${active ? 1 : 0.25 + influence * 0.65}`
            })
        })
    }, [reducedMotion])

    const clearWave = () => { pointerRef.current = null; scheduleWave() }

    useEffect(() => {
        scheduleWave()
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
            frameRef.current = null
        }
    }, [scheduleWave, activeTurn, messages])

    if (!turns.length) return null

    return <>
        <nav ref={navRef} aria-label="Navegar por preguntas"
            className="absolute right-1 top-1/2 z-30 flex max-h-[60%] w-8 -translate-y-1/2 flex-col overflow-y-auto no-scrollbar [contain:layout_paint]"
            onPointerMove={event => {
                if (event.pointerType === 'touch') return
                pointerRef.current = { clientY: event.clientY }
                scheduleWave()
            }}
            onPointerLeave={clearWave}
            onScroll={clearWave}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) clearWave() }}>
            {turns.map(({ message, index }, ordinal) => {
                const active = activeTurn === index
                return <button key={index} type="button"
                    aria-label={`Ir a pregunta: ${message.content.slice(0, 80)}`}
                    aria-current={active ? 'true' : undefined}
                    onFocus={() => { pointerRef.current = { position: ordinal }; scheduleWave() }}
                    onClick={() => onSelect(index)}
                    className="flex h-3 shrink-0 items-center justify-end pr-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary">
                    <span ref={element => { barsRef.current[ordinal] = element }} data-index={index} data-active={active}
                        className="h-0.5 shrink-0 rounded-full bg-zinc-700 dark:bg-white"
                        style={{ width: active ? 14 : 4, opacity: active ? 1 : 0.25 }} />
                </button>
            })}
        </nav>
        {previewIndex !== null && messages[previewIndex] && <div aria-hidden="true"
            className="pointer-events-none absolute right-11 top-1/2 z-40 max-w-[min(20rem,75%)] -translate-y-1/2 rounded-2xl border border-zinc-200/60 bg-white/85 px-4 py-3 text-sm shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/85">
            <p className="line-clamp-2 font-medium">{messages[previewIndex].content}</p>
            {messages[previewIndex + 1]?.role === 'assistant' && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{cleanHelpMessage(messages[previewIndex + 1].content)}</p>}
        </div>}
    </>
}
