"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Copy, Check, Loader2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SmartReply {
    type: 'short' | 'medium' | 'detailed'
    text: string
    tokens: number
}

interface SmartRepliesPanelProps {
    conversationId: string
    lastIncomingMessage?: string
    onSelectReply: (text: string, type: string) => void
    isGenerating?: boolean
}

// Simple in-memory cache to persist replies during navigation
// Key: conversationId, Value: { text: lastIncomingMessage, data: replies }
const replyCache: Record<string, { lastMessage: string, replies: SmartReply[], usedKB: number }> = {}

export function SmartRepliesPanel({
    conversationId,
    lastIncomingMessage,
    onSelectReply,
    isGenerating = false
}: SmartRepliesPanelProps) {

    const handleSelectReply = (text: string) => {
        // Dispatch custom event for ChatArea to catch
        const event = new CustomEvent('insert-smart-reply', { detail: text })
        window.dispatchEvent(event)

        // Optional: Still copy to clipboard as backup? Or just notify
        onSelectReply(text, 'auto') // Keep original prop call for metrics/logging if needed
    }
    const [replies, setReplies] = useState<SmartReply[]>([])
    const [loading, setLoading] = useState(false)
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
    const [usedKB, setUsedKB] = useState(0)

    // Load from cache on mount or when conversation loops
    useEffect(() => {
        if (!conversationId || !lastIncomingMessage) return

        const cached = replyCache[conversationId]
        if (cached && cached.lastMessage === lastIncomingMessage) {
            setReplies(cached.replies)
            setUsedKB(cached.usedKB || 0)
        } else {
            // New context or no cache involved -> Start fresh if not already populated
            if (!cached || cached.lastMessage !== lastIncomingMessage) {
                setReplies([])
                setUsedKB(0)
            }
        }
    }, [conversationId, lastIncomingMessage])

    const generateReplies = async () => {
        if (!conversationId || !lastIncomingMessage) {
            toast.error("Se necesita un mensaje del cliente para generar respuestas.")
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/ai/smart-replies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId })
            })

            const data = await response.json()

            if (data.success && data.replies) {
                setReplies(data.replies)
                setUsedKB(data.usedKnowledge || 0)
                // Save to cache
                if (lastIncomingMessage) {
                    replyCache[conversationId] = {
                        lastMessage: lastIncomingMessage,
                        replies: data.replies,
                        usedKB: data.usedKnowledge || 0
                    }
                }
            } else {
                toast.error("No se pudieron generar respuestas.")
            }
        } catch (error) {
            console.error('Failed to generate replies:', error)
            toast.error("Error de conexión con IA.")
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    // --- CASE 1: No Message (Hidden/Disabled) ---
    if (!lastIncomingMessage) {
        return null // Don't show anything unless there's something to reply to
    }

    // --- CASE 2: Empty State (Call to Action) ---
    if (replies.length === 0 && !loading) {
        return (
            <div className="w-full px-2 py-1">
                <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 bg-white/50 dark:bg-zinc-900/50 h-9"
                    onClick={generateReplies}
                >
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">Generar Respuestas</span>
                </Button>
            </div>
        )
    }

    // --- CASE 3: Loading ---
    if (loading) {
        return (
            <div className="w-full px-2 py-1">
                <div className="p-3 border rounded-lg bg-background flex items-center justify-center gap-2 text-sm text-purple-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analizando contexto...</span>
                </div>
            </div>
        )
    }

    // --- CASE 4: Results (Compact List) ---
    return (
        <div className="mx-4 my-2 space-y-2">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Sugerencias IA</span>
                    {usedKB > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-medium text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            📚 +{usedKB} Contexto
                        </span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-muted"
                    onClick={() => setReplies([])}
                >
                    <span className="sr-only">Cerrar</span>
                    <span className="text-xs text-muted-foreground">×</span>
                </Button>
            </div>

            <div className="space-y-1.5">
                {replies.map((reply, index) => (
                    <div
                        key={index}
                        className={cn(
                            "group relative flex flex-col gap-1 p-2.5 rounded-md border bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all cursor-pointer",
                            "hover:border-purple-300 dark:hover:border-purple-700",
                            reply.type === 'short' && "border-l-4 border-l-green-400",
                            reply.type === 'medium' && "border-l-4 border-l-blue-400",
                            reply.type === 'detailed' && "border-l-4 border-l-purple-400"
                        )}
                        onClick={() => handleSelectReply(reply.text)}
                    >
                        <div className="flex items-start justify-between">
                            <p className="text-xs text-foreground/90 leading-relaxed line-clamp-3">
                                {reply.text}
                            </p>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopy(reply.text, index)
                                }}
                            >
                                {copiedIndex === index ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted",
                                reply.type === 'short' && "text-green-600 bg-green-50 dark:bg-green-900/20",
                                reply.type === 'medium' && "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
                                reply.type === 'detailed' && "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
                            )}>
                                {reply.type === 'short' ? 'Rápida' : reply.type === 'medium' ? 'Normal' : 'Detallada'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="w-full h-6 text-[10px] text-muted-foreground hover:text-purple-600"
                onClick={generateReplies}
            >
                Regenerar opciones
            </Button>
        </div>
    )
}
