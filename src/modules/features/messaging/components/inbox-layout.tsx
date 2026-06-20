"use client"

import * as React from "react"
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/modules/infrastructure/utils/utils"
// import { ConversationList } from "./conversation-list" // Deprecated
import { SidebarTabs } from "./sidebar/sidebar-tabs"
import { ChatArea } from "./chat-area/chat-area"
import { ContextDeck } from "./context-deck"
import { ConversationDropZones } from "./conversation-drop-zones"
import { updateConversationState } from "../conversation-management-actions"
import { toast } from "sonner"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useSearchParams, useRouter } from "next/navigation"
import { createConversation } from "../conversation-management-actions"
import { InboxProvider, useInboxContext } from "../context/inbox-context"
import { getActiveModules } from "@/modules/core/saas/saas-actions"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getAgentsWorkload } from "../assignment-actions"
import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team"
import { supabase } from "@/modules/core/database/supabase"
import { AgentMonitoringWidget } from "@/modules/core/dashboard/widgets/smart-cards/agent-monitoring-widget"

interface InboxLayoutProps {
    initialConversationId?: string | null
}


export function InboxLayout({ initialConversationId }: InboxLayoutProps) {
    return (
        <InboxProvider>
            <InboxLayoutContent initialConversationId={initialConversationId} />
        </InboxProvider>
    )
}

