"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Send, Phone, MoreVertical, Sidebar, Paperclip, Smile, Check, CheckCheck, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Database } from "@/types/supabase"
import { sendMessage, markConversationAsRead } from "../actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageBubble } from "./message-bubble"
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

type Message = Database['public']['Tables']['messages']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: {
        name: string | null
        phone: string | null
    } | null
}

interface ChatAreaProps {
    conversationId: string
    isContextOpen: boolean
    onToggleContext: () => void
}

export function ChatArea({ conversationId, isContextOpen, onToggleContext }: ChatAreaProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [inputValue, setInputValue] = useState("")
    const [sending, setSending] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [uploading, setUploading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch Conversation Details & Mark as Read
    useEffect(() => {
        const fetchConversation = async () => {
            const { data } = await supabase
                .from('conversations')
                .select('*, leads(name, phone)')
                .eq('id', conversationId)
                .single()

            if (data) setConversation(data as Conversation)

            // Mark as Read
            await markConversationAsRead(conversationId)
        }
        fetchConversation()
    }, [conversationId])

    // Subscribe to realtime changes
    useEffect(() => {
        if (!conversationId) return

        const channel = supabase
            .channel(`conversation:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    console.log('[ChatArea] Realtime message received:', payload.new)
                    setMessages(prev => {
                        // Avoid duplicates if opportunistic update or race condition
                        if (prev.some(m => m.id === payload.new.id)) return prev
                        return [...prev, payload.new as Message]
                    })
                    scrollToBottom()
                }
            )
            .subscribe((status) => {
                console.log('[ChatArea] Subscription status:', status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    // Fetch Messages
    useEffect(() => {
        const fetchMessages = async () => {
            if (!conversationId) return

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error fetching messages:', error)
            } else {
                setMessages(data as Message[])
                scrollToBottom()
            }
        }
        fetchMessages()
    }, [conversationId])

    const scrollToBottom = () => {
        // Use timeout to ensure DOM update
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'auto', block: 'end' })
            }
        }, 100)
    }

    const handleSend = async (contentOverride?: string, type: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text', mediaUrl?: string) => {
        const textContent = contentOverride !== undefined ? contentOverride : inputValue.trim()
        if (!textContent && !mediaUrl && !sending) return

        if (!mediaUrl) {
            setInputValue("")
            setShowEmojiPicker(false)
        }

        setSending(true)

        // Determine message content structure
        let messageContent: any
        if (type === 'text') {
            messageContent = { type: 'text', text: textContent }
        } else {
            messageContent = {
                type,
                url: mediaUrl,
                caption: textContent,
                filename: type === 'document' ? textContent : undefined // store filename in caption or separate field if needed
            }
        }

        // Optimistic Update
        const optimisticId = crypto.randomUUID()
        const optimisticMsg: Message = {
            id: optimisticId,
            conversation_id: conversationId,
            direction: 'outbound',
            channel: 'whatsapp',
            content: messageContent,
            status: 'sent',
            external_id: null,
            sender: 'Agent',
            metadata: {},
            created_at: new Date().toISOString()
        }

        setMessages(prev => [...prev, optimisticMsg])
        scrollToBottom()

        try {
            // If it's media, we might need a different sending strategy or just pass the JSON
            // For now, assuming sendMessage handles the text content, we might need to update sendMessage to accept JSON or overloading it
            // Since existing sendMessage takes string, we'll stringify for now or refactor sendMessage. 
            // IMPORTANT: The server action `sendMessage` likely expects a string. We should check that.
            // If `sendMessage` only sends text to Meta API, we need to update it to support media templates/urls.
            // For now, we will focus on storing it correctly in DB. The actual integration with Meta API for media is a separate backend task.
            // We will send the stringified JSON or modify sendMessage separately. 

            // Temporary: We'll send the text representation to the backend action for now
            // Ideally, we should update `sendMessage` signature.
            const payload = JSON.stringify(messageContent)
            const result = await sendMessage(conversationId, payload, optimisticId) // Passing JSON string AND explicit ID

            if (!result.success) {
                console.error("Failed to send", result.error)
                // Optionally remove the optimistic message on failure
                setMessages(prev => prev.filter(m => m.id !== optimisticId))
                alert("Failed to send message")
            }
        } catch (error) {
            console.error("Failed to send", error)
            setMessages(prev => prev.filter(m => m.id !== optimisticId))
        } finally {
            setSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const onEmojiClick = (emojiObject: any) => {
        setInputValue(prev => prev + emojiObject.emoji)
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file size/type if needed
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert("File too large")
            return
        }

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${conversationId}/${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath)

            // Determine type
            let type: 'image' | 'video' | 'audio' | 'document' = 'document'
            if (file.type.startsWith('image/')) type = 'image'
            else if (file.type.startsWith('video/')) type = 'video'
            else if (file.type.startsWith('audio/')) type = 'audio'

            // Send message with media
            // Use the file name as caption or just empty
            await handleSend(file.name, type, publicUrl)

        } catch (error) {
            console.error("Upload failed", error)
            alert("Failed to upload file")
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Lead Name fallback
    const leadName = conversation?.leads?.name || conversation?.leads?.phone || "Unknown User"
    const leadInitials = leadName.slice(0, 2).toUpperCase()

    return (
        <div className="flex flex-col h-full bg-[#efeae2] dark:bg-zinc-950/30 overflow-hidden relative">
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-white dark:bg-zinc-900 shadow-sm z-10 w-full shrink-0">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                            {leadInitials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-sm leading-tight text-foreground">{leadName}</h3>
                        <p className="text-[11px] text-muted-foreground">WhatsApp • {conversation?.id.slice(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onToggleContext} className={cn("text-muted-foreground hover:text-foreground", isContextOpen && "bg-muted")}>
                        <Sidebar className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-2 md:p-4 min-h-0">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto py-2">
                    {messages.map((msg, index) => {
                        // Date Separator Logic
                        const currentDate = new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
                        const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : null
                        const showDateSeparator = currentDate !== prevDate

                        // Safe transform for content
                        let content: any = msg.content
                        if (typeof content !== 'object' || content === null) {
                            content = { type: 'text', text: String(content) }
                        } else if (!content.type && content.text) {
                            // Recover legacy text messages if any
                            content = { type: 'text', text: content.text }
                        }

                        // Map mediaUrl (Backend/Provider) to url (MessageBubble)
                        if (content.mediaUrl && !content.url) {
                            content.url = content.mediaUrl
                        }

                        // DEBUG: Log message content
                        if (index === 0) {
                            console.log('[ChatArea] Rendering first message:', { raw: msg.content, transformed: content, direction: msg.direction })
                        }

                        return (
                            <div key={msg.id} className="w-full flex flex-col">
                                {showDateSeparator && (
                                    <div className="flex justify-center my-4 opacity-100">
                                        <div className="bg-black/5 dark:bg-white/5 text-muted-foreground text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-medium">
                                            {currentDate}
                                        </div>
                                    </div>
                                )}
                                <MessageBubble
                                    content={content}
                                    direction={msg.direction as 'inbound' | 'outbound'}
                                    timestamp={msg.created_at}
                                    status={msg.status as any}
                                />
                            </div>
                        )
                    })}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-zinc-900 items-end flex gap-2 border-t relative z-20">
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                    <div className="absolute bottom-16 left-2 z-50 shadow-xl border rounded-xl overflow-hidden">
                        <div className="bg-white dark:bg-zinc-800 flex justify-end p-1 border-b">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowEmojiPicker(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("text-muted-foreground hover:text-foreground shrink-0 rounded-full h-10 w-10", showEmojiPicker && "bg-muted text-foreground")}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                        <Smile className="h-6 w-6" />
                    </Button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,video/*,audio/*,application/pdf"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground shrink-0 rounded-full h-10 w-10"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        <Paperclip className={cn("h-5 w-5", uploading && "animate-pulse")} />
                    </Button>
                </div>

                <div className="flex-1 bg-muted/30 rounded-2xl border focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-background transition-all flex items-center px-4 py-2">
                    <Textarea
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value)
                            e.target.style.height = 'auto'
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="min-h-[24px] max-h-[120px] w-full border-none shadow-none focus-visible:ring-0 p-0 bg-transparent resize-none leading-relaxed"
                        rows={1}
                        style={{ height: inputValue ? 'auto' : '24px' }}
                    />
                </div>

                <Button
                    size="icon"
                    className={cn(
                        "h-10 w-10 shrink-0 rounded-full transition-all",
                        inputValue.trim() ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    onClick={() => handleSend()}
                    disabled={sending || (!inputValue.trim() && !uploading)}
                >
                    <Send className="h-5 w-5 ml-0.5" />
                </Button>
            </div>
        </div>
    )
}
