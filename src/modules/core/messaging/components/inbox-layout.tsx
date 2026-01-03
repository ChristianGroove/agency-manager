"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
// We will create these sub-components next
import { ConversationList } from "./conversation-list"
import { ChatArea } from "./chat-area"
import { ContextDeck } from "./context-deck"

export function InboxLayout() {
    const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null)
    const [isContextOpen, setIsContextOpen] = React.useState(true)

    return (
        <div className="grid h-full w-full grid-cols-12 divide-x divide-border bg-background shadow-sm border rounded-lg overflow-hidden">
            {/* Left Pane: Conversation List (3 cols) */}
            <div className="col-span-3 flex flex-col min-w-0 bg-muted/10 overflow-hidden">
                <ConversationList
                    selectedId={selectedConversationId}
                    onSelect={setSelectedConversationId}
                />
            </div>

            {/* Center Pane: Chat Area (Flexible) */}
            <div className={cn(
                "flex flex-col min-w-0 transition-all duration-300 overflow-hidden",
                isContextOpen ? "col-span-6" : "col-span-9"
            )}>
                {selectedConversationId ? (
                    <ChatArea
                        conversationId={selectedConversationId}
                        onToggleContext={() => setIsContextOpen(!isContextOpen)}
                        isContextOpen={isContextOpen}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        Select a conversation to start chatting
                    </div>
                )}
            </div>

            {/* Right Pane: Context Deck (3 cols) */}
            {isContextOpen && (
                <div className="col-span-3 flex flex-col min-w-0 border-l bg-background overflow-hidden">
                    {selectedConversationId ? (
                        <ContextDeck conversationId={selectedConversationId} />
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground">
                            Context details will appear here
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
