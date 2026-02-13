"use client"

import * as React from "react"
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
// import { ConversationList } from "./conversation-list" // Deprecated
import { SidebarTabs } from "./sidebar/sidebar-tabs"
import { ChatArea } from "./chat-area"
import { ContextDeck } from "./context-deck"
import { ConversationDropZones } from "./conversation-drop-zones"
import { updateConversationState } from "../conversation-management-actions"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n/use-translation"

interface InboxLayoutProps {
    initialConversationId?: string | null
}

export function InboxLayout({ initialConversationId }: InboxLayoutProps) {
    const { t } = useTranslation()
    const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(initialConversationId || null)
    const [isContextOpen, setIsContextOpen] = React.useState(true)
    const [activeDragId, setActiveDragId] = React.useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

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
                    window.location.reload()
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
            <div className="flex h-full w-full bg-background/95 dark:bg-zinc-950/90 backdrop-blur-xl overflow-hidden relative rounded-2xl border border-border/50 shadow-2xl shadow-black/5 dark:shadow-black/20">

                {/* Left Pane */}
                <div className="w-full md:w-[300px] lg:w-[320px] flex-none border-r border-border flex flex-col bg-white dark:bg-zinc-900/50 relative">
                    <SidebarTabs
                        selectedConversationId={selectedConversationId}
                        onSelectConversation={setSelectedConversationId}
                    />
                    <ConversationDropZones visible={!!activeDragId} />
                </div>

                {/* Center Pane */}
                <div className="flex-1 flex flex-col min-w-0 bg-muted/5 dark:bg-zinc-950 relative">
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
                {isContextOpen && (
                    <div className="hidden lg:flex w-[320px] flex-none border-l border-border flex-col bg-background dark:bg-zinc-900">
                        {selectedConversationId ? (
                            <ContextDeck conversationId={selectedConversationId} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground text-center">
                                <p>{t('crm.inbox.layout.select_chat')}</p>
                            </div>
                        )}
                    </div>
                )}

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
        </DndContext>
    )
}
