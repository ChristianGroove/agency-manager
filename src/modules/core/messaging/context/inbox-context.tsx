"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react"
import { getCategories } from "@/modules/features/catalog/categories-actions"
import { searchCatalog } from "@/modules/features/crm/services/logic/deal-actions"

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
    refreshTemplates: () => Promise<void>;
    isTemplatesLoading: boolean;
    catalogCategories: any[];
    setCatalogCategories: (categories: any[]) => void;
    initialProducts: any[];
    setInitialProducts: (products: any[]) => void;
    refreshCatalog: () => Promise<void>;
    isCatalogLoading: boolean;
    allTags: any[];
    setAllTags: (tags: any[]) => void;
    refreshTags: () => Promise<void>;
    isTagsLoading: boolean;
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
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(false)
    const [catalogCategories, setCatalogCategories] = useState<any[]>([])
    const [initialProducts, setInitialProducts] = React.useState<any[]>([])
    const [isCatalogLoading, setIsCatalogLoading] = useState(false)
    const [allTags, setAllTags] = React.useState<any[]>([])
    const [isTagsLoading, setIsTagsLoading] = useState(false)
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

    const refreshTags = useCallback(async () => {
        if (isTagsLoading) return;
        setIsTagsLoading(true)
        try {
            const { getTags } = await import("@/modules/features/crm/services/logic/tags-actions")
            const tags = await getTags()
            setAllTags(tags)
        } finally {
            setIsTagsLoading(false)
        }
    }, [isTagsLoading])

    const refreshTemplates = useCallback(async () => {
        if (isTemplatesLoading) return;
        setIsTemplatesLoading(true)
        try {
            const { getTemplates } = await import("../actions/templates")
            const all = await getTemplates()
            setTemplates(all)
        } finally {
            setIsTemplatesLoading(false)
        }
    }, [isTemplatesLoading])

    const refreshCatalog = useCallback(async () => {
        if (isCatalogLoading) return;
        setIsCatalogLoading(true)
        try {
            const [cats, products] = await Promise.all([
                getCategories(),
                searchCatalog("", "all", 0)
            ])
            if (cats) setCatalogCategories(cats)
            if (products?.success) setInitialProducts(products.data || [])
        } finally {
            setIsCatalogLoading(false)
        }
    }, [isCatalogLoading])

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
            refreshTemplates,
            isTemplatesLoading,
            catalogCategories,
            setCatalogCategories,
            initialProducts,
            setInitialProducts,
            refreshCatalog,
            isCatalogLoading,
            allTags,
            setAllTags,
            refreshTags,
            isTagsLoading,
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
