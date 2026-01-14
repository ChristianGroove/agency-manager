
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Send, Phone, MoreVertical, Sidebar, Paperclip, Smile, Check, CheckCheck, User, X, Target, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Database } from "@/types/supabase"
import { sendMessage, markConversationAsRead } from "../actions"
import { refineDraftContent } from "../ai/smart-replies"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageBubble } from "./message-bubble"
import { ConversationActionsMenu } from "./conversation-actions-menu"
import dynamic from 'next/dynamic'
import { toast } from "sonner"
import { SavedRepliesSheet } from "./saved-replies-sheet"
import { QuickReplySelector } from "./quick-reply-selector"

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

type Message = Database['public']['Tables']['messages']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: {
        name: string | null
        phone: string | null
        status: string | null
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
    const [isInternal, setIsInternal] = useState(false)
    // New Sheet State
    const [isRepliesSheetOpen, setIsRepliesSheetOpen] = useState(false)

    const scrollRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const virtuosoRef = useRef<VirtuosoHandle>(null)

    const scrollToBottom = (index?: number) => {
        // We allow passing an explicit index to handle optimistic updates 
        // where state hasn't flushed yet but we know the target content exists/will exist.
        const targetIndex = index !== undefined ? index : messages.length - 1

        requestAnimationFrame(() => {
            virtuosoRef.current?.scrollToIndex({
                index: targetIndex,
                align: 'end',
                behavior: 'smooth'
            })
        })
    }

    // Listen for Smart Reply insertions
    useEffect(() => {
        const handleInsertSmartReply = (event: CustomEvent<string>) => {
            setInputValue(event.detail)

            // Focus textarea after a small delay to ensure render
            setTimeout(() => {
                const textarea = document.querySelector('textarea') as HTMLTextAreaElement
                if (textarea) {
                    textarea.focus()
                    // Set cursor to end
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
                }
            }, 50)
        }

        window.addEventListener('insert-smart-reply' as any, handleInsertSmartReply as any)
        return () => {
            window.removeEventListener('insert-smart-reply' as any, handleInsertSmartReply as any)
        }
    }, [])

    const fetchConversation = async () => {
        if (!conversationId) return
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                leads (
                    name,
                    phone,
                    status
                )
            `)
            .eq('id', conversationId)
            .single()

        if (data) {
            setConversation(data as any)
            if (data.unread_count > 0) markConversationAsRead(conversationId)
        }
    }

    const fetchMessages = async () => {
        if (!conversationId) return
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (data) {
            setMessages(data)
            // Initial scroll handled by useEffect below
        }
    }

    useEffect(() => {
        fetchConversation()
        fetchMessages()

        // Realtime Subscriptions
        if (!conversationId) return
        console.log('[ChatArea] Mounting subscription for:', conversationId)

        const channel = supabase
            .channel(`chat-area-${conversationId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMsg = payload.new as Message
                    if (newMsg.conversation_id !== conversationId) return
                    console.log('[ChatArea] INSERT received', newMsg)

                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                    // Virtuoso 'followOutput' handles scrolling automatically
                    if (newMsg.direction === 'inbound') markConversationAsRead(conversationId)
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversations' },
                (payload) => {
                    const newConv = payload.new as Conversation
                    if (newConv.id !== conversationId) return
                    console.log('[ChatArea] UPDATE received (Fallback)', newConv)

                    setTimeout(() => {
                        // Only update conversation details (header, etc), do NOT re-fetch all messages
                        // The 'INSERT' listener on messages table handles the chat stream
                        fetchConversation()
                    }, 500)
                }
            )
            .subscribe((status, error) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('[ChatArea] Realtime Error:', error)
                }
            })

        return () => {
            console.log('[ChatArea] Unsubscribing:', conversationId)
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    const handleSend = async (contentOverride?: string, type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'note' = 'text', mediaUrl?: string) => {
        const textContent = contentOverride !== undefined ? contentOverride : inputValue.trim()
        if (!textContent && !mediaUrl && !sending) return

        if (!mediaUrl) {
            setInputValue("")
            setShowEmojiPicker(false)
        }

        setSending(true)

        // Determine message content structure
        let messageContent: any

        // Force 'note' type if internal mode is active
        // Preserve original type in metadata/props if needed for rendering
        if (isInternal) {
            messageContent = {
                type: 'note',
                text: textContent,
                url: mediaUrl, // Pass media even for notes
                originalType: type
            }
        } else {
            // Standard External Message
            if (type === 'text') {
                messageContent = { type: 'text', text: textContent }
            } else {
                messageContent = {
                    type: type,
                    url: mediaUrl,
                    caption: textContent,
                    filename: type === 'document' ? textContent : undefined
                }
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
        // Scroll to the new item's index (current length)
        scrollToBottom(messages.length)

        try {
            const payload = JSON.stringify(messageContent)
            const result = await sendMessage(conversationId, payload, optimisticId)

            if (!result.success) {
                console.error("Failed to send", (result as any).error)
                setMessages(prev => prev.filter(m => m.id !== optimisticId))
                toast.error("Failed to send message", { description: (result as any).error || "Unknown error" })
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

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setInputValue(val)
        e.target.style.height = 'auto'
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`

        if (val === '/') {
            // We can still trigger the sheet on slash if desired, or just let users use the button
            // For now, let's auto-open the sheet on slash as a "power user" shortcut, 
            // but maybe clear the slash
            setIsRepliesSheetOpen(true)
            setInputValue('')
        }
    }

    const handleTemplateSelect = (content: string) => {
        setInputValue(content)
        // Auto focus
    }

    const onEmojiClick = (emojiObject: any) => {
        setInputValue(prev => prev + emojiObject.emoji)
    }

    const [isRefining, setIsRefining] = useState(false)

    // ... existing handlers ...

    const handleRefine = async () => {
        if (!inputValue || inputValue.length < 5) return

        setIsRefining(true)
        try {
            const result = await refineDraftContent(inputValue)
            if (result.success && result.refined) {
                setInputValue(result.refined)
                toast.success("Draft processed by AI", { icon: "✨" })
            } else {
                toast.error("Could not refine draft")
            }
        } catch (error) {
            toast.error("AI Error")
        } finally {
            setIsRefining(false)
        }
    }

    // ... file selection ...
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
            toast.error("File to large (max 10MB)")
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

            let type: 'image' | 'video' | 'audio' | 'document' = 'document'
            if (file.type.startsWith('image/')) type = 'image'
            else if (file.type.startsWith('video/')) type = 'video'
            else if (file.type.startsWith('audio/')) type = 'audio'

            await handleSend(file.name, type, publicUrl)

        } catch (error) {
            console.error("Upload failed", error)
            toast.error("Failed to upload file")
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
            <SavedRepliesSheet
                open={isRepliesSheetOpen}
                onOpenChange={setIsRepliesSheetOpen}
                onSelect={handleTemplateSelect}
            />

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
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm leading-tight text-foreground">{leadName}</h3>
                            {conversation?.leads?.status && (
                                <Badge variant="outline" className="text-[10px] h-5">
                                    <Target className="h-3 w-3 mr-1" />
                                    {conversation.leads.status}
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">WhatsApp • {conversation?.id.slice(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Phone className="h-5 w-5" />
                    </Button>
                    <ConversationActionsMenu conversationId={conversationId} />
                    <Button variant="ghost" size="icon" onClick={onToggleContext} className={cn("text-muted-foreground hover:text-foreground", isContextOpen && "bg-muted")}>
                        <Sidebar className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            {/* Messages Area */}
            <div className="flex-1 min-h-0 bg-background/50 relative">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                        <p className="text-sm">No messages yet</p>
                    </div>
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        style={{ height: '100%' }}
                        totalCount={messages.length}
                        data={messages}
                        initialTopMostItemIndex={messages.length - 1}
                        alignToBottom
                        followOutput="auto"
                        atBottomThreshold={50}
                        itemContent={(index: number, msg: Message) => {
                            const currentDate = new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
                            const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : null
                            const showDateSeparator = currentDate !== prevDate

                            let content: any = msg.content
                            if (typeof content !== 'object' || content === null) {
                                content = { type: 'text', text: String(content) }
                            } else if (!content.type && content.text) {
                                content = { type: 'text', text: content.text }
                            }

                            if (content.mediaUrl && !content.url) {
                                content.url = content.mediaUrl
                            }

                            return (
                                <div className="px-2 md:px-4 py-1 max-w-4xl mx-auto w-full">
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
                                        messageId={msg.id}
                                        metadata={msg.metadata}
                                    />
                                </div>
                            )
                        }}
                    />
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-zinc-900 items-end flex gap-2 border-t relative z-20">
                {/* Removed floating chips */}

                {/* Internal Mode Toggle */}
                <div className="absolute -top-12 right-4 z-30">
                    <Button
                        variant={isInternal ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsInternal(!isInternal)}
                        className={cn(
                            "rounded-full shadow-lg transition-all gap-2 h-8 text-xs font-medium",
                            isInternal
                                ? "bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-yellow-500"
                                : "bg-background/80 backdrop-blur hover:bg-background border-dashed text-muted-foreground"
                        )}
                    >
                        {isInternal ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-600 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-700"></span>
                                </span>
                                Note Mode
                            </>
                        ) : (
                            <>
                                📝 Note
                            </>
                        )}
                    </Button>
                </div>


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
                    {/* NEW Quick Reply Selector */}
                    <QuickReplySelector
                        onSelect={handleTemplateSelect}
                        onManage={() => setIsRepliesSheetOpen(true)}
                    />

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
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message... (Tip: Type '/' for saved replies)"
                        className="min-h-[24px] max-h-[120px] w-full border-none shadow-none focus-visible:ring-0 p-0 bg-transparent resize-none leading-relaxed"
                        rows={1}
                        style={{ height: inputValue ? 'auto' : '24px' }}
                    />

                    {/* Magic Wand for Refining */}
                    {inputValue.length > 5 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefine}
                            disabled={isRefining}
                            className="h-6 w-6 ml-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-full shrink-0 animate-in fade-in zoom-in duration-200"
                            title="Refine with AI"
                        >
                            <Wand2 className={cn("h-4 w-4", isRefining && "animate-spin")} />
                        </Button>
                    )}
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
