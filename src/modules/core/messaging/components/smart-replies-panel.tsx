"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Copy, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

export function SmartRepliesPanel({
    conversationId,
    lastIncomingMessage,
    onSelectReply,
    isGenerating = false
}: SmartRepliesPanelProps) {
    const [replies, setReplies] = useState<SmartReply[]>([])
    const [loading, setLoading] = useState(false)
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

    const generateReplies = async () => {
        if (!conversationId || !lastIncomingMessage) return

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
            }
        } catch (error) {
            console.error('Failed to generate replies:', error)
        } finally {
            setLoading(false)
        }
    }

    // Auto-generate when new message arrives
    useEffect(() => {
        if (lastIncomingMessage) {
            generateReplies()
        }
    }, [lastIncomingMessage])

    const handleCopy = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'short': return '⚡ Quick'
            case 'medium': return '📝 Standard'
            case 'detailed': return '📋 Detailed'
            default: return type
        }
    }

    const getTypeDescription = (type: string) => {
        switch (type) {
            case 'short': return 'Fast response, under 50 chars'
            case 'medium': return 'Balanced reply, 2-3 sentences'
            case 'detailed': return 'Comprehensive answer'
            default: return ''
        }
    }

    if (!lastIncomingMessage) {
        return (
            <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    <span>Smart replies will appear after customer messages</span>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-sm">AI Smart Replies</span>
                </div>
                {!loading && replies.length > 0 && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={generateReplies}
                        className="h-7 text-xs"
                    >
                        Regenerate
                    </Button>
                )}
            </div>

            {loading || isGenerating ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                    <span className="ml-2 text-sm text-muted-foreground">
                        Generating suggestions...
                    </span>
                </div>
            ) : replies.length > 0 ? (
                <div className="space-y-2">
                    {replies.map((reply, index) => (
                        <div
                            key={index}
                            className={cn(
                                "group relative border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer",
                                reply.type === 'short' && "border-green-200 dark:border-green-900",
                                reply.type === 'medium' && "border-blue-200 dark:border-blue-900",
                                reply.type === 'detailed' && "border-purple-200 dark:border-purple-900"
                            )}
                            onClick={() => onSelectReply(reply.text, reply.type)}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold">
                                        {getTypeLabel(reply.type)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {getTypeDescription(reply.type)}
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleCopy(reply.text, index)
                                    }}
                                >
                                    {copiedIndex === index ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-sm leading-relaxed">{reply.text}</p>
                            <div className="mt-2 text-[10px] text-muted-foreground">
                                ~{reply.tokens} tokens • Click to use
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                    Click generate to get AI-powered suggestions
                </div>
            )}
        </Card>
    )
}
