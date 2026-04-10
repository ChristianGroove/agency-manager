import { useState, useEffect, useRef } from "react"
import { supabase } from "@/modules/core/database/supabase"
import { Database } from "@/types/supabase"
import { Message as MessagingMessage } from "@/types/messaging"
import { markConversationAsRead } from "../actions/messages"
import { realtimeManager } from "@/modules/core/database/supabase-realtime-manager"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export type Message = Database['public']['Tables']['messages']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: {
        id: string
        name: string | null
        phone: string | null
        status: string | null
    } | null
    clients: {
        name: string | null
        phone: string | null
        avatar_url: string | null
    } | null
    integration_connections: {
        connection_name: string | null
        provider_key: string | null
    } | null
}

const MESSAGE_PAGE_SIZE = 50

export function useChatLogic(conversationId: string) {
    const { t } = useTranslation()
    const router = useRouter()
    
    // Core State
    const [messages, setMessages] = useState<Message[]>([])
    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [hasMoreMessages, setHasMoreMessages] = useState(false)
    const [loadingOlder, setLoadingOlder] = useState(false)
    const [callStatus, setCallStatus] = useState<any | null>(null)
    const [incomingCall, setIncomingCall] = useState<{ call_id: string, from: string } | null>(null)

    // Refs
    const markAsReadTimeout = useRef<NodeJS.Timeout | null>(null)

    const debouncedMarkAsRead = (id: string) => {
        if (markAsReadTimeout.current) clearTimeout(markAsReadTimeout.current)
        markAsReadTimeout.current = setTimeout(() => {
            markConversationAsRead(id)
        }, 2000)
    }

    const fetchConversation = async () => {
        if (!conversationId) return
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                leads (
                    id,
                    name,
                    phone,
                    status
                ),
                clients (
                    name,
                    phone,
                    avatar_url
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
            
            // Fetch Call Status
            try {
                import('../actions').then(m => m.getCallStatus(conversationId)).then(res => {
                    if (res && res.success) setCallStatus(res as any)
                }).catch(e => {
                    console.warn('[useChatLogic] Call status fetch failed:', e);
                })
            } catch (e) {
                 console.error('[useChatLogic] Dynamic import failed:', e);
            }
        }
    }

    const fetchMessages = async (forceRefetch = false) => {
        if (!conversationId) return
        
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(MESSAGE_PAGE_SIZE)

        if (data) {
            const sorted = data.reverse()
            setMessages(prev => {
                if (forceRefetch || prev.length === 0 || prev[0]?.conversation_id !== conversationId) {
                    return sorted
                }
                const existingIds = new Set(prev.map(m => m.id))
                const onlyNew = sorted.filter(m => !existingIds.has(m.id))
                if (onlyNew.length === 0) return prev
                return [...prev, ...onlyNew].sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
            })
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

    // Effects for Realtime/Listeners
    useEffect(() => {
        if (!conversationId) return;
        
        fetchConversation()
        fetchMessages(true)

        const channelName = `chat-area-${conversationId}`
        
        realtimeManager.getOrCreateChannel(channelName, (channel: any) => {
            channel.on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload: any) => {
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
                (payload: any) => {
                    const updatedConv = payload.new as any
                    if (updatedConv.id === conversationId) {
                        fetchConversation()
                    }
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'leads' },
                (payload: any) => {
                    if (payload.new.id === conversation?.leads?.id) {
                        fetchConversation()
                    }
                }
            )
            .on('broadcast', { event: 'incoming_call' }, (payload: any) => {
                setIncomingCall(payload.payload)
                setTimeout(() => setIncomingCall(null), 30000)
            })
        })

        // Listen for External Sync
        const handleExternalSync = (e: Event) => {
            const { conversationId: syncConvId } = (e as CustomEvent).detail;
            if (syncConvId === conversationId) {
                fetchMessages();
            }
        };

        window.addEventListener('pixy:sync-active-chat', handleExternalSync);

        return () => {
            realtimeManager.releaseChannel(channelName)
            window.removeEventListener('pixy:sync-active-chat', handleExternalSync);
            if (markAsReadTimeout.current) clearTimeout(markAsReadTimeout.current)
        }
    }, [conversationId])

    return {
        messages,
        setMessages,
        conversation,
        hasMoreMessages,
        loadingOlder,
        loadOlderMessages,
        callStatus,
        incomingCall,
        setIncomingCall,
        fetchMessages,
        fetchConversation,
        debouncedMarkAsRead
    }
}
