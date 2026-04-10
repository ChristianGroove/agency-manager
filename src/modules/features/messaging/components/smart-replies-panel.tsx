"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Copy, Check, Loader2, Zap } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
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

import { useTranslation } from "@/modules/core/i18n/use-translation"

export function SmartRepliesPanel({
    conversationId,
    lastIncomingMessage,
    onSelectReply,
    isGenerating = false
}: SmartRepliesPanelProps) {
    const { t } = useTranslation()
    const [replies, setReplies] = useState<SmartReply[]>([])
    const [loading, setLoading] = useState(false)
    const [usedKB, setUsedKB] = useState(0)
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

    useEffect(() => {
        // Load from cache if available
        if (conversationId && replyCache[conversationId] && replyCache[conversationId].lastMessage === lastIncomingMessage) {
            setReplies(replyCache[conversationId].replies)
            setUsedKB(replyCache[conversationId].usedKB)
        } else {
            setReplies([])
            setUsedKB(0)
        }
    }, [conversationId, lastIncomingMessage])

    const handleSelectReply = (text: string) => {
        onSelectReply(text, 'smart')
    }

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text)
        setCopiedIndex(index)
        toast.success(t('common.success'))
        setTimeout(() => setCopiedIndex(null), 2000)
    }
    const generateReplies = async () => {
        if (!conversationId || !lastIncomingMessage) {
            toast.error(t('crm.inbox.chat.replies.errors.no_message'))
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
                toast.error(t('crm.inbox.chat.replies.errors.failed'))
            }
        } catch (error) {
            console.error('Failed to generate replies:', error)
            toast.error(t('crm.inbox.chat.replies.errors.connection'))
        } finally {
            setLoading(false)
        }
    }

    // ...
    if (replies.length === 0 && !loading) {
        return (
            <div className="w-full px-2 py-1">
                <Button
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-9"
                    onClick={generateReplies}
                >
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('crm.inbox.chat.replies.generate')}</span>
                </Button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="w-full px-2 py-1">
                <div className="p-3 border rounded-lg bg-background flex items-center justify-center gap-2 text-sm text-purple-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('crm.inbox.chat.replies.analyzing')}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-4 my-2 space-y-2">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">{t('crm.inbox.chat.replies.title')}</span>
                    {usedKB > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-medium text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            📚 +{usedKB} {t('crm.inbox.chat.replies.context')}
                        </span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-muted"
                    onClick={() => setReplies([])}
                >
                    <span className="sr-only">{t('crm.inbox.chat.replies.close')}</span>
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
                                {t(`crm.inbox.chat.replies.types.${reply.type}`)}
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
                {t('crm.inbox.chat.replies.regenerate')}
            </Button>
        </div>
    )
}
