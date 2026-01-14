"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Send, User, Bot, Loader2, ArrowLeft, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { askHelpAssistant, HelpChatMessage } from "../actions/ask-help-assistant"

interface AIChatPanelProps {
    initialQuery?: string
    onBack?: () => void
    className?: string
}

/**
 * AIChatPanel v2 - Futuristic with Light/Dark Mode Support
 */
export function AIChatPanel({ initialQuery, onBack, className }: AIChatPanelProps) {
    const [messages, setMessages] = useState<HelpChatMessage[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const initialQuerySentRef = useRef(false)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    useEffect(() => {
        if (initialQuery && !initialQuerySentRef.current && messages.length === 0) {
            initialQuerySentRef.current = true
            handleSend(initialQuery)
        }
    }, [initialQuery])

    const handleSend = async (text?: string) => {
        const question = text || input.trim()
        if (!question || isLoading) return

        setError(null)
        const userMessage: HelpChatMessage = { role: "user", content: question }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const response = await askHelpAssistant(question, messages)

            if (response.success && response.message) {
                setMessages(prev => [...prev, { role: "assistant", content: response.message! }])
            } else {
                setError(response.error || "No pudimos procesar tu pregunta.")
            }
        } catch (err) {
            setError("Error de conexión.")
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }

    return (
        <div className={cn(
            "flex flex-col h-full",
            "bg-white dark:bg-black",
            className
        )}>
            {/* Header */}
            <div className={cn(
                "flex items-center gap-4 p-4 border-b",
                "border-zinc-100 dark:border-white/10",
                "bg-gradient-to-r from-primary/5 to-cyan-400/5"
            )}>
                {onBack && (
                    <button
                        onClick={onBack}
                        className={cn(
                            "p-2 rounded-lg transition-colors border",
                            "bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10",
                            "border-zinc-200 dark:border-white/10"
                        )}
                    >
                        <ArrowLeft className="h-4 w-4 text-zinc-600 dark:text-white/70" />
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-xl bg-primary/50 blur-md" />
                        <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-fuchsia-500 to-primary flex items-center justify-center text-white shadow-lg border border-white/20">
                            <Sparkles className="h-5 w-5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">
                            Pixy IA
                        </h3>
                        <p className="text-[10px] text-zinc-500 dark:text-white/40 uppercase tracking-wider">
                            Asistente Inteligente
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-modern">
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
                            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 border border-primary/30 flex items-center justify-center mb-4">
                                <Bot className="h-8 w-8 text-primary" />
                            </div>
                        </div>
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
                        {message.role === "assistant" && (
                            <div className="shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-fuchsia-500 to-primary flex items-center justify-center text-white shadow-[0_0_15px_rgba(242,5,226,0.3)]">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        )}

                        <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                            message.role === "user"
                                ? "bg-gradient-to-r from-primary/10 to-fuchsia-500/10 dark:from-cyan-500/20 dark:to-primary/20 text-zinc-900 dark:text-white rounded-br-md border border-primary/20 dark:border-cyan-400/30"
                                : "bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-white/90 rounded-bl-md border border-zinc-200 dark:border-white/10"
                        )}>
                            {message.content}
                        </div>

                        {message.role === "user" && (
                            <div className={cn(
                                "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center border",
                                "bg-primary/10 dark:bg-gradient-to-br dark:from-cyan-400/20 dark:to-primary/20",
                                "border-primary/20 dark:border-cyan-400/30"
                            )}>
                                <User className="h-4 w-4 text-primary dark:text-cyan-400" />
                            </div>
                        )}
                    </motion.div>
                ))}

                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                    >
                        <div className="shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-fuchsia-500 to-primary flex items-center justify-center text-white">
                            <Sparkles className="h-4 w-4" />
                        </div>
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
                        <div className="shrink-0 h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl rounded-bl-md px-4 py-3">
                            <p className="text-sm text-amber-700 dark:text-amber-200">{error}</p>
                            <p className="text-xs text-amber-600 dark:text-amber-200/60 mt-1">
                                Verifica credenciales IA en Ajustes.
                            </p>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={cn(
                "p-4 border-t",
                "border-zinc-100 dark:border-white/10",
                "bg-gradient-to-r from-primary/5 to-cyan-400/5"
            )}>
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe tu pregunta..."
                        disabled={isLoading}
                        className={cn(
                            "flex-1 px-4 py-3 rounded-xl border",
                            "bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white",
                            "border-zinc-200 dark:border-white/10",
                            "placeholder:text-zinc-400 dark:placeholder:text-white/30",
                            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                            "disabled:opacity-50"
                        )}
                    />
                    <motion.button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                            "px-4 py-3 rounded-xl font-medium transition-all",
                            "bg-gradient-to-r from-primary to-fuchsia-500 text-white",
                            "shadow-[0_0_20px_rgba(242,5,226,0.3)]",
                            "hover:shadow-[0_0_30px_rgba(242,5,226,0.5)]",
                            "disabled:opacity-50 disabled:hover:shadow-none"
                        )}
                    >
                        <Send className="h-5 w-5" />
                    </motion.button>
                </form>
            </div>
        </div>
    )
}
