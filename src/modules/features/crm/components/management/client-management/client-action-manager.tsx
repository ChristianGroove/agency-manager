import { CreateServiceSheet } from "@/modules/features/billing/components/create-service-sheet"
import { CreateInvoiceSheet } from "@/modules/features/billing/components/create-invoice-sheet"
import { CreateHostingSheet } from "@/modules/features/hosting/components/create-hosting-sheet"
import { ServiceDetailModal } from "@/modules/features/billing/components/service-detail-modal"
import { UnifiedCommunicationModal } from "@/modules/infrastructure/communication/components/unified-communication-modal"
import { Client } from "@/types"

interface ClientActionManagerProps {
    client: Client
    settings: any
    
    // States
    isServiceSheetOpen: boolean
    setIsServiceSheetOpen: (open: boolean) => void
    isInvoiceSheetOpen: boolean
    setIsInvoiceSheetOpen: (open: boolean) => void
    isHostingSheetOpen: boolean
    setIsHostingSheetOpen: (open: boolean) => void
    isServiceDetailOpen: boolean
    setIsServiceDetailOpen: (open: boolean) => void
    isCommunicationModalOpen: boolean
    setIsCommunicationModalOpen: (open: boolean) => void
    
    // Selection
    serviceToEdit: any
    selectedService: any
    hostingToEdit: any
    communicationContext: any
    
    // Verticals
    visibleTabs: string[]
    
    // Handlers
    onSuccess: () => void
}

export function ClientActionManager({
    client,
    settings,
    isServiceSheetOpen,
    setIsServiceSheetOpen,
    isInvoiceSheetOpen,
    setIsInvoiceSheetOpen,
    isHostingSheetOpen,
    setIsHostingSheetOpen,
    isServiceDetailOpen,
    setIsServiceDetailOpen,
    isCommunicationModalOpen,
    setIsCommunicationModalOpen,
    serviceToEdit,
    selectedService,
    hostingToEdit,
    communicationContext,
    visibleTabs,
    onSuccess
}: ClientActionManagerProps) {
    return (
        <>
            {visibleTabs.includes('services') && (
                <CreateServiceSheet
                    clientId={client.id}
                    clientName={client.name}
                    open={isServiceSheetOpen}
                    onOpenChange={setIsServiceSheetOpen}
                    serviceToEdit={serviceToEdit}
                    onSuccess={onSuccess}
                    trigger={<span className="hidden" />}
                />
            )}
            
            {visibleTabs.includes('billing') && (
                <CreateInvoiceSheet
                    clientId={client.id}
                    clientName={client.name}
                    open={isInvoiceSheetOpen}
                    onOpenChange={setIsInvoiceSheetOpen}
                    onSuccess={onSuccess}
                    trigger={<span className="hidden" />}
                />
            )}
            
            {visibleTabs.includes('hosting') && (
                <CreateHostingSheet
                    clientId={client.id}
                    open={isHostingSheetOpen}
                    onOpenChange={setIsHostingSheetOpen}
                    accountToEdit={hostingToEdit}
                    onSuccess={onSuccess}
                />
            )}
            
            <ServiceDetailModal
                isOpen={isServiceDetailOpen}
                onOpenChange={setIsServiceDetailOpen}
                service={selectedService}
            />
            
            <UnifiedCommunicationModal
                isOpen={isCommunicationModalOpen}
                onOpenChange={setIsCommunicationModalOpen}
                client={{
                    id: client.id,
                    name: client.name,
                    email: client.email || undefined,
                    phone: client.phone || undefined,
                    company_name: client.company_name || undefined,
                    invoices: client.invoices,
                    quotes: client.quotes,
                    portal_token: (client as any).portal_token,
                    portal_short_token: (client as any).portal_short_token
                }}
                context={communicationContext}
                settings={settings}
            />
        </>
    )
}
