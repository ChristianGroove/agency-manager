"use client"

import { useState, useRef, useEffect, useEffectEvent } from "react"
import { motion } from "framer-motion"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { askHelpAssistant, HelpChatMessage } from "../actions/ask-help-assistant"
import { usePet } from "@/modules/core/pet/pet-provider"
import { PetVisual } from "@/modules/core/pet/pet-visual"
import { usePetMedia } from "@/modules/core/pet/use-pet-motion"

interface AIChatPanelProps {
    initialQuery?: string
    className?: string
}

/**
 * Help conversation with one live robot beside the composer.
 */
export function AIChatPanel({ initialQuery, className }: AIChatPanelProps) {
    const pet = usePet()
    const mobile = usePetMedia('(max-width: 639px)')
    const reportHelpState = pet?.reportHelpState
    const mountedRef = useRef(true)
    const [messages, setMessages] = useState<HelpChatMessage[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const initialQuerySentRef = useRef(false)

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            reportHelpState?.('idle')
        }
    }, [reportHelpState])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const sendInitialQuery = useEffectEvent((text: string) => { void handleSend(text) })

    useEffect(() => {
        if (initialQuery && !initialQuerySentRef.current && messages.length === 0) {
            initialQuerySentRef.current = true
            sendInitialQuery(initialQuery)
        }
    }, [initialQuery, messages.length])

    const handleSend = async (text?: string) => {
        const question = text || input.trim()
        if (!question || isLoading) return

        setError(null)
        const userMessage: HelpChatMessage = { role: "user", content: question }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)
        reportHelpState?.('thinking')

        try {
            const response = await askHelpAssistant(question, messages)
            if (!mountedRef.current) return

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
            "flex flex-col h-full min-h-0",
            "bg-white dark:bg-black",
            className
        )}>
            {/* Messages */}
            <div role="log" aria-label="Conversación de ayuda" aria-live="polite" className="flex-1 min-h-0 overflow-y-auto p-4 pt-12 space-y-4 scrollbar-modern">
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <h4 className="font-medium text-zinc-900 dark:text-white mb-2">
                            ¿En qué puedo ayudarte?
                        </h4>
                        <p className="text-sm text-zinc-500 dark:text-white/40 max-w-xs">
                            Pregúntame sobre cualquier función de Pixy.
                        </p>
                    </div>
                )}

                {messages.map((message, index) => (
                    <motion.div
                        key={index}
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
                            {message.content}
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

            {/* Input */}
            <div className="shrink-0 px-4 pb-4 pt-2">
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
                        disabled={isLoading}
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
                        disabled={!input.trim() || isLoading}
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
                    {pet?.enabled && <div className="pointer-events-none absolute bottom-0 right-0" aria-hidden="true">
                        <PetVisual settings={pet.config.settings} palette={pet.palette} state={pet.state}
                            size={mobile ? 80 : 112} animate={pet.config.settings.animation === 'continuous' || pet.state !== 'idle'}
                            onFailure={pet.reportRendererFailure} />
                    </div>}
                </form>
            </div>
        </div>
    )
}
