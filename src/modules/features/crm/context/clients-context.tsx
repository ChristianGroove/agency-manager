'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { VERTICAL_REGISTRY, VerticalType } from "@/modules/core/organizations/vertical-registry"

interface ClientsContextType {
    searchTerm: string
    setSearchTerm: (q: string) => void
    activeFilter: string
    setActiveFilter: (f: string) => void
    viewMode: 'grid' | 'list' | 'compact'
    setViewMode: (mode: 'grid' | 'list' | 'compact') => void
    selectedIds: Set<string>
    setSelectedIds: (ids: Set<string>) => void
    isDeleting: boolean
    setIsDeleting: (is: boolean) => void
    spaceType: any
    applyFilters: (q: string, f: string) => void
    toggleSelection: (id: string) => void
    toggleAll: (ids: string[]) => void
}

const ClientsContext = createContext<ClientsContextType | null>(null)

export function ClientsProvider({ 
    children, 
    initialSearch = '', 
    initialFilter = 'all', 
    initialSpaceType = 'agency' 
}: { 
    children: ReactNode, 
    initialSearch?: string, 
    initialFilter?: string, 
    initialSpaceType?: any 
}) {
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)
    const [searchTerm, setSearchTerm] = useState(initialSearch)
    const [activeFilter, setActiveFilter] = useState(initialFilter)
    
    const applyFilters = (q: string, f: string) => {
        setSearchTerm(q)
        setActiveFilter(f)
    }

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAll = (ids: string[]) => {
        setSelectedIds(prev => {
            if (prev.size === ids.length) return new Set()
            return new Set(ids)
        })
    }

    return (
        <ClientsContext.Provider value={{ 
            searchTerm, 
            setSearchTerm, 
            activeFilter, 
            setActiveFilter,
            viewMode, 
            setViewMode, 
            selectedIds, 
            setSelectedIds, 
            isDeleting, 
            setIsDeleting,
            spaceType: initialSpaceType,
            applyFilters,
            toggleSelection,
            toggleAll
        }}>
            {children}
        </ClientsContext.Provider>
    )
}

export function useClients() {
    const context = useContext(ClientsContext)
    if (!context) {
        throw new Error('useClients must be used within ClientsProvider')
    }
    return context
}
