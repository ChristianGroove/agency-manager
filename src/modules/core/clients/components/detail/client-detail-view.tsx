"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Client } from "@/types"

import { ClientHeader } from "./client-header"
import { ClientSidebar } from "./client-sidebar"
import { ClientServicesList } from "./client-services-list"
import { ClientInvoicesList } from "./client-invoices-list"
import { EditClientSheet } from "./edit-client-sheet"
import { ClientTimeline } from "@/modules/core/clients/client-timeline"

// Modals & Sheets
import { CreateServiceSheet } from "@/modules/core/billing/components/create-service-sheet"
import { CreateInvoiceSheet } from "@/modules/core/billing/create-invoice-sheet"
import { PortalGovernanceSheet } from "@/components/sheets/portal-governance-sheet"
import { NotesModal } from "@/modules/core/clients/notes-modal"
import { ServiceDetailModal } from "@/modules/core/billing/components/service-detail-modal"
import { ResumeServiceModal } from "@/modules/core/billing/components/resume-service-modal"
import { ShareInvoiceModal } from "@/modules/core/billing/share-invoice-modal"
import { ConnectivitySheet } from "@/components/sheets/connectivity-sheet"
import { CreateHostingSheet } from "@/modules/core/hosting/components/create-hosting-sheet"
import { WhatsAppActionsModal as WhatsappModal } from "@/modules/core/clients/whatsapp-modal"

// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Loader2, Layout, CalendarClock, Server, Activity, FileText } from "lucide-react"

interface ClientDetailViewProps {
    clientId: string
}

