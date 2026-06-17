"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/modules/core/database/supabase"
import { usePathname } from "next/navigation"
import { useInboxPreferences } from "@/modules/core/preferences/use-inbox-preferences"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSafeInboxContext } from "@/modules/features/messaging/context/inbox-context"
import { useGlobalInbox } from "@/modules/features/messaging/context/global-inbox-context"
import { MessageSquare, X, Reply, CheckCheck } from "lucide-react"
import { markConversationAsRead } from "@/modules/features/messaging/messaging-actions"
import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team"
import { getOrgConnectionIds } from "@/modules/features/messaging/conversation-actions"
import { Button } from "@/components/ui/button"
import { SoundPlayer } from "@/modules/core/preferences/sound-player"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"
import { evaluateInboxPermissions } from "@/modules/core/iam/utils/inbox-permissions"

export function GlobalMessageListener() {
    const pathname = usePathname()
    const { preferences } = useInboxPreferences()
    const inboxContext = useSafeInboxContext()
    const { openInbox } = useGlobalInbox()
    const { refreshAgents, updateAgent } = (inboxContext || {}) as any
    const { organizationId } = useCurrentOrganization()
    const processedConvs = useRef<Set<string>>(new Set())
    const pathnameRef = useRef(pathname)
    const preferencesRef = useRef(preferences)
    const lastSoundPlayedRef = useRef<number>(0)
    const globalChannelCounter = useRef(0)

    // RBAC Permissions State
    const [userPermissions, setUserPermissions] = useState<any>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const userPermissionsRef = useRef<any>(null)

    // Tenant isolation
    const orgConnectionIdsRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        const timer = setTimeout(() => {
            const fetchPerms = async () => {
                try {
                    const [perms, connectionIds, { data: { user } }] = await Promise.all([
                        getCurrentUserPermissions(),
                        getOrgConnectionIds(),
                        supabase.auth.getUser()
                    ])
                    setUserPermissions(perms)
                    userPermissionsRef.current = perms
                    orgConnectionIdsRef.current = new Set(connectionIds)
                    if (user) setUserId(user.id)
                } catch (e) {}
            }
            fetchPerms()
        }, 2000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => { pathnameRef.current = pathname }, [pathname])
    useEffect(() => { preferencesRef.current = preferences }, [preferences])

    useEffect(() => {
        // Wait for auth and permissions to be fully loaded
        if (!organizationId || !userPermissions || !userId) return

        // 1. DYNAMIC NOTIFICATION LISTENER (MICRO-SUBSCRIPTIONS)
        globalChannelCounter.current += 1
        const channelName = `global-conv-${organizationId.slice(0, 8)}-${globalChannelCounter.current}`

        const channel = supabase.channel(channelName)
        const { hasGlobalView, authorizedChannels } = evaluateInboxPermissions(userPermissions)

        // Helper to define what happens when a message arrives
        const onMessageUpdate = async (payload: any) => {
            const conv = payload.new as any
            const oldConv = payload.old as any

            if (!conv.last_message_at || conv.last_message_at === oldConv?.last_message_at) return
            if ((conv.unread_count || 0) <= (oldConv?.unread_count || 0)) return

            // Deduplication layer to prevent double-firing if a message hits 2 subscribed conditions
            const dedupeKey = `${conv.id}-${conv.last_message_at}`
            if (processedConvs.current.has(dedupeKey)) return
            processedConvs.current.add(dedupeKey)
            setTimeout(() => processedConvs.current.delete(dedupeKey), 5000)

            if (pathnameRef.current?.includes('/inbox')) return

            const currentPrefs = preferencesRef.current
            if (currentPrefs.notifications.sound_enabled) {
                const now = Date.now()
                if (now - lastSoundPlayedRef.current >= 1000) {
                    try {
                        SoundPlayer.getInstance().play(currentPrefs.notifications.sound_selection || 'subtle', currentPrefs.notifications.sound_volume ?? 0.5)
                        lastSoundPlayedRef.current = now
                    } catch (e) {}
                }
            }

            if (conv.connection_id && !orgConnectionIdsRef.current.has(conv.connection_id)) return
            
            // LOCAL HIDING REMOVED! We now fully trust the backend subscriptions.
            // If the message made it here, it means the agent is assigned or has channel/global access.

            let senderName = "Nuevo Mensaje"
            try {
                const { data: leadData } = await supabase.from('leads').select('name, phone').eq('id', conv.lead_id).single()
                senderName = leadData?.name || leadData?.phone || "Nuevo Mensaje"
            } catch (e) {}

            // DISPATCH SYNC EVENT FOR CHATAREA AND OTHERS
            window.dispatchEvent(new CustomEvent('pixy:sync-active-chat', { 
                detail: { conversationId: conv.id } 
            }));
            
            // DISPATCH EVENT FOR USE-CONVERSATIONS CACHE
            window.dispatchEvent(new CustomEvent('pixy:conversations-update', { 
                detail: payload 
            }));

            toast.custom((t) => (
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 flex gap-4 pointer-events-auto items-center animate-in slide-in-from-top-2">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback className="bg-brand-cyan text-white font-bold">{senderName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between"><h4 className="text-sm font-bold truncate">{senderName}</h4></div>
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview || "Ver mensaje..."}</p>
                        <div className="mt-2 flex gap-2">
                            <Button size="sm" className="h-7 text-[10px]" onClick={() => { toast.dismiss(t); openInbox(conv.id); }}>Ver</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { toast.dismiss(t); markConversationAsRead(conv.id); }}>Marcar leído</Button>
                        </div>
                    </div>
                </div>
            ), { id: `gn-${conv.id}`, duration: 6000 })
        }

        // Apply Micro-Subscriptions based on RBAC rules
        if (hasGlobalView) {
            // ADMIN / OWNER: Subscribe to the entire organization
            channel.on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `organization_id=eq.${organizationId}` },
                onMessageUpdate
            )
        } else {
            // RESTRICTED AGENT: Subscribe to their strictly assigned conversations
            channel.on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `assigned_to=eq.${userId}` },
                onMessageUpdate
            )
            
            // ALSO Subscribe to each authorized channel (if any)
            if (authorizedChannels && authorizedChannels.length > 0) {
                authorizedChannels.forEach((chanId: string) => {
                    channel.on('postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `connection_id=eq.${chanId}` },
                        onMessageUpdate
                    )
                })
            }
        }

        channel.subscribe()

        // 2. ULTRA-PERFECT HEARTBEAT (DB-BASED)
        let heartbeatInterval: any = null

        const triggerHeartbeat = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { error } = await supabase
                    .from('agent_availability')
                    .update({ 
                        last_seen_at: new Date().toISOString(),
                        status: 'online'
                    })
                    .eq('agent_id', user.id)
                    .eq('organization_id', organizationId)
                
                // Polling agents info efficiently instead of N*N Websocket broadcasts
                if (!error && refreshAgents) {
                    refreshAgents()
                }
            } catch (err) {}
        }

        triggerHeartbeat()
        heartbeatInterval = setInterval(triggerHeartbeat, 60000)

        return () => {
            supabase.removeChannel(channel)
            if (heartbeatInterval) clearInterval(heartbeatInterval)
        }
    }, [organizationId, updateAgent, refreshAgents, openInbox, userPermissions, userId])

    return null
}
