"use client"

import * as React from "react"
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
// SplitText removed as title is gone
import { ConversationList } from "./conversation-list"
import { ChatArea } from "./chat-area"
import { ContextDeck } from "./context-deck"

export function InboxLayout() {
    const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null)
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over) {
            console.log(`Dropped ${active.id} over ${over.id}`)
            // TODO: Implement actual assignment or archive logic
        }
        setActiveDragId(null)
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full bg-background dark:bg-zinc-950/50 backdrop-blur-sm overflow-hidden relative rounded-2xl border border-border shadow-sm">

                {/* Left Pane: Conversation List (Fixed Width) */}
                <div className="w-full md:w-[320px] lg:w-[380px] flex-none border-r border-border flex flex-col bg-white dark:bg-zinc-900/50">
                    <ConversationList
                        selectedId={selectedConversationId}
                        onSelect={setSelectedConversationId}
                    />
                </div>

                {/* Center Pane: Chat Area (Fluid) */}
                <div className="flex-1 flex flex-col min-w-0 bg-muted/5 dark:bg-zinc-950 relative">
                    {selectedConversationId ? (
                        <ChatArea
                            conversationId={selectedConversationId}
                            onToggleContext={() => setIsContextOpen(!isContextOpen)}
                            isContextOpen={isContextOpen}
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-4 p-8 text-center bg-dot-pattern">
                            <div className="h-20 w-20 rounded-2xl bg-muted/20 flex items-center justify-center">
                                <span className="text-4xl">📬</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-foreground">Tu Inbox está listo</h3>
                                <p className="text-sm max-w-xs mx-auto mt-2">Selecciona una conversación de la izquierda para comenzar a chatear.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Pane: Context Deck (Fixed Width) */}
                {isContextOpen && (
                    <div className="hidden lg:flex w-[350px] flex-none border-l border-border flex-col bg-background dark:bg-zinc-900 border-l">
                        {selectedConversationId ? (
                            <ContextDeck conversationId={selectedConversationId} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                                <p>Selecciona un chat para ver detalles</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Drag Overlay Portal */}
                <DragOverlay>
                    {activeDragId ? (
                        <div className="p-4 bg-white dark:bg-zinc-900 shadow-2xl rounded-xl border border-border w-[300px] opacity-90 backdrop-blur-sm cursor-grabbing transform scale-105 rotate-2 ring-2 ring-brand-pink/50">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-brand-pink flex items-center justify-center text-white shadow-md">
                                    <span className="text-lg">💬</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm">Moviendo chat...</p>
                                    <p className="text-xs text-muted-foreground truncate">Arrastra para asignar o resolver</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    )
}
