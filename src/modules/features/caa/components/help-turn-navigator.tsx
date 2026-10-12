"use client"

import { useState } from 'react'
import type { HelpChatMessage } from '../actions/ask-help-assistant'
import { cleanHelpMessage } from './help-message-content'

interface HelpTurnNavigatorProps {
    messages: HelpChatMessage[]
    activeTurn: number
    reducedMotion: boolean
    onSelect: (index: number) => void
}

export function HelpTurnNavigator({ messages, activeTurn, reducedMotion, onSelect }: HelpTurnNavigatorProps) {
    const [hover, setHover] = useState<{ position: number; index: number } | null>(null)
    const turns = messages.flatMap((message, index) => message.role === 'user' ? [{ message, index }] : [])
    if (!turns.length) return null

    return <>
        <nav aria-label="Navegar por preguntas"
            className="absolute right-1 top-1/2 z-30 flex max-h-[60%] w-8 -translate-y-1/2 flex-col overflow-y-auto no-scrollbar"
            onPointerMove={event => {
                if (event.pointerType === 'touch') return
                const area = event.currentTarget
                // Each hit target is 12px tall. A fractional position makes the wave flow between bars.
                const position = (event.clientY - area.getBoundingClientRect().top + area.scrollTop) / 12 - 0.5
                const nearest = Math.max(0, Math.min(turns.length - 1, Math.round(position)))
                setHover({ position, index: turns[nearest].index })
            }}
            onPointerLeave={() => setHover(null)}
            onScroll={() => setHover(null)}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHover(null) }}>
            {turns.map(({ message, index }, ordinal) => {
                const influence = hover ? Math.exp(-Math.pow((ordinal - hover.position) / 2.2, 2)) : 0
                const active = activeTurn === index
                const width = Math.max(active ? 14 : 4, 4 + influence * 22)
                return <button key={index} type="button"
                    aria-label={`Ir a pregunta: ${message.content.slice(0, 80)}`}
                    aria-current={active ? 'true' : undefined}
                    onFocus={() => setHover({ position: ordinal, index })}
                    onClick={() => onSelect(index)}
                    className="flex h-3 shrink-0 items-center justify-end pr-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary">
                    <span className="h-0.5 w-1 origin-right rounded-full bg-zinc-700 dark:bg-white"
                        style={{ transform: `scaleX(${width / 4})`, opacity: active ? 1 : 0.25 + influence * 0.65,
                            transition: reducedMotion ? 'none' : 'transform 140ms ease-out, opacity 140ms ease-out' }} />
                </button>
            })}
        </nav>
        {hover && messages[hover.index] && <div aria-hidden="true"
            className="pointer-events-none absolute right-11 top-1/2 z-40 max-w-[min(20rem,75%)] -translate-y-1/2 rounded-2xl border border-zinc-200/60 bg-white/85 px-4 py-3 text-sm shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/85">
            <p className="line-clamp-2 font-medium">{messages[hover.index].content}</p>
            {messages[hover.index + 1]?.role === 'assistant' && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{cleanHelpMessage(messages[hover.index + 1].content)}</p>}
        </div>}
    </>
}
