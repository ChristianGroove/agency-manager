"use client"

import * as React from "react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { SidebarConversationList } from "./sidebar-conversation-list"
import { SidebarContactList } from "./sidebar-contact-list"
import { MessageSquare, Users2 } from "lucide-react"
import { useTranslation } from "@/modules/core/i18n/use-translation"

interface SidebarTabsProps {
    selectedConversationId: string | null
    onSelectConversation: (id: string | null) => void
    organizationId: string | null
    userPermissions: any
}

type TabType = 'conversations' | 'contacts'

export function SidebarTabs({ 
    selectedConversationId, 
    onSelectConversation,
    organizationId,
    userPermissions 
}: SidebarTabsProps) {
    const { t } = useTranslation()
    const [activeTab, setActiveTab] = React.useState<TabType>('conversations')

    // When a conversation is selected from contacts, we want to maybe auto-switch back?
    // User requested "multitab de 2 paneles".
    // Let's keep it simple: clicking a contact starts chat and selects it.
    // The parent layout will show the chat. We might want to switch tab back to 'conversations' 
    // to show the active chat in the list, but let's stick to the requested dual panel behavior first.

    const handleConversationSelect = (id: string | null) => {
        onSelectConversation(id)
        // Optionally switch back to conversations tab if a chat is started from contacts
        if (activeTab === 'contacts' && id) {
            setActiveTab('conversations')
        }
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Top Navigation Tabs - High-end Button Switcher */}
            <div className="px-4 py-3 shrink-0 border-b border-border/10 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.06)] z-10">
                <div className="flex p-1 bg-gray-100/50 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl">
                    <button
                        onClick={() => setActiveTab('conversations')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all z-10",
                            activeTab === 'conversations'
                                ? "bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm"
                                : "text-muted-foreground hover:bg-gray-200/50 dark:hover:bg-white/5 hover:text-foreground"
                        )}
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t('crm.inbox.sidebar.tabs.conversations')}
                    </button>
                    <button
                        onClick={() => setActiveTab('contacts')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all z-10",
                            activeTab === 'contacts'
                                ? "bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm"
                                : "text-muted-foreground hover:bg-gray-200/50 dark:hover:bg-white/5 hover:text-foreground"
                        )}
                    >
                        <Users2 className="h-3.5 w-3.5" />
                        {t('crm.inbox.sidebar.tabs.contacts')}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 relative">
                <div className={cn("h-full", activeTab !== 'conversations' && "hidden")}>
                    <SidebarConversationList
                        selectedId={selectedConversationId}
                        onSelect={handleConversationSelect}
                        organizationId={organizationId}
                        userPermissions={userPermissions}
                    />
                </div>

                <div className={cn("h-full", activeTab !== 'contacts' && "hidden")}>
                    <SidebarContactList
                        onSelectConversation={handleConversationSelect}
                        organizationId={organizationId}
                        userPermissions={userPermissions}
                    />
                </div>
            </div>
        </div>
    )
}