function InboxLayoutContent({ initialConversationId }: InboxLayoutProps) {
    const { t } = useTranslation()
    const { setActiveModules, setSpaceCategory, setAgents, setCurrentUserRole, isAgentMonitorVisible } = useInboxContext()

    const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(initialConversationId || null)
    const [organizationId, setOrganizationId] = React.useState<string | null>(null)
    const [userPermissions, setUserPermissions] = React.useState<any>(null)
    const [isContextOpen, setIsContextOpen] = React.useState(true)
    const [activeDragId, setActiveDragId] = React.useState<string | null>(null)
    const [mounted, setMounted] = React.useState(false)

    // Memoize permissions to prevent unnecessary re-renders of the sidebar/realtime
    const memoizedPermissions = React.useMemo(() => userPermissions, [userPermissions])

    React.useEffect(() => {
        setMounted(true)
    }, [])

    // Limpiar el panel de chat cuando se elimina o resuelve la conversación activa.
    // El flag clearChat=true en el evento indica que el panel central debe vaciarse.
    const selectedConversationIdRef = React.useRef(selectedConversationId)
    React.useEffect(() => { selectedConversationIdRef.current = selectedConversationId }, [selectedConversationId])

    React.useEffect(() => {
        const handleConvDeleted = (e: Event) => {
            const { conversationId, clearChat } = (e as CustomEvent).detail
            if (clearChat && conversationId === selectedConversationIdRef.current) {
                setSelectedConversationId(null)
            }
        }
        window.addEventListener('pixy:conversation-deleted', handleConvDeleted)
        return () => window.removeEventListener('pixy:conversation-deleted', handleConvDeleted)
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const searchParams = useSearchParams()
    const router = useRouter()
    const initializedRef = React.useRef(false)

    // Handle Auto-Navigation/Auto-Start from Query Params
    React.useEffect(() => {
        const contact = searchParams.get('contact')
        const leadId = searchParams.get('leadId')

        if ((contact || leadId) && !initializedRef.current) {
            initializedRef.current = true

            const autoStartChat = async () => {
                const payload: any = {}
                if (leadId) payload.lead_id = leadId
                if (contact) {
                    if (contact.includes('@')) payload.email = contact
                    else payload.phone = contact
                }

                try {
                    const result = await createConversation(payload)
                    if (result.success && result.data) {
                        setSelectedConversationId(result.data.id)
                        // Clean up URL to prevent re-triggering on manual refresh if desired,
                        // or keep it for deep linking. Let's clean it up to keep it tidy.
                        const newUrl = window.location.pathname
                        router.replace(newUrl)
                    }
                } catch (error) {
                    console.error("Auto-start chat failed", error)
                }
            }

            autoStartChat()
        }
    }, [searchParams, router])

    // Load Global Config Once (Optimized: Centralized Identity & Module Loading)
    React.useEffect(() => {
        const loadConfig = async () => {
            try {
                const orgId = await getCurrentOrganizationId()
                if (orgId) {
                    setOrganizationId(orgId)
                    
                    // Fetch everything in parallel to minimize TTFB
                    const [modules, { data: orgData }, agentsResult, perms] = await Promise.all([
                        getActiveModules(orgId),
                        supabase.from('organizations').select('active_app_id').eq('id', orgId).single(),
                        getAgentsWorkload(),
                        getCurrentUserPermissions()
                    ])
                    
                    setActiveModules(modules)
                    setUserPermissions(perms)
                    if (perms?.role) {
                        setCurrentUserRole(perms.role)
                    }
                    
                    if (agentsResult.success) setAgents(agentsResult.data)

                    if (orgData?.active_app_id) {
                        const { data: appData } = await supabase
                            .from('saas_apps')
                            .select('space_category')
                            .eq('id', orgData.active_app_id)
                            .maybeSingle()
                        setSpaceCategory(appData?.space_category || null)
                    }
                }
            } catch (err) {
                console.error("Failed to load global inbox config", err)
            }
        }
        loadConfig()
    }, [setActiveModules, setSpaceCategory, setAgents])

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveDragId(null)

        if (!over) {
            return
        }

        if (active.id === over.id) {
            return
        }

        const conversationId = active.id as string
        const targetZone = over.id as string



        let updates: { state?: string; status?: string } = {}
        let actionLabel = ''

        if (targetZone === 'resolved') {
            updates = { state: 'archived', status: 'closed' }
            actionLabel = t('crm.inbox.layout.action_resolved')
        } else if (targetZone === 'archived') {
            updates = { state: 'archived', status: 'archived' }
            actionLabel = t('crm.inbox.layout.action_archived')
        } else if (targetZone === 'open' || targetZone === 'active') {
            updates = { state: 'active', status: 'open' }
            actionLabel = t('crm.inbox.layout.action_reopened')
        } else if (targetZone === 'snoozed') {
            updates = { state: 'active', status: 'snoozed' }
            actionLabel = t('crm.inbox.layout.action_snoozed')
        }

        if (Object.keys(updates).length > 0) {
            try {
                const result = await updateConversationState(conversationId, updates)

                if (!result.success) {
                    console.error('Failed to update conversation:', result.error)
                    toast.error(`Error: ${result.error || t('crm.inbox.layout.unknown')}`)
                } else {
                    toast.success(t('crm.inbox.layout.conversation_updated', { label: actionLabel }))
                    // Removed window.location.reload() to preserve Realtime connections.
                    // The UI will update via Postgres changes from the server.
                }
            } catch (err) {
                console.error('Exception calling server action:', err)
                toast.error(t('crm.inbox.layout.connection_error'))
            }
        }
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {/* GlobalMessageListener is mounted globally in b2b-agency-layout — no duplicate needed here */}
            <div className="flex flex-col h-full w-full">
                <AnimatePresence>
                    {isAgentMonitorVisible && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, y: -20 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="flex-none relative z-10"
                        >
                            <AgentMonitoringWidget className="pt-2 px-2" />
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex flex-1 min-h-0 w-full gap-3 relative">

                    {/* Left Pane */}
                    <div className="w-full md:w-[300px] lg:w-[320px] flex-none flex flex-col relative glass-card rounded-2xl overflow-hidden border-none shadow-xl">
                    <SidebarTabs
                        selectedConversationId={selectedConversationId}
                        onSelectConversation={setSelectedConversationId}
                        organizationId={organizationId}
                        userPermissions={memoizedPermissions}
                    />
                    <ConversationDropZones visible={!!activeDragId} />
                </div>

                {/* Center Pane */}
                <div className="flex-1 flex flex-col min-w-0 relative glass-card rounded-2xl overflow-hidden border-none shadow-xl">
                    {selectedConversationId ? (
                        <ChatArea
                            key={selectedConversationId} // Force remount to ensure clean subscription
                            conversationId={selectedConversationId}
                            onToggleContext={() => setIsContextOpen(!isContextOpen)}
                            isContextOpen={isContextOpen}
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4 text-center bg-dot-pattern">
                            <div className="h-20 w-20 rounded-2xl bg-muted/20 flex items-center justify-center">
                                <span className="text-4xl">📬</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-foreground">{t('crm.inbox.layout.ready_title')}</h3>
                                <p className="text-sm max-w-xs">{t('crm.inbox.layout.ready_desc')}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Pane */}
                <AnimatePresence>
                    {isContextOpen && (
                        <motion.div 
                            initial={{ width: 0, opacity: 0, x: 20 }}
                            animate={{ width: 320, opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="hidden lg:flex flex-none flex-col relative glass-card rounded-2xl overflow-hidden border-none shadow-xl"
                        >
                            <div className="w-[320px] h-full flex flex-col">
                                {selectedConversationId ? (
                                    <ContextDeck conversationId={selectedConversationId} />
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground text-center">
                                        <p>{t('crm.inbox.layout.select_chat')}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Drag Overlay - Mini card centered on cursor */}
                <DragOverlay dropAnimation={null}>
                    {activeDragId ? (
                        <div
                            className="w-[280px] p-3 bg-white/90 dark:bg-zinc-900/90 shadow-xl rounded-xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm pointer-events-none cursor-grabbing flex items-center gap-3"
                            style={{
                                // Reset transform origin to ensure scaling happens from center
                                transformOrigin: 'center center',
                                // Center the element on the pointer
                                transform: 'translate(-50%, -50%) scale(0.8)'
                            }}
                        >
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-bold shadow-sm border border-black/5 dark:border-white/10 flex-shrink-0">
                                💬
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{t('crm.inbox.layout.moving')}</p>
                                <p className="text-xs text-muted-foreground">{t('crm.inbox.layout.drop_to_change')}</p>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-pulse" />
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
            </div>
        </DndContext>
    )
}