export function ClientDetailView({ clientId }: ClientDetailViewProps) {
    const router = useRouter()

    // Data State
    const [client, setClient] = useState<Client | null>(null)
    const [settings, setSettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // UI State - Sheets & Modals
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isServiceSheetOpen, setIsServiceSheetOpen] = useState(false)
    const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false)
    const [isPortalSheetOpen, setIsPortalSheetOpen] = useState(false)
    const [isConnectivitySheetOpen, setIsConnectivitySheetOpen] = useState(false)
    const [isNotesOpen, setIsNotesOpen] = useState(false)
    const [isHostingSheetOpen, setIsHostingSheetOpen] = useState(false)
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)

    // UI State - Selection & Detail Modals
    const [selectedService, setSelectedService] = useState<any>(null) // For Detail
    const [isServiceDetailOpen, setIsServiceDetailOpen] = useState(false)

    const [serviceToEdit, setServiceToEdit] = useState<any>(null) // For Edit (re-uses Create Sheet)

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null) // For Share
    const [isShareInvoiceOpen, setIsShareInvoiceOpen] = useState(false)

    const [hostingToEdit, setHostingToEdit] = useState<any>(null)

    // Fetch Data
    const fetchClientData = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select(`
                    *,
                    services:services(*),
                    invoices:invoices(*),
                    subscriptions:subscriptions(*),
                    quotes:quotes(*),
                    hosting_accounts:hosting_accounts(*)
                `)
                .eq('id', clientId)
                .single()

            if (error) throw error
            setClient(data)

            // Fetch Settings (for defaults etc)
            const { data: settingsData } = await supabase
                .from('user_settings')
                .select('*')
                .single()
            setSettings(settingsData || {})

        } catch (error) {
            console.error(error)
            toast.error("Error al cargar cliente")
        } finally {
            setLoading(false)
        }
    }, [clientId, supabase])

    useEffect(() => {
        fetchClientData()
    }, [fetchClientData])


    // Handlers
    const handleDeleteClient = async () => {
        if (!confirm("ADVERTENCIA: ¿Estás seguro de eliminar este cliente? Se borrarán todos los datos asociados.")) return

        try {
            // Soft delete usually, but sticking to previous logic which seemed to be hard delete or update deleted_at
            const { error } = await supabase
                .from('clients')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', clientId)

            if (error) throw error
            toast.success("Cliente eliminado")
            router.push('/clients')
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar cliente")
        }
    }

    const handleDeleteService = async (serviceId: string) => {
        if (!confirm("¿Detener/Eliminar servicio? Esto detendrá la facturación recurrente.")) return

        try {
            const { error } = await supabase
                .from('services')
                .update({ status: 'cancelled', next_billing_date: null })
                .eq('id', serviceId)

            if (error) throw error
            toast.success("Servicio cancelado")
            fetchClientData()
        } catch (error) {
            toast.error("Error al cancelar servicio")
        }
    }

    const handleMarkInvoicePaid = async (invoiceId: string) => {
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid', payment_status: 'PAID' })
                .eq('id', invoiceId)

            if (error) throw error
            toast.success("Factura marcada como pagada")
            fetchClientData()
        } catch (error) {
            toast.error("Error al actualizar factura")
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (!client) return null

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black">
            <ClientHeader
                client={client}
                onEdit={() => setIsEditOpen(true)}
                onDelete={handleDeleteClient}
                onNotes={() => setIsNotesOpen(true)}
                onPortal={() => setIsPortalSheetOpen(true)}
                onConnectivity={() => setIsConnectivitySheetOpen(true)}
                onNewService={() => { setServiceToEdit(null); setIsServiceSheetOpen(true); }}
                onNewInvoice={() => setIsInvoiceSheetOpen(true)}
            />

            <main className="max-w-[1700px] mx-auto px-4 md:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Sidebar (3 Cols) */}
                    <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-6">
                        <ClientSidebar
                            client={client}
                            onWhatsAppClick={() => setIsWhatsAppOpen(true)}
                        />
                    </aside>

                    {/* Main Content (9 Cols) */}
                    <div className="lg:col-span-9">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="w-full justify-start border-b border-gray-200 bg-transparent p-0 rounded-none gap-6 mb-6">
                                <TabsTrigger
                                    value="overview"
                                    className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Layout className="h-4 w-4" />
                                        <span>Resumen & Servicios</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="financials"
                                    className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>Facturación</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4" />
                                        <span>Historial</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="hosting"
                                    className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Server className="h-4 w-4" />
                                        <span>Hosting</span>
                                    </div>
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: OVERVIEW */}
                            <TabsContent value="overview" className="space-y-8 animate-in fade-in-50 duration-500">
                                <ClientServicesList
                                    services={client.services || []}
                                    subscriptions={client.subscriptions || []}
                                    onEdit={(service) => { setServiceToEdit(service); setIsServiceSheetOpen(true); }}
                                    onDelete={handleDeleteService}
                                    onDetail={(service) => { setSelectedService(service); setIsServiceDetailOpen(true); }}
                                />
                            </TabsContent>

                            {/* TAB 2: FINANCIALS */}
                            <TabsContent value="financials" className="space-y-4 animate-in fade-in-50 duration-500">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Facturas Generadas</h3>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500">{client.invoices?.length || 0} total</span>
                                </div>
                                <ClientInvoicesList
                                    invoices={client.invoices || []}
                                    onMarkPaid={handleMarkInvoicePaid}
                                    onShare={(inv) => { setSelectedInvoice(inv); setIsShareInvoiceOpen(true); }}
                                />
                            </TabsContent>

                            {/* TAB 3: HISTORY */}
                            <TabsContent value="history" className="space-y-4 animate-in fade-in-50 duration-500">
                                <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-6">
                                    <ClientTimeline clientId={client.id} />
                                </div>
                            </TabsContent>

                            {/* TAB 4: HOSTING (Placeholder for now, implemented minimally) */}
                            <TabsContent value="hosting" className="space-y-4 animate-in fade-in-50 duration-500">
                                <div className="flex items-center justify-between bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div>
                                        <h3 className="font-bold text-gray-900">Cuentas de Hosting</h3>
                                        <p className="text-sm text-gray-500">Administra los accesos cPanel y cuentas FTP.</p>
                                    </div>
                                    <button
                                        onClick={() => { setHostingToEdit(null); setIsHostingSheetOpen(true); }}
                                        className="text-sm bg-brand-pink text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-pink/90 transition-colors"
                                    >
                                        + Nueva Cuenta
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {client.hosting_accounts && client.hosting_accounts.map((acc: any) => (
                                        <div key={acc.id} onClick={() => { setHostingToEdit(acc); setIsHostingSheetOpen(true); }} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 cursor-pointer shadow-sm">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Server className="h-5 w-5 text-gray-400" />
                                                <span className="font-bold text-gray-800">{acc.domain || "Sin Dominio"}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 space-y-1">
                                                <p>IP: {acc.server_ip}</p>
                                                <p>User: {acc.username}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!client.hosting_accounts || client.hosting_accounts.length === 0) && (
                                        <div className="col-span-full text-center py-8 text-gray-400 italic">No hay cuentas de hosting</div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            {/* --- MODALS --- */}

            <EditClientSheet
                client={client}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={fetchClientData}
            />

            <CreateServiceSheet
                clientId={client.id}
                clientName={client.name}
                open={isServiceSheetOpen}
                onOpenChange={setIsServiceSheetOpen}
                serviceToEdit={serviceToEdit}
                onSuccess={fetchClientData}
                trigger={<span className="hidden" />}
            />

            <CreateInvoiceSheet
                clientId={client.id}
                clientName={client.name}
                open={isInvoiceSheetOpen}
                onOpenChange={setIsInvoiceSheetOpen}
                onSuccess={fetchClientData}
                trigger={<span className="hidden" />}
            />

            <PortalGovernanceSheet
                client={client as any}
                globalSettings={settings}
                open={isPortalSheetOpen}
                onOpenChange={setIsPortalSheetOpen}
                trigger={<span className="hidden" />}
            />

            <ConnectivitySheet
                client={client as any}
                services={client.services || []}
                open={isConnectivitySheetOpen}
                onOpenChange={setIsConnectivitySheetOpen}
                trigger={<span className="hidden" />}
            />

            <NotesModal
                clientId={client.id}
                initialNotes={client.notes || ""}
                isOpen={isNotesOpen}
                onClose={() => setIsNotesOpen(false)}
                onSuccess={(newNotes) => {
                    setClient({ ...client, notes: newNotes })
                }}
            />

            <ServiceDetailModal
                isOpen={isServiceDetailOpen}
                onOpenChange={setIsServiceDetailOpen}
                service={selectedService}
            />

            <ShareInvoiceModal
                isOpen={isShareInvoiceOpen}
                onOpenChange={setIsShareInvoiceOpen}
                invoice={selectedInvoice}
                client={client}
                settings={settings}
            />

            <CreateHostingSheet
                clientId={client.id}
                open={isHostingSheetOpen}
                onOpenChange={setIsHostingSheetOpen}
                accountToEdit={hostingToEdit}
                onSuccess={fetchClientData}
            />

            <WhatsappModal
                isOpen={isWhatsAppOpen}
                onOpenChange={setIsWhatsAppOpen}
                client={client}
                settings={settings}
            />
        </div>
    )
}
