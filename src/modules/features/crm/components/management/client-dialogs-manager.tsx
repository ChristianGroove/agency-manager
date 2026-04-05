"use client"

import React from "react"
import { CreateLeadSheet as CreateClientSheet } from "../create-lead-sheet"
import { ClientManagementSheet } from "./client-management-sheet"
import { ConnectivitySheet } from "@/components/sheets/connectivity-sheet"
import { PortalGovernanceSheet } from "@/components/sheets/portal-governance-sheet"
import { UnifiedCommunicationModal } from "@/modules/core/communication/components/unified-communication-modal"
import { QuickInvoicesModal } from "./quick-invoices-modal"
// NotesModal is now integrated or removed

export function ClientDialogsManager({
    managementOpen,
    setManagementOpen,
    selectedClientForManagement,
    managementInitialTab,
    connectivityOpen,
    setConnectivityOpen,
    clientForConnectivity,
    portalOpen,
    setPortalOpen,
    clientForPortal,
    isComModalOpen,
    setIsComModalOpen,
    selectedClientForCom,
    invoicesOpen,
    setInvoicesOpen,
    clientForInvoices,
    notesOpen,
    setNotesOpen,
    clientForNotes,
    onSuccess,
    globalSettings = {},
    spaceType
}: {
    managementOpen: boolean
    setManagementOpen: (val: boolean) => void
    selectedClientForManagement: any
    managementInitialTab: string
    connectivityOpen: boolean
    setConnectivityOpen: (val: boolean) => void
    clientForConnectivity: any
    portalOpen: boolean
    setPortalOpen: (val: boolean) => void
    clientForPortal: any
    isComModalOpen: boolean
    setIsComModalOpen: (val: boolean) => void
    selectedClientForCom: any
    invoicesOpen: boolean
    setInvoicesOpen: (val: boolean) => void
    clientForInvoices: any
    notesOpen?: boolean
    setNotesOpen?: (val: boolean) => void
    clientForNotes?: any
    onSuccess: () => void
    globalSettings?: any
    spaceType?: string
}) {
    return (
        <>
            <ClientManagementSheet
                clientId={selectedClientForManagement?.id}
                open={managementOpen}
                onOpenChange={setManagementOpen}
                initialData={selectedClientForManagement}
                initialTab={managementInitialTab}
                spaceType={spaceType}
                onSuccess={onSuccess}
            />

            <ConnectivitySheet
                open={connectivityOpen}
                onOpenChange={setConnectivityOpen}
                client={clientForConnectivity}
                services={clientForConnectivity?.services || []}
            />

            <PortalGovernanceSheet
                open={portalOpen}
                onOpenChange={setPortalOpen}
                client={clientForPortal}
                globalSettings={globalSettings}
            />

            <UnifiedCommunicationModal
                isOpen={isComModalOpen}
                onOpenChange={setIsComModalOpen}
                client={selectedClientForCom}
            />

            <QuickInvoicesModal
                isOpen={invoicesOpen}
                onOpenChange={setInvoicesOpen}
                client={clientForInvoices}
                onSuccess={onSuccess}
            />

            {/* NotesModal REMOVED */}
        </>
    )
}
