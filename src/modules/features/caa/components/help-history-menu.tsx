"use client"

import { History, Plus, Check, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { HelpThread } from '../actions/help-history'
import { useState } from 'react'

interface Props {
    threads: HelpThread[]; selected?: string; busy: boolean; hasMore: boolean
    onSelect: (id: string) => void; onNew: () => void; onMore: () => void
}

export function HelpHistoryMenu({ threads, selected, busy, hasMore, onSelect, onNew, onMore }: Props) {
    const [open, setOpen] = useState(false)
    return <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <button type="button" aria-label="Historial de ayuda" disabled={busy}
                className="absolute left-4 top-4 z-40 rounded-xl border border-zinc-200/60 bg-white/40 p-2 text-zinc-500 shadow-sm backdrop-blur-xl transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 rounded-2xl border-zinc-200/60 bg-white/85 p-2 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/85">
            <button type="button" onClick={() => { onNew(); setOpen(false) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-zinc-500/10 focus-visible:ring-2 focus-visible:ring-primary">
                <Plus className="h-4 w-4" /> Nueva conversación
            </button>
            <div className="max-h-64 overflow-y-auto no-scrollbar" aria-label="Conversaciones guardadas">
                {threads.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">Todavía no hay conversaciones guardadas.</p>}
                {threads.map(thread => <button key={thread.id} type="button" aria-current={selected === thread.id ? 'true' : undefined}
                    onClick={() => { onSelect(thread.id); setOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-zinc-500/10 focus-visible:ring-2 focus-visible:ring-primary">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{thread.title}</span>
                        <span className="block text-[11px] text-muted-foreground">{new Date(thread.created_at).toLocaleDateString('es')}</span></span>
                    {selected === thread.id && <Check className="h-3 w-3 shrink-0 text-primary" />}
                </button>)}
                {hasMore && <button type="button" onClick={onMore} className="w-full rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-zinc-500/10">Ver más conversaciones</button>}
            </div>
        </PopoverContent>
    </Popover>
}
