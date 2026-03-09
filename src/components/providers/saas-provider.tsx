"use client"

import { createContext, useContext, ReactNode } from "react"
import { SaasApp } from "@/types/saas"

interface SaaSContextType {
    app: SaasApp | null
    subscription: any | null
    orgDetails: any | null
}

const SaaSContext = createContext<SaaSContextType | null>(null)

export function useSaaSData() {
    const context = useContext(SaaSContext)
    if (!context) {
        throw new Error("useSaaSData must be used within a SaaSProvider")
    }
    return context
}

export function SaaSProvider({
    children,
    initialData
}: {
    children: ReactNode,
    initialData: SaaSContextType
}) {
    return (
        <SaaSContext.Provider value={initialData}>
            {children}
        </SaaSContext.Provider>
    )
}
