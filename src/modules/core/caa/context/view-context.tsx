"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { ActionDefinition, ViewContextState } from "../types"

interface ViewContextType {
    currentContext: ViewContextState | null
    registerView: (context: ViewContextState) => void
    clearContext: () => void
}

const ViewContext = createContext<ViewContextType | undefined>(undefined)

export function ViewContextProvider({ children }: { children: React.ReactNode }) {
    const [currentContext, setCurrentContext] = useState<ViewContextState | null>(null)

    const registerView = (context: ViewContextState) => {
        // Only update if ID changes to prevent loops
        if (currentContext?.viewId !== context.viewId) {
            console.log(`[CAA] Registering View Context: ${context.viewId}`)
            setCurrentContext(context)
        }
    }

    const clearContext = () => {
        setCurrentContext(null)
    }

    return (
        <ViewContext.Provider value={{ currentContext, registerView, clearContext }}>
            {children}
        </ViewContext.Provider>
    )
}

export function useViewContext() {
    const context = useContext(ViewContext)
    if (!context) {
        throw new Error("useViewContext must be used within a ViewContextProvider")
    }
    return context
}

// Hook for individual pages to register themselves
export function useRegisterView(config: ViewContextState) {
    const { registerView } = useViewContext()

    useEffect(() => {
        registerView(config)
        // Ideally we might want cleanup, but in Next.js switching pages naturally handles it
    }, [config.viewId]) // Only re-register if ID changes
}
