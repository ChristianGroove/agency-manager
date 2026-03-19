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

    // Tenant isolation
    const orgConnectionIdsRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        const timer = setTimeout(() => {
            const fetchPerms = async () => {
                try {
                    const [perms, connectionIds] = await Promise.all([
                        getCurrentUserPermissions(),
                        getOrgConnectionIds()
                    ])
                    setUserPermissions(perms)
                    userPermissionsRef.current = perms
                    orgConnectionIdsRef.current = new Set(connectionIds)
                } catch (e) {}
            }
            fetchPerms()
        }, 2000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => { pathnameRef.current = pathname }, [pathname])
    useEffect(() => { preferencesRef.current = preferences }, [preferences])

    useEffect(() => {
        if (!organizationId) return

        // 1. NOTIFICATION LISTENER
        globalChannelCounter.current += 1
        const channelName = `global-conv-${organizationId.slice(0, 8)}-${globalChannelCounter.current}`

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `organization_id=eq.${organizationId}` },
                async (payload) => {
                    const conv = payload.new as any
                    const oldConv = payload.old as any

                    if (!conv.last_message_at || conv.last_message_at === oldConv?.last_message_at) return
                    if ((conv.unread_count || 0) <= (oldConv?.unread_count || 0)) return

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
                    
                    const perms = userPermissionsRef.current
                    const hasGlobalView = perms?.permissions?.all === true || perms?.permissions?.['inbox.conversations.view_all'] === true
                    if (!hasGlobalView && !(perms?.permissions?.inbox_access || []).includes(conv.connection_id)) return

                    let senderName = "Nuevo Mensaje"
                    try {
                        const { data: leadData } = await supabase.from('leads').select('name, phone').eq('id', conv.lead_id).single()
                        senderName = leadData?.name || leadData?.phone || "Nuevo Mensaje"
                    } catch (e) {}

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
            )
            .subscribe()

        // 2. ULTRA-PERFECT HEARTBEAT (DB-BASED)
        // Works even if Websockets flicker. RPC re-checks every 10 min.
        let heartbeatInterval: any = null

        const triggerHeartbeat = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Update DB physical state
            await supabase
                .from('agent_availability')
                .update({ 
                    last_seen_at: new Date().toISOString(),
                    status: 'online'
                })
                .eq('agent_id', user.id)
                .eq('organization_id', organizationId)
        }

        triggerHeartbeat()
        heartbeatInterval = setInterval(triggerHeartbeat, 60000) // 1 minute is perfect

        return () => {
            supabase.removeChannel(channel)
            if (heartbeatInterval) clearInterval(heartbeatInterval)
        }
    }, [organizationId]) // Removed openInbox dependency to avoid unnecessary recreations

    return null
}
