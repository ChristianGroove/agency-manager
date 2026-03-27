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
import { Message as MessagingMessage, MessageContentType } from "@/types/messaging"
import { sendMessage, markConversationAsRead } from "../actions"
import { MESSAGING_STORAGE_BUCKET } from "../constants"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { archiveConversation, snoozeConversation, completeConversation, deleteConversation } from "../conversation-actions"
import { Image, Camera, User as ContactIcon, MapPin, Mic } from "lucide-react"



import { EmojiStickerPicker } from "./emoji-sticker-picker"
import { AudioRecorder } from "./audio-recorder"

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
    const [isRecordingAudio, setIsRecordingAudio] = useState(false)
    // New Sheet State
    const [isRepliesSheetOpen, setIsRepliesSheetOpen] = useState(false)
    const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)
    const [callStatus, setCallStatus] = useState<{
        callingEnabled: boolean,
        permStatus: { hasPermission: boolean, expiresAt: string | null },
        isWithinHours: boolean,
        isSessionActive: boolean
    } | null>(null)
    const [incomingCall, setIncomingCall] = useState<{ call_id: string, from: string } | null>(null)
    const [pendingAttachment, setPendingAttachment] = useState<{ url: string, type: MessageContentType, name: string } | null>(null)

    const scrollRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const virtuosoRef = useRef<VirtuosoHandle>(null)
    const markAsReadTimeout = useRef<NodeJS.Timeout | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    // Listen for Portal Token "Send to Chat" from context-deck
    useEffect(() => {
        const handlePrefill = (event: CustomEvent<string>) => {
            setInputValue(event.detail)
            setTimeout(() => {
                const textarea = document.querySelector('textarea') as HTMLTextAreaElement
                if (textarea) {
                    textarea.focus()
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
                }
            }, 50)
        }

        window.addEventListener('inbox-prefill-message' as any, handlePrefill as any)
        return () => {
            window.removeEventListener('inbox-prefill-message' as any, handlePrefill as any)
        }
    }, [])

    // Auto-expand textarea on value change
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            const newHeight = Math.min(textareaRef.current.scrollHeight, 120)
            textareaRef.current.style.height = `${newHeight}px`
        }
    }, [inputValue])

    const [hasMoreMessages, setHasMoreMessages] = useState(false)
    const [loadingOlder, setLoadingOlder] = useState(false)
    const MESSAGE_PAGE_SIZE = 50

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
            if (data.unread_count > 0) {
                debouncedMarkAsRead(conversationId)
            }
            
            // Fetch Call Status with error handling to prevent UI crashes on session expiry
            try {
                import('../actions').then(m => m.getCallStatus(conversationId)).then(res => {
                    if (res && res.success) setCallStatus(res as any)
                }).catch(e => {
                    console.warn('[ChatArea] [AUTH] Call status fetch failed (likely expired token):', e);
                })
            } catch (e) {
                 console.error('[ChatArea] Dynamic import failed:', e);
            }
        }
    }

    const fetchMessages = async () => {
        if (!conversationId) return
        // Load only the LAST N messages (cursor-based, most recent first, then reverse)
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(MESSAGE_PAGE_SIZE)

        if (data) {
            const sorted = data.reverse() // Back to chronological order for display
            setMessages(sorted)
            setHasMoreMessages(data.length === MESSAGE_PAGE_SIZE)
        }
    }

    const loadOlderMessages = async () => {
        if (!conversationId || loadingOlder || !hasMoreMessages || messages.length === 0) return
        setLoadingOlder(true)

        const oldestMessage = messages[0]
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .lt('created_at', oldestMessage.created_at)
            .order('created_at', { ascending: false })
            .limit(MESSAGE_PAGE_SIZE)

        if (data && data.length > 0) {
            const sorted = data.reverse()
            setMessages(prev => [...sorted, ...prev])
            setHasMoreMessages(data.length === MESSAGE_PAGE_SIZE)
        } else {
            setHasMoreMessages(false)
        }
        setLoadingOlder(false)
    }

    const chatChannelCounter = useRef(0)
    useEffect(() => {
        fetchConversation()
        fetchMessages()

        if (!conversationId) return

        chatChannelCounter.current += 1
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

                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                    if (newMsg.direction === 'inbound') debouncedMarkAsRead(conversationId)
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversations' },
                (payload) => {
                    const updatedConv = payload.new as any
                    if (updatedConv.id === conversationId) {
                        fetchConversation()
                    }
                }
            )
            .on('broadcast', { event: 'incoming_call' }, (payload) => {
                console.log('[ChatArea] Incoming Call Broadcast:', payload)
                setIncomingCall(payload.payload)
                // Auto dismiss after 30s
                setTimeout(() => setIncomingCall(null), 30000)
            })
            .subscribe((status, error) => {
                // Subscription handling
            })

        // ROBUST POLLING FALLBACK: If Realtime is flaky, we fetch messages every 10s
        const pollingInterval = setInterval(() => {
            if (channel.state !== 'joined') {
                fetchConversation()
                fetchMessages()
            }
        }, 30000) // Increase interval for cleaner logs

        return () => {
            clearInterval(pollingInterval)
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    const handleSend = async (contentOverride?: string, type: MessageContentType = 'text', mediaUrl?: string, location?: { latitude: number, longitude: number, address?: string }) => {
        let finalType = type
        let finalMediaUrl = mediaUrl

        // If sending via button (no contentOverride) and we have a pending attachment
        if (contentOverride === undefined && !mediaUrl && !location && pendingAttachment) {
            finalType = pendingAttachment.type
            finalMediaUrl = pendingAttachment.url
        }

        const textContent = contentOverride !== undefined ? contentOverride : inputValue.trim()
        if (!textContent && !finalMediaUrl && !location && !sending) return

        if (!finalMediaUrl && !location) {
            setInputValue("")
            setShowEmojiPicker(false)
        }

        // Clear pending attachment if we are using it
        if (finalMediaUrl === pendingAttachment?.url) {
            setPendingAttachment(null)
            setInputValue("") // Clear input after sending image with caption
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
                url: finalMediaUrl, // Pass media even for notes
                originalType: finalType
            }
        } else {
            // Standard External Message
            if (finalType === 'text') {
                messageContent = { type: 'text', text: textContent }
            } else if (finalType === 'location' && location) {
                messageContent = {
                    type: 'location',
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.address || 'Ubicación'
                }
            } else {
                messageContent = {
                    type: finalType,
                    mediaUrl: finalMediaUrl,
                    url: finalMediaUrl,
                    caption: textContent,
                    filename: finalType === 'document' ? (pendingAttachment?.name || textContent) : undefined
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
            const result = await sendMessage(conversationId, messageContent, 'Agent', optimisticId)

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

    const handleSendLocation = async () => {
        if (!navigator.geolocation) {
            toast.error("Geolocalización no soportada por su navegador")
            return
        }

        toast.info("Obteniendo ubicación...")
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords
            const locationContent = {
                type: 'location',
                latitude,
                longitude,
                address: 'Ubicación compartida'
            }
            await handleSend(undefined, 'location', undefined, locationContent)
        }, (error) => {
            toast.error("Error al obtener ubicación")
            console.error(error)
        })
    }
    const handleAudioSend = async (blob: Blob, duration: number, mimeType: string) => {
        setIsRecordingAudio(false)
        setUploading(true)
        
        try {
            const isWhatsApp = conversation?.channel === 'whatsapp' || (conversation as any)?.integration_connections?.provider_key?.includes('whatsapp');
            
            let finalBlob = blob;
            let ext = 'webm';
            let mime = 'audio/webm';

            if (isWhatsApp) {
                const { convertWebmToOgg } = await import("@/lib/audio/webm-to-ogg")
                finalBlob = await convertWebmToOgg(blob)
                ext = 'ogg';
                mime = 'audio/ogg';
            } else {
                // For Social (Messenger/IG), convert to WAV for maximum compatibility
                try {
                    const { convertWebmToWav } = await import("@/lib/audio/webm-to-wav")
                    finalBlob = await convertWebmToWav(blob)
                    ext = 'wav';
                    mime = 'audio/wav';
                } catch (wavErr) {
                    console.error("[ChatArea] WAV conversion failed, falling back to original blob:", wavErr);
                    // Fallback to original blob if conversion fails
                    if (mimeType.includes('mp4')) { ext = 'm4a'; mime = 'audio/mp4'; }
                    else if (mimeType.includes('webm')) { ext = 'webm'; mime = 'audio/webm'; }
                }
            }
            
            const orgId = conversation?.organization_id
            const fileName = `audio/${orgId}/${Date.now()}.${ext}`
            
            const { error: uploadError } = await supabase.storage
                .from(MESSAGING_STORAGE_BUCKET)
                .upload(fileName, finalBlob, { 
                    contentType: mime,
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from(MESSAGING_STORAGE_BUCKET)
                .getPublicUrl(fileName)

            await handleSend(undefined, 'audio', publicUrl)
        } catch (error: any) {
            toast.error("Error al enviar audio: " + error.message)
            console.error(error)
        } finally {
            setUploading(false)
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
    const processFile = async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            toast.error(t('crm.inbox.chat.actions.file_too_large'))
            return
        }

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop() || 'png'
            const fileName = `${conversationId}/${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from(MESSAGING_STORAGE_BUCKET)
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from(MESSAGING_STORAGE_BUCKET)
                .getPublicUrl(filePath)

            let type: 'image' | 'video' | 'audio' | 'document' = 'document'
            if (file.type.startsWith('image/')) type = 'image'
            else if (file.type.startsWith('video/')) type = 'video'
            else if (file.type.startsWith('audio/')) type = 'audio'

            setPendingAttachment({ url: publicUrl, type, name: file.name })

        } catch (error) {
            console.error("Upload failed", error)
            toast.error(t('crm.inbox.chat.actions.upload_failed'))
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) await processFile(file)
    }

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) {
                    // Create a proper File object with a name if it's missing (pasted items often lack it)
                    const namedFile = new File([file], `pasted-image-${Date.now()}.png`, { type: file.type })
                    await processFile(namedFile)
                    // Prevent pasting the image as text if the browser tries to
                    e.preventDefault()
                    break
                }
            }
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={!callStatus?.callingEnabled}
                                    className={cn(
                                        "h-8 w-8 transition-colors",
                                        callStatus?.permStatus?.hasPermission 
                                            ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                            : callStatus?.isSessionActive
                                                ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                : "text-muted-foreground"
                                    )}
                                    onClick={() => {
                                        if (callStatus?.permStatus?.hasPermission) {
                                            // Handle Call Initiation (Logic already in system or to be linked)
                                            toast.info("Iniciando llamada...");
                                        } else if (callStatus?.isSessionActive) {
                                            // Send Interactive Request
                                            handleSend("¿Podemos hablar por llamada?", "interactive_call_request" as any);
                                            toast.success("Solicitud de llamada enviada");
                                        } else {
                                            // Open Template Picker
                                            setIsTemplatePickerOpen(true);
                                        }
                                    }}
                                >
                                    <Phone className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {!callStatus?.callingEnabled ? "Llamadas desactivadas" :
                                 callStatus?.permStatus?.hasPermission ? "Llamar ahora (Permiso activo)" :
                                 callStatus?.isSessionActive ? "Solicitar llamada (Ventana 24h)" :
                                 "Enviar plantilla de llamada"}
                            </TooltipContent>
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

            {/* Inbound Call Alert Overlay */}
            {incomingCall && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px]">
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-pulse">
                            <Phone className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm">Llamada Entrante</h4>
                            <p className="text-xs text-muted-foreground">{incomingCall.from}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 rounded-full border-red-200 hover:bg-red-50 text-red-600"
                                onClick={() => setIncomingCall(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <Button 
                                size="sm" 
                                className="h-8 rounded-full bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                    // Handle Accept (Open WebRTC UI or podobné)
                                    toast.success("Conectando...");
                                    setIncomingCall(null);
                                }}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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
                        startReached={() => {
                            if (hasMoreMessages && !loadingOlder) loadOlderMessages()
                        }}
                        components={{
                            Header: () => loadingOlder ? (
                                <div className="flex justify-center py-3">
                                    <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                                </div>
                            ) : hasMoreMessages ? (
                                <div className="flex justify-center py-2">
                                    <span className="text-[10px] text-muted-foreground/50">Scroll para cargar más</span>
                                </div>
                            ) : null
                        }}
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
            <div className={cn("p-3 bg-white dark:bg-zinc-900 border-t relative z-20 min-h-[80px] flex", isRecordingAudio ? "items-center" : "items-end gap-2")}>
                {isRecordingAudio ? (
                    <AudioRecorder 
                        onSend={handleAudioSend} 
                        onCancel={() => setIsRecordingAudio(false)} 
                    />
                ) : (
                    <>
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

                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("text-muted-foreground hover:text-foreground shrink-0 rounded-full h-10 w-10", showEmojiPicker && "bg-muted text-foreground")}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <Smile className="h-6 w-6" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-foreground shrink-0 rounded-full h-10 w-10"
                                        disabled={uploading}
                                    >
                                        <Paperclip className={cn("h-5 w-5", uploading && "animate-pulse")} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl mb-2">
                                    <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <FileText className="h-4 w-4 text-orange-500" />
                                        <span>Documento</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer" onClick={() => {
                                        if (fileInputRef.current) {
                                            fileInputRef.current.accept = "image/*,video/*"
                                            fileInputRef.current.click()
                                        }
                                    }}>
                                        <Image className="h-4 w-4 text-blue-500" />
                                        <span>Fotos y videos</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer" onClick={handleSendLocation}>
                                        <MapPin className="h-4 w-4 text-green-500" />
                                        <span>Ubicación</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer" onClick={() => setIsRecordingAudio(true)}>
                                        <Mic className="h-4 w-4 text-red-500" />
                                        <span>Mensaje de voz</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer opacity-50">
                                        <ContactIcon className="h-4 w-4 text-indigo-500" />
                                        <span>Contacto</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

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

                        <div className="flex-1 relative">
                            {/* Pending Attachment Preview */}
                            {pendingAttachment && (
                                <div className="absolute -top-24 left-0 bg-white dark:bg-zinc-800 p-2 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 animate-in slide-in-from-bottom-2 duration-200 flex items-center gap-3 z-30">
                                    <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border dark:border-zinc-700">
                                        {pendingAttachment.type === 'image' ? (
                                            <img src={pendingAttachment.url} className="h-full w-full object-cover" alt="Preview" />
                                        ) : (
                                            <FileText className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-[100px] max-w-[200px]">
                                        <span className="text-[11px] font-medium truncate text-foreground">{pendingAttachment.name}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">{pendingAttachment.type}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                        onClick={() => setPendingAttachment(null)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}

                            <div className="bg-zinc-100/50 dark:bg-zinc-800/50 rounded-2xl border-none focus-within:bg-zinc-50 dark:focus-within:bg-zinc-800 transition-all flex items-center px-4 py-2 ring-0 focus-within:ring-0 shadow-none">
                                <Textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    placeholder={pendingAttachment ? "Añadir un comentario..." : t('crm.inbox.chat.input_placeholder')}
                                    className="min-h-[24px] max-h-[120px] w-full border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 outline-none p-0 bg-transparent resize-none leading-relaxed text-foreground"
                                    rows={1}
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
                    </div>

                        <Button
                            size="icon"
                            className={cn(
                                "h-10 w-10 shrink-0 rounded-full shadow-md transition-all duration-300",
                                (inputValue.trim() || uploading || pendingAttachment) 
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white transform scale-105 active:scale-95" 
                                    : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                            )}
                            onClick={() => handleSend()}
                            disabled={sending || (!inputValue.trim() && !uploading && !pendingAttachment)}
                        >
                            <Send className={cn("h-5 w-5 ml-0.5", (inputValue.trim() || uploading || pendingAttachment) && "animate-in slide-in-from-left-1")} />
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}
