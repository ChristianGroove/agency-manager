"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"

interface GlobalInboxContextType {
    isOpen: boolean
    activeConversationId: string | null
    openInbox: (conversationId?: string) => void
    closeInbox: () => void
    toggleInbox: () => void
}

const GlobalInboxContext = createContext<GlobalInboxContextType | undefined>(undefined)

export function GlobalInboxProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
    const pathname = usePathname()
    const router = useRouter()

    const openInbox = useCallback((conversationId?: string) => {
        // If we are already on the inbox page, just navigate to the conversation there
        // This handles proper deep linking if the user is already on the page
        if (pathname?.startsWith('/platform/inbox')) {
            // If conversationId is provided, might want to set URL param
            // But usually this Context is for the overlay.
            // If we are on inbox page, overlay should NOT open.
            console.log("Already on Inbox page, ignoring overlay open request.")
            return
        }

        if (conversationId) {
            setActiveConversationId(conversationId)
        }
        setIsOpen(true)
    }, [pathname])

    const closeInbox = useCallback(() => {
        setIsOpen(false)
        setActiveConversationId(null)
    }, [])

    const toggleInbox = useCallback(() => {
        if (pathname?.startsWith('/platform/inbox')) return
        setIsOpen(prev => !prev)
    }, [pathname])

    return (
        <GlobalInboxContext.Provider value={{ isOpen, activeConversationId, openInbox, closeInbox, toggleInbox }}>
            {children}
        </GlobalInboxContext.Provider>
    )
}

export const useGlobalInbox = () => {
    const context = useContext(GlobalInboxContext)
    if (context === undefined) {
        throw new Error("useGlobalInbox must be used within a GlobalInboxProvider")
    }
    return context
}
