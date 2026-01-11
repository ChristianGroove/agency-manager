"use client"

import { useState, useEffect, useCallback } from "react"
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
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Loader2, Layout, FileText, Server, CalendarClock, Mail, Phone, MapPin, Globe, Facebook, Instagram, Share2, Linkedin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Sub-components
import { ClientServicesList } from "../detail/client-services-list"
import { ClientInvoicesList } from "../detail/client-invoices-list"
import { ClientTimeline } from "@/modules/core/clients/client-timeline"

// Action Sheets & Modals
import { CreateServiceSheet } from "@/modules/core/billing/components/create-service-sheet"
import { CreateInvoiceSheet } from "@/modules/core/billing/create-invoice-sheet"
import { ServiceDetailModal } from "@/modules/core/billing/components/service-detail-modal"
import { ShareInvoiceModal } from "@/modules/core/billing/share-invoice-modal"
import { CreateHostingSheet } from "@/modules/core/hosting/components/create-hosting-sheet"
import { NotesModal } from "@/modules/core/clients/notes-modal"

interface ClientManagementSheetProps {
    clientId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: Client
}

export function ClientManagementSheet({ clientId, open, onOpenChange, initialData }: ClientManagementSheetProps) {
    // Data State
    const [client, setClient] = useState<Client | null>(initialData || null)
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("overview")

    // Action Sheets State
    const [isServiceSheetOpen, setIsServiceSheetOpen] = useState(false)
    const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false)
    const [isHostingSheetOpen, setIsHostingSheetOpen] = useState(false)
    const [isNotesOpen, setIsNotesOpen] = useState(false)

    // Selection State
    const [serviceToEdit, setServiceToEdit] = useState<any>(null)
    const [selectedService, setSelectedService] = useState<any>(null)
    const [isServiceDetailOpen, setIsServiceDetailOpen] = useState(false)

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
    const [isShareInvoiceOpen, setIsShareInvoiceOpen] = useState(false)

    const [hostingToEdit, setHostingToEdit] = useState<any>(null)

    const fetchClientData = useCallback(async () => {
        if (!clientId) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clients')
                .select(`
                    *,
                    services:services(*),
                    invoices:invoices(*),
                    subscriptions:subscriptions(*),
                    hosting_accounts:hosting_accounts(*)
                `)
                .eq('id', clientId)
                .single()

            if (error) throw error

            // Filter out soft-deleted services
            if (data.services) {
                data.services = data.services.filter((s: any) => !s.deleted_at)
            }
            setClient(data)

            // Fetch Settings
            const { data: settingsData } = await supabase
                .from('user_settings')
                .select('*')
                .single()
            setSettings(settingsData || {})

        } catch (error) {
            console.error(error)
            toast.error("Error al cargar datos del cliente")
        } finally {
            setLoading(false)
        }
    }, [clientId])

    useEffect(() => {
        if (open && clientId) {
            fetchClientData()
        }
    }, [open, clientId, fetchClientData])

    // --- HANDLERS ---

    const handlePauseService = async (serviceId: string) => {
        if (!confirm("¿Pausar servicio? Esto detendrá la facturación recurrente pero mantendrá el historial.")) return

        try {
            const { error } = await supabase
                .from('services')
                .update({ status: 'cancelled', next_billing_date: null })
                .eq('id', serviceId)

            if (error) throw error
            toast.success("Servicio pausado")
            fetchClientData()
        } catch (error) {
            toast.error("Error al pausar servicio")
        }
    }

    const handleDeleteService = async (serviceId: string) => {
        if (!confirm("PELIGRO: ¿Eliminar servicio permanentemente? Se borrará de la lista.")) return

        try {
            const { deleteServices } = await import("@/modules/core/billing/services-actions")
            const result = await deleteServices([serviceId])

            if (result.success) {
                toast.success("Servicio eliminado")
                fetchClientData()
            } else {
                throw new Error("Error al eliminar")
            }
        } catch (error) {
            toast.error("Error al eliminar servicio")
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

    if (!client && loading) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-2xl bg-white/95 backdrop-blur flex items-center justify-center">
                    <SheetTitle className="sr-only">Cargando cliente...</SheetTitle>
                    <SheetDescription className="sr-only">Espere mientras se carga la información.</SheetDescription>
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </SheetContent>
            </Sheet>
        )
    }

    if (!client) return null

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-white/95 backdrop-blur-xl
                "
            >
                <div className="flex flex-col h-full bg-slate-50/50">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Gestión del Cliente: {client.name}</SheetTitle>
                        <SheetDescription>Detalles y gestión del cliente</SheetDescription>
                    </SheetHeader>
                    {/* Header */}
                    <div className="bg-white border-b border-gray-100 px-8 py-6 flex items-start gap-4 flex-none z-10">
                        <Avatar className="h-16 w-16 rounded-full border-4 border-white shadow-lg ring-1 ring-gray-100/50">
                            <AvatarImage src={client.logo_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-slate-100 text-slate-400 text-xl font-bold rounded-full">
                                {client.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 pt-1">
                            <h2 className="text-xl font-bold text-gray-900" aria-hidden="true">{client.name}</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                {client.company_name && (
                                    <>
                                        <span>{client.company_name}</span>
                                        <span className="text-gray-300">•</span>
                                    </>
                                )}
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                    client.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                                )}>
                                    {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-8 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <TabsList className="bg-transparent p-0 w-full justify-start h-auto gap-8">
                                    <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                        <Layout className="h-4 w-4 mr-2" /> Resumen
                                    </TabsTrigger>
                                    <TabsTrigger value="services" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                        <Server className="h-4 w-4 mr-2" /> Servicios
                                    </TabsTrigger>
                                    <TabsTrigger value="billing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                        <FileText className="h-4 w-4 mr-2" /> Facturación
                                    </TabsTrigger>
                                    <TabsTrigger value="hosting" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                        <Globe className="h-4 w-4 mr-2" /> Hosting
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                                {/* TAB 1: OVERVIEW */}
                                <TabsContent value="overview" className="space-y-6 m-0 animate-in fade-in-50">
                                    {/* Identity Card Replica */}
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative group overflow-hidden">
                                        {/* Debt Glow */}
                                        {client.total_debt && client.total_debt > 0 ? (
                                            <div className="absolute top-0 right-0 p-4">
                                                <div className="animate-pulse bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-100">
                                                    Deuda: ${client.total_debt.toLocaleString()}
                                                </div>
                                            </div>
                                        ) : null}

                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Información de Contacto</h3>

                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                                    <Mail className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 font-medium block">Email</span>
                                                    <a href={`mailto:${client.email}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline">
                                                        {client.email}
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                                                    <Phone className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 font-medium block">Teléfono / WhatsApp</span>
                                                    <a href={`https://wa.me/${client.phone?.replace(/\D/g, '')}`} target="_blank" className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline">
                                                        {client.phone || '--'}
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                                                    <MapPin className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 font-medium block">Dirección</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {client.address || '--'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Social Footer */}
                                        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
                                            {client.website && (
                                                <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                                    <Globe className="h-4 w-4" />
                                                </a>
                                            )}
                                            {client.facebook && (
                                                <a href={client.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                    <Facebook className="h-4 w-4" />
                                                </a>
                                            )}
                                            {client.instagram && (
                                                <a href={client.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors">
                                                    <Instagram className="h-4 w-4" />
                                                </a>
                                            )}
                                            {(client.metadata?.tiktok || client.tiktok) && (
                                                <a href={client.metadata?.tiktok || client.tiktok} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-200 transition-colors">
                                                    <Share2 className="h-4 w-4" />
                                                </a>
                                            )}
                                            {(client.metadata?.linkedin || client.linkedin) && (
                                                <a href={client.metadata?.linkedin || client.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                                                    <Linkedin className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline / History */}
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Actividad Reciente</h3>
                                        <ClientTimeline clientId={client.id} />
                                    </div>
                                </TabsContent>

                                {/* TAB 2: SERVICES */}
                                <TabsContent value="services" className="space-y-6 m-0 animate-in fade-in-50">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-900">Servicios Activos</h3>
                                            <p className="text-sm text-gray-500">Gestiona suscripciones y servicios recurrentes.</p>
                                        </div>
                                    </div>
                                    <ClientServicesList
                                        services={client.services || []}
                                        subscriptions={client.subscriptions || []}
                                        onEdit={(service) => { setServiceToEdit(service); setIsServiceSheetOpen(true); }}
                                        onDelete={handleDeleteService}
                                        onPause={handlePauseService}
                                        onDetail={(service) => { setSelectedService(service); setIsServiceDetailOpen(true); }}
                                    />
                                </TabsContent>

                                {/* TAB 3: BILLING */}
                                <TabsContent value="billing" className="space-y-6 m-0 animate-in fade-in-50">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-900">Historial de Facturación</h3>
                                            <p className="text-sm text-gray-500">Consulta y gestiona las facturas del cliente.</p>
                                        </div>
                                    </div>
                                    <ClientInvoicesList
                                        invoices={client.invoices || []}
                                        onMarkPaid={handleMarkInvoicePaid}
                                        onShare={(inv) => { setSelectedInvoice(inv); setIsShareInvoiceOpen(true); }}
                                    />
                                </TabsContent>

                                {/* TAB 4: HOSTING */}
                                <TabsContent value="hosting" className="space-y-6 m-0 animate-in fade-in-50">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-900">Cuentas de Hosting</h3>
                                            <p className="text-sm text-gray-500">Credenciales cPanel y accesos técnicos.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {client.hosting_accounts && client.hosting_accounts.map((acc: any) => (
                                            <div key={acc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-colors">
                                                <div
                                                    className="flex items-center gap-4 cursor-pointer flex-1"
                                                    onClick={() => { setHostingToEdit(acc); setIsHostingSheetOpen(true); }}
                                                >
                                                    <div className={cn("p-2.5 rounded-lg", acc.status === 'suspended' ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600")}>
                                                        <Server className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className={cn("font-bold text-sm", acc.status === 'suspended' && "line-through text-gray-400")}>{acc.domain || "Dominio no configurado"}</h4>
                                                        <p className="text-xs text-gray-500">IP: {acc.server_ip || '--'} • User: {acc.username || '--'}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setHostingToEdit(acc); setIsHostingSheetOpen(true); }}
                                                    className="text-gray-400 hover:text-indigo-600"
                                                >
                                                    Editar
                                                </Button>
                                            </div>
                                        ))}
                                        {(!client.hosting_accounts || client.hosting_accounts.length === 0) && (
                                            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                <Server className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-sm text-slate-500 font-medium">No hay servicios de hosting activos.</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                            </div>
                        </Tabs>

                        {/* Footer Actions */}
                        <SheetFooter className="border-t border-gray-100 p-6 bg-white flex-row justify-between items-center sm:justify-between flex-none z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-10 text-xs font-semibold rounded-xl"
                            >
                                Cerrar
                            </Button>

                            {activeTab === 'services' && (
                                <Button
                                    onClick={() => { setServiceToEdit(null); setIsServiceSheetOpen(true); }}
                                    className="bg-black text-white hover:bg-gray-800 rounded-xl h-10 shadow-lg shadow-black/10 text-xs font-semibold px-6"
                                >
                                    + Nuevo Servicio
                                </Button>
                            )}

                            {activeTab === 'billing' && (
                                <Button
                                    onClick={() => setIsInvoiceSheetOpen(true)}
                                    className="bg-black text-white hover:bg-gray-800 rounded-xl h-10 shadow-lg shadow-black/10 text-xs font-semibold px-6"
                                >
                                    + Crear Factura
                                </Button>
                            )}

                            {activeTab === 'hosting' && (
                                <Button
                                    onClick={() => { setHostingToEdit(null); setIsHostingSheetOpen(true); }}
                                    className="bg-brand-pink text-white hover:bg-brand-pink/90 rounded-xl h-10 shadow-lg shadow-brand-pink/20 text-xs font-semibold px-6 border-0"
                                >
                                    + Activar Hosting
                                </Button>
                            )}

                            {activeTab === 'overview' && (
                                <div className="text-sm text-gray-400 italic">
                                    Visualizando resumen...
                                </div>
                            )}
                        </SheetFooter>
                    </div>
                </div>

                {/* --- ACTION SHEETS --- */}
                {client && (
                    <>
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
                        <CreateHostingSheet
                            clientId={client.id}
                            open={isHostingSheetOpen}
                            onOpenChange={setIsHostingSheetOpen}
                            accountToEdit={hostingToEdit}
                            onSuccess={fetchClientData}
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
                        <NotesModal
                            clientId={client.id}
                            initialNotes={client.notes || ""}
                            isOpen={isNotesOpen}
                            onClose={() => setIsNotesOpen(false)}
                            onSuccess={(newNotes) => {
                                setClient({ ...client, notes: newNotes })
                            }}
                        />
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
