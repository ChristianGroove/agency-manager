"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react"

interface InboxContextType {
    leadsCache: Record<string, any>;
    updateLeadCache: (conversationId: string, data: any) => void;
    cartsCache: Record<string, any>;
    updateCartCache: (leadId: string, data: any) => void;
    activeModules: string[];
    setActiveModules: (modules: string[]) => void;
    spaceCategory: string | null;
    setSpaceCategory: (category: string | null) => void;
    currentAssignee?: string | null;
    agents: any[];
    setAgents: (agents: any[]) => void;
    onAssigned?: () => void;
    tick?: number;
    templates: any[];
    setTemplates: (templates: any[]) => void;
    catalogCategories: any[];
    setCatalogCategories: (categories: any[]) => void;
    initialProducts: any[];
    setInitialProducts: (products: any[]) => void;
    allTags: any[];
    setAllTags: (tags: any[]) => void;
    updateAgent: (agentId: string, data: any) => void;
    refreshAgents: () => Promise<void>;
}

const InboxContext = createContext<InboxContextType | undefined>(undefined)

export function InboxProvider({ children }: { children: ReactNode }) {
    const [leadsCache, setLeadsCache] = useState<Record<string, any>>({})
    const [cartsCache, setCartsCache] = useState<Record<string, any>>({})
    const [activeModules, setActiveModules] = useState<string[]>([])
    const [spaceCategory, setSpaceCategory] = useState<string | null>(null)
    const [agents, setAgents] = useState<any[]>([])
    const [templates, setTemplates] = useState<any[]>([])
    const [catalogCategories, setCatalogCategories] = useState<any[]>([])
    const [initialProducts, setInitialProducts] = React.useState<any[]>([])
    const [allTags, setAllTags] = React.useState<any[]>([])
    const [tick, setTick] = React.useState(0)

    // Master Ticker: Pulse every 60s to force re-calculation of relative times (like online status)
    React.useEffect(() => {
        const interval = setInterval(() => {
            setTick(prev => prev + 1)
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    const updateLeadCache = useCallback((conversationId: string, data: any) => {
        setLeadsCache(prev => ({ 
            ...prev, 
            [conversationId]: {
                ...prev[conversationId],
                ...data,
                _timestamp: Date.now()
            } 
        }))
    }, [])

    const updateCartCache = useCallback((leadId: string, data: any) => {
        setCartsCache(prev => ({ 
            ...prev, 
            [leadId]: {
                ...prev[leadId],
                ...data,
                _timestamp: Date.now()
            } 
        }))
    }, [])

    const updateAgent = useCallback((agentId: string, data: any) => {
        setAgents(prev => prev.map(agent => 
            agent.agent_id === agentId 
                ? { ...agent, users: { ...agent.users, raw_user_meta_data: { ...agent.users.raw_user_meta_data, ...data } }, ...data }
                : agent
        ))
    }, [])

    const refreshAgents = useCallback(async () => {
        const { getAgentsWorkload } = await import("../assignment-actions")
        const result = await getAgentsWorkload()
        if (result.success) {
            setAgents(result.data)
        }
    }, [])

    return (
        <InboxContext.Provider value={{
            leadsCache,
            updateLeadCache,
            cartsCache,
            updateCartCache,
            activeModules,
            setActiveModules,
            spaceCategory,
            setSpaceCategory,
            agents,
            setAgents,
            templates,
            setTemplates,
            catalogCategories,
            setCatalogCategories,
            initialProducts,
            setInitialProducts,
            allTags,
            setAllTags,
            updateAgent,
            refreshAgents,
            tick
        }}>
            {children}
        </InboxContext.Provider>
    )
}

export const useInboxContext = () => {
    const context = useContext(InboxContext)
    if (!context) throw new Error("useInboxContext must be used within InboxProvider")
    return context
}

export const useSafeInboxContext = () => {
    return useContext(InboxContext)
}
