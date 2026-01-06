"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SplitText } from "@/components/ui/split-text"
// We will create these sub-components next
import { ConversationList } from "./conversation-list"
import { ChatArea } from "./chat-area"
import { ContextDeck } from "./context-deck"

export function InboxLayout() {
    const [selectedConversationId, setSelectedConversationId] = React.useState<string | null>(null)
    const [isContextOpen, setIsContextOpen] = React.useState(true)

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        <SplitText>Inbox</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">Centro de mensajería unificado</p>
                </div>
            </div>

            <div className="flex-1 grid w-full grid-cols-12 divide-x divide-border bg-background dark:bg-white/5 dark:backdrop-blur-md shadow-sm border dark:border-white/10 rounded-lg overflow-hidden min-h-0">
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
        </div>
    )
}
