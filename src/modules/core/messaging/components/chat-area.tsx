"use client"

import { Virtuoso, VirtuosoHandle } from "react-virtuoso"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Send, Phone, MoreVertical, Sidebar, Paperclip, Smile, Check, CheckCheck, User, X, Target, Wand2, CheckCircle2, Clock, Archive, Trash2, FileText } from "lucide-react"
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
import { TemplatePickerSheet } from "./template-picker-sheet"
import { useTranslation } from "@/lib/i18n/use-translation"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { archiveConversation, snoozeConversation, completeConversation, deleteConversation } from "../conversation-actions"



import { EmojiStickerPicker } from "./emoji-sticker-picker"

type Message = Database['public']['Tables']['messages']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: {
        name: string | null
        phone: string | null
        status: string | null
    } | null
    clients: {
        name: string | null
        phone: string | null
        avatar_url: string | null
    } | null
}

interface ChatAreaProps {
    conversationId: string
    isContextOpen: boolean
    onToggleContext: () => void
}

export function ChatArea({ conversationId, isContextOpen, onToggleContext }: ChatAreaProps) {
    const { t } = useTranslation()
    const [messages, setMessages] = useState<Message[]>([])
    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [inputValue, setInputValue] = useState("")
    const [sending, setSending] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isInternal, setIsInternal] = useState(false)
    // New Sheet State
    const [isRepliesSheetOpen, setIsRepliesSheetOpen] = useState(false)
    const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)

    const scrollRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const virtuosoRef = useRef<VirtuosoHandle>(null)
    const markAsReadTimeout = useRef<NodeJS.Timeout | null>(null)

    const debouncedMarkAsRead = (id: string) => {
        if (markAsReadTimeout.current) clearTimeout(markAsReadTimeout.current)
        markAsReadTimeout.current = setTimeout(() => {
            markConversationAsRead(id)
        }, 2000) // Wait 2s before firing DB update
    }

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
                    phone
                ),
                clients (
                    name,
                    phone
                ),
                integration_connections (
                    connection_name,
                    provider_key
                )
            `)
            .eq('id', conversationId)
            .single()

        if (data) {
            setConversation(data as any)
            if (data.unread_count > 0) debouncedMarkAsRead(conversationId)
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
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    const newMsg = payload.new as Message
                    console.log('[ChatArea] INSERT received', newMsg.id)

                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                    // Virtuoso 'followOutput' handles scrolling automatically
                    if (newMsg.direction === 'inbound') debouncedMarkAsRead(conversationId)
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                (payload) => {
                    const updated = payload.new as any
                    if (!updated || updated.id !== conversationId) return
                    console.log('[ChatArea] Conversation change received, refreshing messages')

                    // Refetch both conversation details AND messages
                    // The messages INSERT subscription may not fire if the table
                    // lacks Realtime publication, so this is the reliable fallback
                    fetchConversation()
                    fetchMessages()
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

    // Polling fallback: check for new messages every 3 seconds
    // Guarantees updates even if Realtime subscriptions don't fire
    useEffect(() => {
        if (!conversationId) return

        const poll = setInterval(async () => {
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conversationId)

            if (!error && count !== null && count !== messages.length) {
                fetchMessages()
                fetchConversation()
            }
        }, 3000)

        return () => clearInterval(poll)
    }, [conversationId, messages.length])

    const handleSend = async (contentOverride?: string, type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'note' | 'sticker' = 'text', mediaUrl?: string) => {
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
            channel: conversation?.channel || 'whatsapp',
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
                toast.error(t('crm.inbox.chat.actions.chat_error'), { description: (result as any).error || t('crm.inbox.layout.unknown') })
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
                toast.success(t('crm.inbox.chat.actions.refine_ai_success'), { icon: "✨" })
            } else {
                toast.error(t('crm.inbox.chat.actions.refine_ai_error'))
            }
        } catch (error) {
            toast.error(t('crm.inbox.chat.actions.ai_error'))
        } finally {
            setIsRefining(false)
        }
    }

    // ... file selection ...
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
            toast.error(t('crm.inbox.chat.actions.file_too_large'))
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
            toast.error(t('crm.inbox.chat.actions.upload_failed'))
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }


    // Contact Name fallback (Lead or Client)
    const leadName = conversation?.clients?.name || conversation?.leads?.name || conversation?.clients?.phone || conversation?.leads?.phone || t('crm.inbox.chat.unknown_user')
    const leadInitials = (leadName || "UN").slice(0, 2).toUpperCase()

    return (
        <div className="flex flex-col h-full bg-[#efeae2] dark:bg-zinc-950/30 overflow-hidden relative">
            <SavedRepliesSheet
                open={isRepliesSheetOpen}
                onOpenChange={setIsRepliesSheetOpen}
                onSelect={handleTemplateSelect}
            />

            <TemplatePickerSheet
                open={isTemplatePickerOpen}
                onOpenChange={setIsTemplatePickerOpen}
                conversationId={conversationId}
                onSent={() => {
                    // Refresh messages after template send
                    fetchMessages()
                }}
            />

            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-white dark:bg-zinc-900 shadow-sm z-10 w-full shrink-0">
                <div className="flex items-center gap-3">
                    {/* Large Channel Icon (No Container) */}
                    <div className="shrink-0">
                        {(() => {
                            if (!conversation) {
                                return <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />;
                            }

                            const rawChannel = conversation?.channel?.toLowerCase() || '';
                            const providerKey = (conversation as any)?.integration_connections?.provider_key?.toLowerCase() || '';
                            const combined = `${rawChannel} ${providerKey}`;

                            if (combined.includes('whatsapp') || combined.includes('evolution')) {
                                return <img src="/social media icons/whatsapp.png" className="h-9 w-9 object-contain drop-shadow-sm" alt="WA" />;
                            }
                            if (combined.includes('messenger') || combined.includes('facebook')) {
                                return <img src="/social media icons/messenger.png" className="h-9 w-9 object-contain drop-shadow-sm" alt="MSG" />;
                            }
                            if (combined.includes('instagram')) {
                                return <img src="/social media icons/instagram.png" className="h-9 w-9 object-contain drop-shadow-sm" alt="IG" />;
                            }
                            return <img src="/social media icons/whatsapp.png" className="h-9 w-9 object-contain opacity-50 grayscale" alt="Unk" />;
                        })()}
                    </div>

                    <div className="flex flex-col justify-center min-w-[120px]">
                        {!conversation ? (
                            <div className="space-y-1.5 py-0.5">
                                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-sm leading-none text-foreground">{leadName}</h3>
                                    {conversation?.leads?.status && (
                                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-normal text-muted-foreground border-zinc-200 dark:border-zinc-800">
                                            {conversation.leads.status}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <span className="capitalize">{conversation?.channel || 'Unknown'}</span>
                                    <span className="opacity-50">•</span>
                                    <span className="font-mono opacity-70">{conversation?.id.slice(0, 8)}</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <TooltipProvider delayDuration={0}>
                        {/* Action: Resolve */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    onClick={async () => {
                                        const res = await completeConversation(conversationId)
                                        if (res.success) toast.success(t('crm.inbox.context.actions.resolved'))
                                        else toast.error(t('crm.inbox.context.actions.resolve_error'))
                                    }}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.context.actions.resolve')}</TooltipContent>
                        </Tooltip>

                        {/* Action: Snooze */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                    onClick={() => {
                                        const tomorrow = new Date()
                                        tomorrow.setDate(tomorrow.getDate() + 1)
                                        snoozeConversation(conversationId, tomorrow).then(res => {
                                            if (res.success) toast.success(t('crm.inbox.context.actions.snoozed_tomorrow'))
                                        })
                                    }}
                                >
                                    <Clock className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.context.actions.snooze')}</TooltipContent>
                        </Tooltip>

                        {/* Action: Archive */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
                                    onClick={async () => {
                                        const res = await archiveConversation(conversationId)
                                        if (res.success) toast.success(t('crm.inbox.context.actions.archived'))
                                        else toast.error(t('crm.inbox.context.actions.archive_error'))
                                    }}
                                >
                                    <Archive className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.context.actions.archive')}</TooltipContent>
                        </Tooltip>

                        {/* Action: Delete */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={async () => {
                                        if (window.confirm(t('common.confirm_delete'))) {
                                            const res = await deleteConversation(conversationId)
                                            if (!res.success) toast.error(t('common.error'))
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('common.delete')}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="w-px h-4 bg-border mx-1" />

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
                                    <Phone className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Llamar</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={onToggleContext} className={cn("text-muted-foreground hover:text-foreground h-8 w-8", isContextOpen && "bg-muted")}>
                                    <Sidebar className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalles</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Messages Area */}
            {/* Messages Area */}
            <div className="flex-1 min-h-0 bg-background/50 relative">
                {/* Wallpaper Pattern */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:invert dark:opacity-[0.05]"
                    style={{
                        backgroundImage: "url('/inbox-pattern.svg')",
                        backgroundSize: "auto 100%",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center"
                    }}
                />

                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                        <p className="text-sm">{t('crm.inbox.chat.no_messages')}</p>
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
                                <div className="px-2 md:px-8 py-1 max-w-[1400px] mx-auto w-full">
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

                {/* Internal Mode Toggle - Centered Floating */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsInternal(!isInternal)}
                        className={cn(
                            "rounded-full shadow-sm backdrop-blur-md border transition-all duration-300 h-7 text-xs font-semibold px-4 tracking-wide",
                            isInternal
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent ring-2 ring-zinc-900/10 dark:ring-zinc-100/20 transform scale-105"
                                : "bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {isInternal ? t('crm.inbox.chat.note_mode') : t('crm.inbox.chat.note')}
                    </Button>
                </div>


                {/* Unified Emoji & Sticker Picker Popover */}
                {showEmojiPicker && (
                    <EmojiStickerPicker
                        onClose={() => setShowEmojiPicker(false)}
                        onEmojiClick={onEmojiClick}
                        onStickerSelect={(url: string) => {
                            handleSend('Sticker', 'sticker', url)
                            setShowEmojiPicker(false)
                        }}
                    />
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

                    {/* Template Picker Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 shrink-0 rounded-full h-10 w-10",
                            isTemplatePickerOpen && "bg-green-50 text-green-600 dark:bg-green-900/20"
                        )}
                        onClick={() => setIsTemplatePickerOpen(true)}
                        title="Enviar plantilla WhatsApp"
                    >
                        <FileText className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex-1 bg-muted/30 rounded-2xl border focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-background transition-all flex items-center px-4 py-2">
                    <Textarea
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={t('crm.inbox.chat.input_placeholder')}
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
                            title={t('crm.inbox.chat.refine_ai')}
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
