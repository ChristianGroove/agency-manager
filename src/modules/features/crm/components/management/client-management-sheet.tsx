"use client"

import React, { useState, useEffect } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Client } from "@/types"
import { Loader2, UserCircle, CalendarClock, Server, FileText, Globe, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useSpacePolicies } from "@/modules/flows/hooks/use-space-policies"

// Hooks
import { useClientManagement } from "../../hooks/management/use-client-management"

// Modular Components
import { ClientHeader } from "./client-management/client-header"
import { ClientActionManager } from "./client-management/client-action-manager"
import { ProfileTab } from "./client-management/tabs/profile-tab"
import { ServicesTab } from "./client-management/tabs/services-tab"
import { BillingTab } from "./client-management/tabs/billing-tab"
import { HostingTab } from "./client-management/tabs/hosting-tab"

// Reusable Shared Tabs
import { LeadTimelineTab as ClientTimeline } from "../lead-detail-tabs/timeline-tab"
import { RestoOrdersTab } from "./resto-orders-tab"

interface ClientManagementSheetProps {
    clientId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: Client
    initialTab?: string
    spaceType?: string
    onSuccess?: () => void
}

export function ClientManagementSheet({ 
    clientId, 
    open, 
    onOpenChange, 
    initialData, 
    initialTab = "info", 
    spaceType = "agency", 
    onSuccess 
}: ClientManagementSheetProps) {
    const { t } = useTranslation()
    const { config } = useSpacePolicies(spaceType)
    
    // Core Logic Hook
    const management = useClientManagement(clientId, open, initialData)
    
    // UI Local State
    const [activeTab, setActiveTab] = useState(initialTab)
    const [isServiceSheetOpen, setIsServiceSheetOpen] = useState(false)
    const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false)
    const [isHostingSheetOpen, setIsHostingSheetOpen] = useState(false)
    const [isServiceDetailOpen, setIsServiceDetailOpen] = useState(false)
    const [isCommunicationModalOpen, setIsCommunicationModalOpen] = useState(false)
    
    // Selection for Modals
    const [serviceToEdit, setServiceToEdit] = useState<any>(null)
    const [selectedService, setSelectedService] = useState<any>(null)
    const [hostingToEdit, setHostingToEdit] = useState<any>(null)
    const [communicationContext, setCommunicationContext] = useState<any>(undefined)

    useEffect(() => {
        if (open) setActiveTab(initialTab)
    }, [open, initialTab])

    const handleSuccessCallback = () => {
        management.refresh()
        if (onSuccess) onSuccess()
    }

    if (!management.client && management.loading) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-2xl flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </SheetContent>
            </Sheet>
        )
    }

    if (!management.client) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-950/80 backdrop-blur-xl"
            >
                <div className="flex flex-col h-full bg-slate-50/50 dark:bg-transparent">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Gestión de Contacto: {management.client.name}</SheetTitle>
                    </SheetHeader>

                    <ClientHeader client={management.client} />

                    <div className="flex-1 overflow-hidden flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-8 border-b bg-white/50 dark:bg-white/5 backdrop-blur-sm sticky top-0 z-10">
                                <TabsList className="bg-transparent p-0 w-full justify-start h-auto gap-8">
                                    {config.management.visibleTabs.includes('info') && (
                                        <TabsTrigger value="info" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <UserCircle className="h-4 w-4 mr-2" /> Perfil
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('activity') && (
                                        <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <CalendarClock className="h-4 w-4 mr-2" /> Actividad
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('services') && (
                                        <TabsTrigger value="services" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <Server className="h-4 w-4 mr-2" /> Servicios
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('billing') && (
                                        <TabsTrigger value="billing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <FileText className="h-4 w-4 mr-2" /> Facturación
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('hosting') && (
                                        <TabsTrigger value="hosting" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <Globe className="h-4 w-4 mr-2" /> Hosting
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('orders') && (
                                        <TabsTrigger value="orders" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <FileText className="h-4 w-4 mr-2" /> Pedidos
                                        </TabsTrigger>
                                    )}
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                                <TabsContent value="info">
                                    <ProfileTab 
                                        client={management.client} 
                                        editForm={management.editForm} 
                                        setEditForm={management.setEditForm} 
                                        onLogoUpload={management.handleLogoUpload} 
                                        visibleSections={config.management.profileSections}
                                    />
                                </TabsContent>
                                
                                <TabsContent value="activity">
                                    <div className="bg-white dark:bg-white/5 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-white/10">
                                        <ClientTimeline activities={(management.client as any).activities || []} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="services">
                                    <ServicesTab 
                                        client={management.client} 
                                        onEditService={(s) => { setServiceToEdit(s); setIsServiceSheetOpen(true); }} 
                                        onDeleteService={() => {}} // Not implemented in Hook yet
                                        onPauseService={management.handlePauseService}
                                        onDetailService={(s) => { setSelectedService(s); setIsServiceDetailOpen(true); }}
                                    />
                                </TabsContent>

                                <TabsContent value="billing">
                                    <BillingTab 
                                        client={management.client} 
                                        onMarkPaid={management.handleMarkInvoicePaid} 
                                        onShare={(inv) => { setCommunicationContext({ type: 'invoice', data: inv }); setIsCommunicationModalOpen(true); }}
                                    />
                                </TabsContent>

                                <TabsContent value="hosting">
                                    <HostingTab 
                                        client={management.client} 
                                        onEditHosting={(acc) => { setHostingToEdit(acc); setIsHostingSheetOpen(true); }} 
                                    />
                                </TabsContent>

                                {spaceType === 'resto' && (
                                    <TabsContent value="orders">
                                        <RestoOrdersTab orgId={management.client.organization_id} clientId={management.client.id} />
                                    </TabsContent>
                                )}
                            </div>
                        </Tabs>

                        <SheetFooter className="border-t p-6 bg-white dark:bg-slate-950/80 backdrop-blur-md flex-row justify-between items-center flex-none z-20">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cerrar</Button>

                            {activeTab === 'info' && (
                                <Button onClick={management.handleUpdateProfile} disabled={management.saving} className="rounded-xl px-8 gap-2">
                                    {management.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Guardar Perfil
                                </Button>
                            )}

                            {activeTab === 'services' && (
                                <Button onClick={() => { setServiceToEdit(null); setIsServiceSheetOpen(true); }} className="rounded-xl">+ Nuevo Servicio</Button>
                            )}

                            {activeTab === 'billing' && (
                                <Button onClick={() => setIsInvoiceSheetOpen(true)} className="rounded-xl">+ Crear Factura</Button>
                            )}

                            {activeTab === 'hosting' && (
                                <Button onClick={() => { setHostingToEdit(null); setIsHostingSheetOpen(true); }} className="rounded-xl">+ Activar Hosting</Button>
                            )}
                        </SheetFooter>
                    </div>
                </div>

                <ClientActionManager 
                    client={management.client}
                    settings={management.settings}
                    isServiceSheetOpen={isServiceSheetOpen}
                    setIsServiceSheetOpen={setIsServiceSheetOpen}
                    isInvoiceSheetOpen={isInvoiceSheetOpen}
                    setIsInvoiceSheetOpen={setIsInvoiceSheetOpen}
                    isHostingSheetOpen={isHostingSheetOpen}
                    setIsHostingSheetOpen={setIsHostingSheetOpen}
                    isServiceDetailOpen={isServiceDetailOpen}
                    setIsServiceDetailOpen={setIsServiceDetailOpen}
                    isCommunicationModalOpen={isCommunicationModalOpen}
                    setIsCommunicationModalOpen={setIsCommunicationModalOpen}
                    serviceToEdit={serviceToEdit}
                    selectedService={selectedService}
                    hostingToEdit={hostingToEdit}
                    communicationContext={communicationContext}
                    visibleTabs={config.management.visibleTabs}
                    onSuccess={handleSuccessCallback}
                />
            </SheetContent>
        </Sheet>
    )
}
