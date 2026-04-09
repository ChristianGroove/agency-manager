"use client"

import { createContext, useContext, ReactNode } from "react"
import { SaasApp } from "@/types/saas"
import { DynamicSpaceConfig } from "@/modules/core/organizations/capabilities-registry"

interface SaaSContextType {
    app: SaasApp | null
    subscription: any | null
    orgDetails: any | null
    uiConfig: DynamicSpaceConfig | null
    isSuspended: boolean
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
    initialData: Omit<SaaSContextType, 'isSuspended'>
}) {
    // Derivar estado de suspensión: Bloqueamos si está cancelada, impagada o suspendida por mora
    const suspendedStatuses = ['canceled', 'unpaid', 'suspended']
    const isSuspended = initialData.subscription?.status
        ? suspendedStatuses.includes(initialData.subscription.status)
        : false

    return (
        <SaaSContext.Provider value={{ ...initialData, isSuspended }}>
            {children}
        </SaaSContext.Provider>
    )
}
