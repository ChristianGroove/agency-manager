"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { usePathname, useRouter } from "next/navigation"
import { useInboxPreferences } from "@/modules/core/preferences/use-inbox-preferences"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGlobalInbox } from "../../context/global-inbox-context"
import { MessageSquare, X, Reply, CheckCheck } from "lucide-react"
import { markConversationAsRead } from "../../actions"
import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team-actions"
import { getOrgConnectionIds } from "@/modules/core/messaging/conversation-actions"
import { Button } from "@/components/ui/button"
import { SoundPlayer } from "@/modules/core/preferences/sound-player"

type Message = any // Replace with proper type import

export function GlobalMessageListener() {
    const pathname = usePathname()
    const { preferences } = useInboxPreferences()
    const { openInbox } = useGlobalInbox()
    const processedMessages = useRef<Set<string>>(new Set())
    const pathnameRef = useRef(pathname)
    const preferencesRef = useRef(preferences)
    const lastSoundPlayedRef = useRef<number>(0)
    const globalChannelCounter = useRef(0)

    // RBAC Permissions State
    const [userPermissions, setUserPermissions] = useState<any>(null)
    const userPermissionsRef = useRef<any>(null)

    // Tenant isolation: only show popups for connections that belong to the active org
    const orgConnectionIdsRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        // PERFORMANCE: Delay websocket connection by 2.5s to let the main dashboard render without CPU contention
        const timer = setTimeout(() => {
            const fetchPerms = async () => {
                const [perms, connectionIds] = await Promise.all([
                    getCurrentUserPermissions(),
                    getOrgConnectionIds()
                ])
                setUserPermissions(perms)
                userPermissionsRef.current = perms
                orgConnectionIdsRef.current = new Set(connectionIds)
            }
            fetchPerms()
        }, 2500)

        return () => clearTimeout(timer)
    }, [])

    // Keep refs updated without triggering useEffect
    useEffect(() => {
        pathnameRef.current = pathname
    }, [pathname])

    useEffect(() => {
        preferencesRef.current = preferences
    }, [preferences])

    useEffect(() => {
        // Define channel colors
        const getChannelColor = (channel: string) => {
            switch (channel) {
                case 'whatsapp': return 'text-[#25D366] bg-[#25D366]/10'
                case 'messenger': return 'text-[#0084FF] bg-[#0084FF]/10'
                case 'instagram': return 'text-[#E1306C] bg-[#E1306C]/10'
                default: return 'text-primary bg-primary/10'
            }
        }

        const getChannelIcon = (channel: string) => {
            return <MessageSquare className="h-3 w-3" />
        }

        // Unique channel name avoids Supabase collision after removeChannel
        globalChannelCounter.current += 1
        const channelName = `global-messages-${globalChannelCounter.current}`

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    const msg = payload.new as Message

                    // Filter inbound messages client-side
                    if (msg.direction !== 'inbound') return

                    // 1. Deduplication
                    if (processedMessages.current.has(msg.id)) return
                    processedMessages.current.add(msg.id)
                    setTimeout(() => processedMessages.current.delete(msg.id), 10000)

                    // 2. Suppress if on Inbox Page
                    if (pathnameRef.current?.includes('/inbox')) return

                    // 3. Play Sound (absorbed from use-message-notifications)
                    const currentPrefs = preferencesRef.current
                    if (currentPrefs.notifications.sound_enabled) {
                        const now = Date.now()
                        if (now - lastSoundPlayedRef.current >= 1000) {
                            try {
                                const volume = currentPrefs.notifications.sound_volume ?? 0.5
                                SoundPlayer.getInstance().play(currentPrefs.notifications.sound_selection || 'subtle', volume)
                                lastSoundPlayedRef.current = now
                            } catch (e) {
                                // Audio blocked
                            }
                        }
                    }

                    // 4. Push Notification (absorbed from use-message-notifications)
                    if (currentPrefs.notifications.push_enabled) {
                        if (document.hidden) {
                            if (Notification.permission === 'granted') {
                                new Notification(`New message from ${msg.sender || 'Contact'}`, {
                                    body: typeof msg.content === 'string' ? msg.content?.substring(0, 50) : (msg.content?.text || '').substring(0, 50),
                                    icon: '/icons/icon-192x192.png'
                                })
                            }
                        }
                    }

                    // 5. Fetch conversation for toast context
                    const { data: conversation } = await supabase
                        .from('conversations')
                        .select('leads(name, phone), channel, connection_id, last_message')
                        .eq('id', msg.conversation_id)
                        .single()

                    // Tenant isolation — only show popups for this org's connections
                    if (conversation?.connection_id) {
                        if (!orgConnectionIdsRef.current.has(conversation.connection_id)) {
                            return
                        }
                    } else if (orgConnectionIdsRef.current.size > 0) {
                        return
                    }

                    // RBAC check
                    const perms = userPermissionsRef.current
                    if (perms?.role === 'member') {
                        const allowedChannels = perms.permissions?.inbox_access || []
                        if (!allowedChannels.includes(conversation?.connection_id)) {
                            return
                        }
                    }

                    const leadData = conversation?.leads
                    const lead = Array.isArray(leadData) ? leadData[0] : leadData

                    const senderName = lead?.name || lead?.phone || "Unknown Sender"
                    const messageText = typeof msg.content === 'string'
                        ? msg.content
                        : (msg.content?.text || msg.content?.body || "Sent a media file")

                    const channelColorClass = getChannelColor(msg.channel)

                    toast.custom((t) => (
                        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 flex gap-4 pointer-events-auto ring-1 ring-black/5 animate-in slide-in-from-top-2">
                            {/* Avatar */}
                            <div className="flex-shrink-0 relative">
                                <Avatar className="h-12 w-12 border-2 border-white dark:border-zinc-800 shadow-sm">
                                    <AvatarImage src="" />
                                    <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-700 dark:text-zinc-300">
                                        {senderName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${channelColorClass}`}>
                                    {getChannelIcon(msg.channel)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <h4 className="text-sm font-bold text-foreground truncate">{senderName}</h4>
                                    <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">Ahora</span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                    {messageText}
                                </p>

                                <div className="flex items-center gap-2 mt-3">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 px-3 text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                                        onClick={() => {
                                            toast.dismiss(t)
                                            openInbox(msg.conversation_id)
                                        }}
                                    >
                                        <Reply className="h-3 w-3 mr-1.5" />
                                        Responder
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={async () => {
                                            toast.dismiss(t)
                                            const result = await markConversationAsRead(msg.conversation_id)
                                            if (result.success) {
                                                toast.success('Marcado como leído')
                                            } else {
                                                toast.error('Error al marcar como leído')
                                            }
                                        }}
                                    >
                                        <CheckCheck className="h-3 w-3 mr-1.5" />
                                        Marcar leído
                                    </Button>
                                </div>
                            </div>

                            {/* Dismiss */}
                            <button
                                onClick={() => toast.dismiss(t)}
                                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ), {
                        id: `global-notification-${msg.conversation_id}`,
                        duration: 8000,
                        position: 'top-right'
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // Run only once on mount - refs handle dynamic values
    }, [openInbox])

    return null
}
