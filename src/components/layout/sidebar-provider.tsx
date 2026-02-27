"use client"

import React, { createContext, useContext, useState, useEffect, useMemo } from "react"

interface SidebarContextType {
    isCollapsed: boolean
    toggleCollapse: () => void
    setIsCollapsed: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // Initialize from local storage if available to prevent flicker
    const [isCollapsed, setIsCollapsedState] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        const stored = localStorage.getItem("sidebar_collapsed")
        if (stored) {
            setIsCollapsedState(stored === "true")
        }
    }, [])

    const setIsCollapsed = (value: boolean) => {
        setIsCollapsedState(value)
        localStorage.setItem("sidebar_collapsed", String(value))
    }

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed)
    }

    // Prevent hydration mismatch by rendering default until mounted
    // OR just live with it for a frame. Layout shift is minimal if default is expanded.

    const contextValue = useMemo(() => ({
        isCollapsed,
        toggleCollapse,
        setIsCollapsed
    }), [isCollapsed])

    return (
        <SidebarContext.Provider value={contextValue}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider")
    }
    return context
}
