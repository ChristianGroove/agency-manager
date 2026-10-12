'use client'
import { useEffect, useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PetProvider, usePet } from '@/modules/core/pet/pet-provider'
import { PetHelpTrigger } from '@/modules/core/pet/pet-help-trigger'
import type { DashboardPetConfig } from '@/modules/core/pet/config'
import { AIChatPanel } from './ai-chat-panel'
import type { HelpChatTransport } from './help-chat-transport'
import { getTasksPortalHelpConfig, askTasksPortalHelp, listTasksPortalHelpThreads, loadTasksPortalHelpThread } from '../actions/tasks-portal-help'

export function TasksPortalHelp({ token, theme }: { token: string; theme: 'light' | 'dark' }) {
    const [config, setConfig] = useState<DashboardPetConfig>()
    useEffect(() => {
        let cancelled = false
        void getTasksPortalHelpConfig(token).then(result => { if (!cancelled && result.enabled) setConfig(result.config) }).catch(() => {})
        return () => { cancelled = true }
    }, [token])
    const transport = useMemo<HelpChatTransport>(() => ({
        listThreads: offset => listTasksPortalHelpThreads(token, offset),
        loadThread: id => loadTasksPortalHelpThread(token, id),
        ask: (question, _history, threadId) => askTasksPortalHelp({ token, question, threadId, requestId: crypto.randomUUID() }),
    }), [token])
    if (!config) return null
    return <PetProvider config={config}><PortalHelpUI transport={transport} theme={theme} /></PetProvider>
}
function PortalHelpUI({ transport, theme }: { transport: HelpChatTransport; theme: 'light' | 'dark' }) {
    const pet = usePet()
    const [open, setOpen] = useState(false)
    return <>
        {!open && (pet?.enabled ? <PetHelpTrigger onOpenHelp={() => setOpen(true)} />
            : <button type="button" aria-label="Abrir ayuda de Tasks" onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-40 rounded-full border border-primary/20 bg-white/80 p-3 shadow-lg backdrop-blur-xl dark:bg-black/80"><CircleHelp className="h-5 w-5 text-primary" /></button>)}
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className={`glass-panel block h-[min(650px,calc(100dvh-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl p-0 sm:max-w-[700px] ${theme === 'dark' ? 'dark bg-black/95 text-white' : 'bg-white/95 text-zinc-900'}`}>
                <DialogTitle className="sr-only">Ayuda de Tasks</DialogTitle>
                <DialogDescription className="sr-only">Consulta cómo usar Tasks y las funciones disponibles en este portal.</DialogDescription>
                <AIChatPanel transport={transport} welcomeText="Pregúntame cómo usar Tasks y este portal." />
            </DialogContent>
        </Dialog>
    </>
}
