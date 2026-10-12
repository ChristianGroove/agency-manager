"use client"

import { useState, useRef, useEffect, useEffectEvent } from "react"
import { motion } from "framer-motion"
import { Send, Loader2, ArrowDown } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { askHelpAssistant, HelpChatMessage } from "../actions/ask-help-assistant"
import { usePet } from "@/modules/core/pet/pet-provider"
import { PetVisual } from "@/modules/core/pet/pet-visual"
import { usePetMedia } from "@/modules/core/pet/use-pet-motion"
import { listHelpThreads, loadHelpThread, type HelpThread } from '../actions/help-history'
import { HelpHistoryMenu } from './help-history-menu'
import { usePathname } from 'next/navigation'
import { HelpMessageContent } from './help-message-content'
import { HelpTurnNavigator } from './help-turn-navigator'
import type { HelpChatTransport } from './help-chat-transport'
const dashboardTransport: HelpChatTransport = { listThreads: listHelpThreads, loadThread: loadHelpThread, ask: askHelpAssistant }

interface AIChatPanelProps {
    initialQuery?: string
    className?: string
    transport?: HelpChatTransport
    welcomeText?: string
}

/**
 * Help conversation with one live robot beside the composer.
 */
export function AIChatPanel({ initialQuery, className, transport = dashboardTransport, welcomeText = 'Pregúntame sobre cualquier función de Pixy.' }: AIChatPanelProps) {
    const currentRoute = usePathname()
    const pet = usePet()
    const mobile = usePetMedia('(max-width: 639px)')
    const reducedMotion = usePetMedia('(prefers-reduced-motion: reduce)')
    const reportHelpState = pet?.reportHelpState
    const mountedRef = useRef(true)
    const [messages, setMessages] = useState<HelpChatMessage[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const initialQuerySentRef = useRef(false)
    const [threads, setThreads] = useState<HelpThread[]>([])
    const [threadId, setThreadId] = useState<string>()
    const [hasMoreThreads, setHasMoreThreads] = useState(false)
    const [historyLoading, setHistoryLoading] = useState(true)
    const [historyWarning, setHistoryWarning] = useState<string>()
    const [awayFromBottom, setAwayFromBottom] = useState(false)
    const [activeTurn, setActiveTurn] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const messageRefs = useRef<(HTMLDivElement | null)[]>([])
    const followBottomRef = useRef(true)
    const historyRequestRef = useRef(0)

    useEffect(() => {
        let cancelled = false
        void (async () => {
            try {
                const result = await transport.listThreads()
                if (cancelled) return
                setThreads(result.threads)
                setHasMoreThreads(result.hasMore)
                setHistoryWarning(result.error)
                if (!initialQuery && result.threads[0]) {
                    const loaded = await transport.loadThread(result.threads[0].id)
                    if (cancelled) return
                    if (loaded.error) setHistoryWarning(loaded.error)
                    else { setThreadId(result.threads[0].id); setMessages(loaded.messages) }
                }
            } catch { if (!cancelled) setHistoryWarning('El historial no está disponible. Puedes seguir usando la ayuda.') }
            finally { if (!cancelled) setHistoryLoading(false) }
        })()
        return () => { cancelled = true }
    }, [initialQuery, transport])

    const selectThread = async (id: string) => {
        const request = ++historyRequestRef.current
        setHistoryLoading(true)
        try {
            const result = await transport.loadThread(id)
            if (!mountedRef.current || request !== historyRequestRef.current) return
            if (result.error) setHistoryWarning(result.error)
            else {
                followBottomRef.current = true
                setThreadId(id); setMessages(result.messages); setInput(''); setError(null); setHistoryWarning(undefined)
                reportHelpState?.('idle')
            }
        } catch { if (mountedRef.current) setHistoryWarning('No se pudo abrir la conversación.') }
        finally { if (mountedRef.current && request === historyRequestRef.current) setHistoryLoading(false) }
    }

    const moreThreads = async () => {
        setHistoryLoading(true)
        try {
            const result = await transport.listThreads(threads.length)
            if (!mountedRef.current) return
            if (result.error) setHistoryWarning(result.error)
            else { setThreads(prev => [...prev, ...result.threads.filter(t => !prev.some(p => p.id === t.id))]); setHasMoreThreads(result.hasMore) }
        } catch { if (mountedRef.current) setHistoryWarning('No se pudo cargar el historial.') }
        finally { if (mountedRef.current) setHistoryLoading(false) }
    }

    const updateScroll = () => {
        const area = scrollRef.current
        if (!area) return
        const away = area.scrollHeight - area.scrollTop - area.clientHeight > 80
        followBottomRef.current = !away
        setAwayFromBottom(away)
        const top = area.getBoundingClientRect().top
        let active = 0
        messageRefs.current.forEach((element, index) => {
            if (messages[index]?.role === 'user' && element && element.getBoundingClientRect().top <= top + 100) active = index
        })
        setActiveTurn(active)
    }

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            reportHelpState?.('idle')
        }
    }, [reportHelpState])

    useEffect(() => {
        if (followBottomRef.current) messagesEndRef.current?.scrollIntoView({ behavior: "instant", block: 'end' })
    }, [messages, isLoading])

    const sendInitialQuery = useEffectEvent((text: string) => { void handleSend(text) })

    useEffect(() => {
        if (!historyLoading && initialQuery && !initialQuerySentRef.current && messages.length === 0) {
            initialQuerySentRef.current = true
            sendInitialQuery(initialQuery)
        }
    }, [initialQuery, messages.length, historyLoading])

    const handleSend = async (text?: string) => {
        const question = text || input.trim()
        if (!question || isLoading || historyLoading || messages.length >= 200) return

        setError(null)
        followBottomRef.current = true
        const userMessage: HelpChatMessage = { role: "user", content: question }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)
        reportHelpState?.('thinking')

        try {
            const response = await transport.ask(question, messages, threadId, currentRoute || undefined)
            if (!mountedRef.current) return
            setHistoryWarning(response.storageError)
            if (response.threadId) {
                setThreadId(response.threadId)
                if (!threads.some(t => t.id === response.threadId)) setThreads(prev => [{ id: response.threadId!, title: question.slice(0, 80), created_at: new Date().toISOString() }, ...prev])
            }

            if (response.success && response.message) {
                setMessages(prev => [...prev, { role: "assistant", content: response.message! }])
                reportHelpState?.('happy')
            } else {
                setError(response.error || response.message || "No pudimos procesar tu pregunta.")
                reportHelpState?.('error')
            }
        } catch {
            if (mountedRef.current) {
                setError("Error de conexión.")
                reportHelpState?.('error')
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false)
                inputRef.current?.focus()
            }
        }
    }

    return (
        <div className={cn(
            "relative flex flex-col h-full min-h-0",
            "bg-white dark:bg-black",
            className
        )}>
            <HelpHistoryMenu threads={threads} selected={threadId} busy={isLoading || historyLoading} hasMore={hasMoreThreads}
                onSelect={id => { void selectThread(id) }} onMore={() => { void moreThreads() }}
                onNew={() => {
                    ++historyRequestRef.current; setThreadId(undefined); setMessages([]); setInput(''); setError(null)
                    setHistoryWarning(undefined); followBottomRef.current = true; setAwayFromBottom(false); reportHelpState?.('idle'); inputRef.current?.focus()
                }} />
            <div className="relative flex-1 min-h-0">
            {/* Native scrolling stays available without a visible scrollbar. */}
            <div ref={scrollRef} onScroll={updateScroll} tabIndex={0} role="log" aria-label="Conversación de ayuda" aria-live="polite" aria-busy={historyLoading} className="relative h-full min-h-0 overflow-y-auto overscroll-contain p-4 pr-11 pt-16 space-y-4 no-scrollbar focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/40">
                {historyWarning && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{historyWarning}</p>}
                {historyLoading && <p role="status" className="text-center text-xs text-muted-foreground">Cargando historial…</p>}
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <h4 className="font-medium text-zinc-900 dark:text-white mb-2">
                            ¿En qué puedo ayudarte?
                        </h4>
                        <p className="text-sm text-zinc-500 dark:text-white/40 max-w-xs">
                            {welcomeText}
                        </p>
                    </div>
                )}

                {messages.map((message, index) => (
                    <motion.div
                        key={index}
                        ref={element => { messageRefs.current[index] = element }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex gap-3",
                            message.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                            message.role === "user"
                                ? "bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-white/90 rounded-bl-md border border-zinc-200 dark:border-white/10 break-words whitespace-pre-wrap"
                                : "bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-white/90 rounded-bl-md border border-zinc-200 dark:border-white/10 break-words whitespace-pre-wrap"
                        )}>
                            <span className="sr-only">{message.role === 'user' ? 'Tú: ' : 'Pixy: '}</span>
                            {message.role === 'assistant' ? <HelpMessageContent text={message.content} /> : message.content}
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                    >
                        <div className={cn(
                            "rounded-2xl rounded-bl-md px-4 py-3 border",
                            "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10"
                        )}>
                            <div className="flex items-center gap-2">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <Loader2 className="h-4 w-4 text-primary" />
                                </motion.div>
                                <span className="text-sm text-zinc-500 dark:text-white/50">Procesando...</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                    >
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl rounded-bl-md px-4 py-3">
                            <p className="text-sm text-amber-700 dark:text-amber-200">{error}</p>
                            <p className="text-xs text-amber-600 dark:text-amber-200/60 mt-1">
                                Si el problema continúa, revisa la disponibilidad de IA con tu administrador.
                            </p>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>
            <HelpTurnNavigator key={threadId || 'new'} messages={messages} activeTurn={activeTurn} reducedMotion={reducedMotion}
                onSelect={index => { followBottomRef.current = false; messageRefs.current[index]?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' }) }} />
            </div>
            {awayFromBottom && <button type="button" aria-label="Ir al último mensaje" onClick={() => { followBottomRef.current = true; messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'end' }) }}
                className="absolute bottom-36 left-1/2 z-30 -translate-x-1/2 rounded-full border border-zinc-200/60 bg-white/70 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/70"><ArrowDown className="h-4 w-4" /></button>}

            {/* Input */}
            <div className="shrink-0 px-4 pb-4 pt-2">
                {messages.length >= 200 && <p className="mb-2 text-xs text-muted-foreground">Esta conversación está completa. Abre el historial para iniciar una nueva.</p>}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className={cn('relative flex items-end', pet?.enabled && 'min-h-24 pr-24 sm:min-h-28 sm:pr-32')}
                >
                    <div className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 focus-within:ring-2 focus-within:ring-primary/50 dark:border-white/10 dark:bg-white/5">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta..."
                        aria-label="Tu pregunta"
                        disabled={isLoading || historyLoading || messages.length >= 200}
                        maxLength={500}
                        className={cn(
                            "min-w-0 flex-1 px-2 py-3 bg-transparent text-zinc-900 dark:text-white",
                            "placeholder:text-zinc-400 dark:placeholder:text-white/30",
                            "focus:outline-none",
                            "disabled:opacity-50"
                        )}
                    />
                    <motion.button
                        type="submit"
                        aria-label="Enviar pregunta"
                        disabled={input.trim().length < 3 || isLoading || historyLoading || messages.length >= 200}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                            "shrink-0 p-3 rounded-xl font-medium transition-colors bg-primary text-white",
                            "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                            "disabled:opacity-50"
                        )}
                    >
                        <Send className="h-5 w-5" />
                    </motion.button>
                    </div>
                    {pet?.enabled && <div className="absolute bottom-0 right-0" aria-hidden="true" onMouseEnter={pet.wake} onTouchStart={pet.wake}>
                        <PetVisual settings={pet.config.settings} palette={pet.palette} state={pet.state}
                            size={mobile ? 80 : 112} animate={pet.config.settings.animation === 'continuous' || pet.state !== 'idle'} hibernating={pet.sleeping}
                            onFailure={pet.reportRendererFailure} />
                    </div>}
                </form>
            </div>
        </div>
    )
}
