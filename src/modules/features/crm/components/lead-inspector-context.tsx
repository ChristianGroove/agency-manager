'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface LeadInspectorContextType {
    isOpen: boolean
    leadId: string | null
    defaultTab: 'info' | 'chat' | 'activity'
    openInspector: (leadId: string, defaultTab?: 'info' | 'chat' | 'activity') => void
    closeInspector: () => void
}

const LeadInspectorContext = createContext<LeadInspectorContextType | null>(null)

export function LeadInspectorProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [leadId, setLeadId] = useState<string | null>(null)
    const [defaultTab, setDefaultTab] = useState<'info' | 'chat' | 'activity'>('info')

    const openInspector = useCallback((id: string, tab: 'info' | 'chat' | 'activity' = 'info') => {
        setLeadId(id)
        setDefaultTab(tab)
        setIsOpen(true)
    }, [])

    const closeInspector = useCallback(() => {
        setIsOpen(false)
        // Keep leadId for animation purposes, clear after close
        setTimeout(() => setLeadId(null), 300)
    }, [])

    return (
        <LeadInspectorContext.Provider value={{ isOpen, leadId, defaultTab, openInspector, closeInspector }}>
            {children}
        </LeadInspectorContext.Provider>
    )
}

export function useLeadInspector() {
    const context = useContext(LeadInspectorContext)
    if (!context) {
        throw new Error('useLeadInspector must be used within LeadInspectorProvider')
    }
    return context
}
