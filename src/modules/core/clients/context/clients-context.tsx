"use client"

import React, { createContext, useContext, useState, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ViewMode } from "@/components/shared/view-toggle"
import { VerticalType } from "@/modules/core/organizations/vertical-registry"

interface ClientsContextType {
    // State
    searchTerm: string
    activeFilter: string
    viewMode: ViewMode
    selectedIds: Set<string>
    isDeleting: boolean
    spaceType: VerticalType
    
    // Actions
    setSearchTerm: (term: string) => void
    setActiveFilter: (filter: string) => void
    setViewMode: (mode: ViewMode) => void
    setSelectedIds: (ids: Set<string>) => void
    toggleSelection: (id: string) => void
    toggleAll: (allIds: string[]) => void
    clearSelection: () => void
    applyFilters: (newSearch: string, newFilter: string) => void
    setIsDeleting: (val: boolean) => void
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined)

export function ClientsProvider({ 
    children, 
    initialSearch, 
    initialFilter, 
    initialSpaceType 
}: { 
    children: React.ReactNode
    initialSearch: string
    initialFilter: string
    initialSpaceType: VerticalType
}) {
    const router = useRouter()
    const searchParamsOrigin = useSearchParams()

    const [searchTerm, setSearchTerm] = useState(initialSearch)
    const [activeFilter, setActiveFilter] = useState(initialFilter)
    const [viewMode, setViewModeState] = useState<ViewMode>('grid')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    const setViewMode = useCallback((mode: ViewMode) => {
        setViewModeState(mode)
        localStorage.setItem('clients-view-mode', mode)
    }, [])

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const toggleAll = useCallback((allIds: string[]) => {
        setSelectedIds(prev => {
            if (prev.size === allIds.length) return new Set()
            return new Set(allIds)
        })
    }, [])

    const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

    const applyFilters = useCallback((newSearch: string, newFilter: string) => {
        const params = new URLSearchParams(searchParamsOrigin.toString())
        params.set('page', '1')
        params.set('search', newSearch)
        params.set('filter', newFilter)
        router.push(`?${params.toString()}`)
    }, [router, searchParamsOrigin])

    const value = useMemo(() => ({
        searchTerm,
        activeFilter,
        viewMode,
        selectedIds,
        isDeleting,
        spaceType: initialSpaceType,
        setSearchTerm,
        setActiveFilter,
        setViewMode,
        setSelectedIds,
        toggleSelection,
        toggleAll,
        clearSelection,
        applyFilters,
        setIsDeleting
    }), [searchTerm, activeFilter, viewMode, selectedIds, isDeleting, initialSpaceType, toggleSelection, toggleAll, clearSelection, applyFilters])

    return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
}

export function useClients() {
    const context = useContext(ClientsContext)
    if (context === undefined) {
        throw new Error("useClients must be used within a ClientsProvider")
    }
    return context
}
