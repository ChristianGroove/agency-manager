"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { usePathname } from "next/navigation"
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
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"

export function GlobalMessageListener() {
    const pathname = usePathname()
    const { preferences } = useInboxPreferences()
    const { openInbox } = useGlobalInbox()
    const { organizationId } = useCurrentOrganization()
    const processedConvs = useRef<Set<string>>(new Set())
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
        if (!organizationId) return

        // Define channel colors
        const getChannelColor = (channel: string) => {
            switch (channel) {
                case 'whatsapp': return 'text-[#25D366] bg-[#25D366]/10'
                case 'messenger': return 'text-[#0084FF] bg-[#0084FF]/10'
                case 'instagram': return 'text-[#E1306C] bg-[#E1306C]/10'
                default: return 'text-primary bg-primary/10'
            }
        }

        const getChannelIcon = () => {
            return <MessageSquare className="h-3 w-3" />
        }

        // Unique channel name avoids Supabase collision after removeChannel
        globalChannelCounter.current += 1
        const channelName = `global-conv-${organizationId.slice(0, 8)}-${globalChannelCounter.current}`

        // CRITICAL FIX: Listen to `conversations` table with organization_id filter
        // instead of unfiltered `messages` table. The `messages` table has NO organization_id,
        // so every INSERT was broadcast to every tenant globally.
        // The DB trigger `update_conversation_last_message` updates conversations on every new message,
        // so this captures the same event with proper tenant scoping.
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversations',
                    filter: `organization_id=eq.${organizationId}`
                },
                async (payload) => {
                    const conv = payload.new as any
                    const oldConv = payload.old as any

                    // Only react to NEW messages (last_message_at changed)
                    if (!conv.last_message_at || conv.last_message_at === oldConv?.last_message_at) return

                    // Only react to inbound (unread_count increased)
                    if ((conv.unread_count || 0) <= (oldConv?.unread_count || 0)) return

                    // Deduplication (1 notification per conversation per 5s window)
                    const dedupeKey = `${conv.id}-${conv.last_message_at}`
                    if (processedConvs.current.has(dedupeKey)) return
                    processedConvs.current.add(dedupeKey)
                    setTimeout(() => processedConvs.current.delete(dedupeKey), 5000)

                    // Suppress Toasts if on Inbox Page (to avoid clutter), but allow Sound
                    const isOnInboxPage = pathnameRef.current?.includes('/inbox')

                    // Play Sound
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

                    // Push Notification
                    if (currentPrefs.notifications.push_enabled) {
                        if (document.hidden) {
                            if (Notification.permission === 'granted') {
                                const preview = conv.last_message_preview || ''
                                new Notification('Nuevo mensaje', {
                                    body: preview.substring(0, 50),
                                    icon: '/icons/icon-192x192.png'
                                })
                            }
                        }
                    }

                    // Tenant isolation — only show popups for this org's connections
                    if (conv.connection_id) {
                        if (!orgConnectionIdsRef.current.has(conv.connection_id)) {
                            return
                        }
                    } else if (orgConnectionIdsRef.current.size > 0) {
                        return
                    }

                    // RBAC check
                    const perms = userPermissionsRef.current
                    if (perms?.role === 'member') {
                        const allowedChannels = perms.permissions?.inbox_access || []
                        if (!allowedChannels.includes(conv.connection_id)) {
                            return
                        }
                    }

                    // SUPPRESS TOAST IF ON INBOX PAGE
                    if (isOnInboxPage) return

                    // Fetch lead name for the toast
                    const { data: leadData } = await supabase
                        .from('leads')
                        .select('name, phone')
                        .eq('id', conv.lead_id)
                        .single()

                    const senderName = leadData?.name || leadData?.phone || "Unknown Sender"
                    const messageText = conv.last_message_preview || "Nuevo mensaje"
                    const channelColorClass = getChannelColor(conv.channel)

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
                                    {getChannelIcon()}
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
                                            openInbox(conv.id)
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
                                            const result = await markConversationAsRead(conv.id)
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
                        id: `global-notification-${conv.id}`,
                        duration: 8000,
                        position: 'top-right'
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [organizationId, openInbox])

    return null
}
