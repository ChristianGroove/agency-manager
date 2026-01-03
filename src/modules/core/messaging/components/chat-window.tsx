'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Message, SendMessageInput } from '@/types/messaging'
import { sendMessage, getMessages } from '../actions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Image as ImageIcon, Paperclip } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ChatWindowProps {
    conversationId: string
    initialMessages?: Message[]
}

export function ChatWindow({ conversationId, initialMessages = [] }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Poll for new messages (Simple version, Replace with Realtime later)
    useEffect(() => {
        setMessages(initialMessages) // Reset when conversation changes

        const interval = setInterval(async () => {
            const latest = await getMessages(conversationId)
            if (latest.length !== messages.length) {
                setMessages(latest)
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [conversationId])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!newMessage.trim()) return

        setIsSending(true)
        const tempId = `temp-${Date.now()}`

        // Optimistic Update
        const optimisticMsg: Message = {
            id: tempId,
            conversation_id: conversationId,
            direction: 'outbound',
            content: newMessage,
            content_type: 'text',
            status: 'sending',
            created_at: new Date().toISOString()
        }

        setMessages(prev => [...prev, optimisticMsg])
        setNewMessage('')

        const result = await sendMessage({
            conversation_id: conversationId,
            content: optimisticMsg.content!
        })

        if (!result.success) {
            toast.error('Error enviando mensaje')
            setMessages(prev => prev.filter(m => m.id !== tempId)) // Revert
        } else {
            // Replace optimistic with real
            setMessages(prev => prev.map(m => m.id === tempId ? result.data : m))
        }
        setIsSending(false)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900"
            >
                {messages.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        No hay mensajes aún. Escribe el primero.
                    </div>
                )}

                {messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound'
                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full",
                                isOutbound ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "flex max-w-[70%] gap-2",
                                isOutbound ? "flex-row-reverse" : "flex-row"
                            )}>
                                {!isOutbound && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={msg.sender?.avatar_url} />
                                        <AvatarFallback>C</AvatarFallback>
                                    </Avatar>
                                )}

                                <div className={cn(
                                    "p-3 rounded-lg text-sm shadow-sm",
                                    isOutbound
                                        ? "bg-blue-600 text-white rounded-br-none"
                                        : "bg-white dark:bg-slate-800 border rounded-bl-none"
                                )}>
                                    <p>{msg.content}</p>
                                    <div className={cn(
                                        "text-[10px] mt-1 text-right",
                                        isOutbound ? "text-blue-200" : "text-slate-400"
                                    )}>
                                        {format(new Date(msg.created_at), 'HH:mm')}
                                        {isOutbound && (
                                            <span className="ml-1">
                                                {msg.status === 'sent' && '✓'}
                                                {msg.status === 'read' && '✓✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Composer */}
            <div className="p-4 bg-white dark:bg-slate-950 border-t flex gap-2 items-center">
                <Button variant="ghost" size="icon" className="shrink-0">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </Button>

                <Input
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isSending}
                    className="flex-1"
                />

                <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || isSending}
                    size="icon"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
