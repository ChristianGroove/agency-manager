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
import { Loader2, Layout, FileText, Server, CalendarClock, Mail, Phone, MapPin, Globe, Facebook, Instagram, Share2, Linkedin, UserCircle, Upload, Save, Trash2, Youtube, Twitter } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Sub-components
import { ClientServicesList } from "../detail/client-services-list"
import { ClientInvoicesList } from "../detail/client-invoices-list"
import { ClientTimeline } from "@/modules/core/clients/client-timeline"

// Action Sheets & Modals
import { CreateServiceSheet } from "@/modules/core/billing/components/create-service-sheet"
import { CreateInvoiceSheet } from "@/modules/core/billing/create-invoice-sheet"
import { ServiceDetailModal } from "@/modules/core/billing/components/service-detail-modal"
// import { ShareInvoiceModal } from "@/modules/core/billing/share-invoice-modal" // REPLACED
import { UnifiedCommunicationModal } from "@/modules/core/communication/components/unified-communication-modal" // NEW
import { CreateHostingSheet } from "@/modules/core/hosting/components/create-hosting-sheet"
import { NotesModal } from "@/modules/core/clients/notes-modal"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useSpacePolicies } from "@/modules/flows/hooks/use-space-policies"
import { RestoOrdersTab } from "./resto-orders-tab"
import { useRef } from "react"
import { CategorySelector } from "../category-selector"

interface ClientManagementSheetProps {
    clientId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: Client
    initialTab?: string
    spaceType?: string
}

export function ClientManagementSheet({ clientId, open, onOpenChange, initialData, initialTab = "overview", spaceType = "agency" }: ClientManagementSheetProps) {
    const { t } = useTranslation()
    const { config, t: tVertical } = useSpacePolicies(spaceType)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Data State
    const [client, setClient] = useState<Client | null>(initialData || null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<any>(null)
    const [activeTab, setActiveTab] = useState(initialTab)

    useEffect(() => {
        if (open) {
            setActiveTab(initialTab)
        }
    }, [open, initialTab])

    // Form State (Unified from EditClientSheet)
    const [editForm, setEditForm] = useState({
        name: "",
        company_name: "",
        nit: "",
        email: "",
        phone: "",
        address: "",
        logo_url: "",
        website: "",
        instagram: "",
        facebook: "",
        tiktok: "",
        linkedin: "",
        youtube: "",
        twitter: "",
        category_id: null as string | null
    })

    // Action Sheets State
    const [isServiceSheetOpen, setIsServiceSheetOpen] = useState(false)
    const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false)
    const [isHostingSheetOpen, setIsHostingSheetOpen] = useState(false)
    const [isNotesOpen, setIsNotesOpen] = useState(false)

    // Selection State
    const [serviceToEdit, setServiceToEdit] = useState<any>(null)
    const [selectedService, setSelectedService] = useState<any>(null)
    const [isServiceDetailOpen, setIsServiceDetailOpen] = useState(false)

    // Communication State
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
    const [isCommunicationModalOpen, setIsCommunicationModalOpen] = useState(false)
    const [communicationContext, setCommunicationContext] = useState<{ type: 'invoice' | 'quote' | 'general', data?: any } | undefined>(undefined)

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
                    quotes:quotes(*),
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
            // Filter out soft-deleted invoices
            if (data.invoices) {
                data.invoices = data.invoices.filter((i: any) => !i.deleted_at)
            }
            setClient(data)

            // Sync Edit Form
            setEditForm({
                name: data.name || "",
                company_name: data.company_name || "",
                nit: data.nit || "",
                email: data.email || "",
                phone: data.phone || "",
                address: data.address || "",
                logo_url: data.logo_url || "",
                website: data.website || "",
                instagram: data.metadata?.instagram || data.instagram || "",
                facebook: data.metadata?.facebook || data.facebook || "",
                tiktok: data.metadata?.tiktok || data.tiktok || "",
                linkedin: data.metadata?.linkedin || data.linkedin || "",
                youtube: data.metadata?.youtube || data.youtube || "",
                twitter: data.metadata?.twitter || data.twitter || "",
                category_id: data.category_id || null
            })

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
                .single() // error check

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

    // New Handler for Sharing Invoice
    const handleShareInvoice = (inv: any) => {
        setSelectedInvoice(inv)
        setCommunicationContext({ type: 'invoice', data: inv })
        setIsCommunicationModalOpen(true)
    }

    // --- UNIFIED EDIT HANDLERS ---

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!client) return
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setSaving(true)
            try {
                const fileExt = file.name.split('.').pop()
                const fileName = `${client.id}-${Math.random()}.${fileExt}`
                const filePath = `company-logos/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('public-assets')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('public-assets')
                    .getPublicUrl(filePath)

                setEditForm(prev => ({ ...prev, logo_url: publicUrl }))

                // Auto-update in DB for Logo
                await supabase.from('clients').update({ logo_url: publicUrl }).eq('id', client.id)
                fetchClientData()
                toast.success("Logo actualizado")
            } catch (error) {
                toast.error("Error al subir imagen")
            } finally {
                setSaving(false)
            }
        }
    }

    const handleUpdateProfile = async () => {
        if (!client) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    name: editForm.name,
                    company_name: editForm.company_name,
                    nit: editForm.nit,
                    email: editForm.email,
                    phone: editForm.phone,
                    address: editForm.address,
                    logo_url: editForm.logo_url,
                    website: editForm.website,
                    instagram: editForm.instagram,
                    facebook: editForm.facebook,
                    tiktok: editForm.tiktok,
                    linkedin: editForm.linkedin,
                    youtube: editForm.youtube,
                    twitter: editForm.twitter,
                    category_id: editForm.category_id
                })
                .eq('id', client.id)

            if (error) throw error
            toast.success("Perfil actualizado correctamente")
            fetchClientData()
        } catch (error) {
            toast.error("Error al actualizar perfil")
        } finally {
            setSaving(false)
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
                        <SheetTitle>Gestión de Contacto: {client.name}</SheetTitle>
                        <SheetDescription>Detalles y gestión de contacto</SheetDescription>
                    </SheetHeader>
                    {/* Header */}
                    <div className="bg-white border-b border-gray-100 px-8 py-6 flex items-start gap-6 flex-none z-10">
                        <div className="flex-1 pt-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-black text-gray-900 truncate" aria-hidden="true">{client.name}</h2>
                                <div className="flex items-center gap-3">
                                    {client.total_debt && client.total_debt > 0 ? (
                                        <Badge variant="destructive" className="animate-pulse bg-red-500 text-white border-none shadow-lg shadow-red-200 px-4 h-7 rounded-full text-xs font-bold">
                                            Deuda: ${client.total_debt.toLocaleString()}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none px-4 h-7 rounded-full text-xs font-bold">
                                            Al Día
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                                {client.company_name && (
                                    <span className="flex items-center gap-2 font-medium">
                                        <Layout className="h-4 w-4 text-gray-400" /> {client.company_name}
                                    </span>
                                )}
                                <span className="flex items-center gap-2 font-medium">
                                    <Mail className="h-4 w-4 text-gray-400" /> {client.email || '--'}
                                </span>
                                <span className="flex items-center gap-2 font-medium">
                                    <Phone className="h-4 w-4 text-gray-400" /> {client.phone || '--'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-8 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <TabsList className="bg-transparent p-0 w-full justify-start h-auto gap-8">
                                    {config.management.visibleTabs.includes('info') && (
                                        <TabsTrigger value="info" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <UserCircle className="h-4 w-4 mr-2" /> Perfil
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('activity') && (
                                        <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <CalendarClock className="h-4 w-4 mr-2" /> Actividad
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('services') && (
                                        <TabsTrigger value="services" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <Server className="h-4 w-4 mr-2" /> Servicios
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('billing') && (
                                        <TabsTrigger value="billing" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <FileText className="h-4 w-4 mr-2" /> Facturación
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('hosting') && (
                                        <TabsTrigger value="hosting" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <Globe className="h-4 w-4 mr-2" /> Hosting
                                        </TabsTrigger>
                                    )}
                                    {config.management.visibleTabs.includes('orders') && (
                                        <TabsTrigger value="orders" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-3 pt-2 text-gray-500 font-medium text-sm transition-all">
                                            <FileText className="h-4 w-4 mr-2" /> Pedidos
                                        </TabsTrigger>
                                    )}
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                                {/* TAB: ACTIVITY (Timeline) */}
                                <TabsContent value="activity" className="space-y-6 m-0 animate-in fade-in-50">
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Actividad Reciente</h3>
                                        <ClientTimeline clientId={client.id} />
                                    </div>
                                </TabsContent>

                                {/* TAB: INFORMATION (Editable) */}
                                <TabsContent value="info" className="space-y-8 m-0 animate-in slide-in-from-right-4 duration-300">
                                    {/* Header Info */}
                                    <div className="flex items-center gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="relative group">
                                            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                                                <AvatarImage src={editForm.logo_url} className="object-cover" />
                                                <AvatarFallback className="bg-indigo-50 text-indigo-600 text-2xl font-bold">
                                                    {client.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                            >
                                                <Upload className="h-6 w-6" />
                                            </button>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-bold text-gray-900 leading-tight">Personalización Visual</h4>
                                            <p className="text-sm text-gray-500 mt-1">Sube el logo de la marca para que aparezca en el portal y documentos.</p>
                                        </div>
                                    </div>

                                    {/* Form Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="space-y-6">
                                            <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                                <UserCircle className="h-4 w-4" /> Datos de Identidad
                                            </h4>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500">{t('clients.form.fields.name')}</Label>
                                                <Input
                                                    className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500">{t('clients.form.fields.company')}</Label>
                                                <Input
                                                    className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                                    value={editForm.company_name}
                                                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500">{t('clients.form.fields.nit')}</Label>
                                                <Input
                                                    className="bg-gray-50/50 border-gray-200 focus:bg-white h-11 font-mono"
                                                    value={editForm.nit}
                                                    onChange={(e) => setEditForm({ ...editForm, nit: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500">Categoría</Label>
                                                <CategorySelector
                                                    value={editForm.category_id}
                                                    onChange={(val: string | null) => setEditForm({ ...editForm, category_id: val })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                                <Mail className="h-4 w-4" /> Comunicación
                                            </h4>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500">Email Directo</Label>
                                                <Input
                                                    className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                                    value={editForm.email}
                                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500">Teléfono / WhatsApp</Label>
                                                <Input
                                                    className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                                    value={editForm.phone}
                                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500">Dirección Física</Label>
                                                <Input
                                                    className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                                    value={editForm.address}
                                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {config.management.profileSections.includes('digital_presence') && (
                                            <div className="md:col-span-2 pt-4 border-t border-gray-50 space-y-6">
                                                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                                    <Globe className="h-4 w-4" /> Presencia Digital
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold text-gray-500">Website</Label>
                                                        <Input className="bg-gray-50/50 h-10" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold text-gray-500">Instagram</Label>
                                                        <Input className="bg-gray-50/50 h-10" value={editForm.instagram} onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold text-gray-500">Facebook</Label>
                                                        <Input className="bg-gray-50/50 h-10" value={editForm.facebook} onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold text-gray-500">TikTok</Label>
                                                        <Input className="bg-gray-50/50 h-10" value={editForm.tiktok} onChange={(e) => setEditForm({ ...editForm, tiktok: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold text-gray-500">LinkedIn</Label>
                                                        <Input className="bg-gray-50/50 h-10" value={editForm.linkedin} onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold text-gray-500">YouTube</Label>
                                                        <Input className="bg-gray-50/50 h-10" value={editForm.youtube} onChange={(e) => setEditForm({ ...editForm, youtube: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                        onShare={handleShareInvoice}
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

                                {/* TAB 5: ORDERS (RESTO) */}
                                {spaceType === 'resto' && client && (
                                    <TabsContent value="orders" className="space-y-6 m-0 animate-in fade-in-50">
                                        <RestoOrdersTab orgId={client.organization_id} clientId={client.id} />
                                    </TabsContent>
                                )}

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

                            {activeTab === 'services' && config.management.visibleTabs.includes('services') && (
                                <Button
                                    onClick={() => { setServiceToEdit(null); setIsServiceSheetOpen(true); }}
                                    className="bg-black text-white hover:bg-gray-800 rounded-xl h-10 shadow-lg shadow-black/10 text-xs font-semibold px-6"
                                >
                                    + Nuevo Servicio
                                </Button>
                            )}

                            {activeTab === 'billing' && config.management.visibleTabs.includes('billing') && (
                                <Button
                                    onClick={() => setIsInvoiceSheetOpen(true)}
                                    className="bg-black text-white hover:bg-gray-800 rounded-xl h-10 shadow-lg shadow-black/10 text-xs font-semibold px-6"
                                >
                                    + Crear Factura
                                </Button>
                            )}

                            {activeTab === 'hosting' && config.management.visibleTabs.includes('hosting') && (
                                <Button
                                    onClick={() => { setHostingToEdit(null); setIsHostingSheetOpen(true); }}
                                    className="bg-brand-pink text-white hover:bg-brand-pink/90 rounded-xl h-10 shadow-lg shadow-brand-pink/20 text-xs font-semibold px-6 border-0"
                                >
                                    + Activar Hosting
                                </Button>
                            )}

                            {activeTab === 'activity' && (
                                <div className="text-sm text-gray-400 italic">
                                    Historial cronológico de interacciones y cambios.
                                </div>
                            )}

                            {activeTab === 'info' && (
                                <Button
                                    onClick={handleUpdateProfile}
                                    disabled={saving}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl h-10 shadow-lg shadow-indigo-200 text-xs font-semibold px-8 gap-2"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Guardar Cambios
                                </Button>
                            )}
                        </SheetFooter>
                    </div>
                </div>

                {/* --- ACTION SHEETS --- */}
                {
                    client && (
                        <>
                            {config.management.visibleTabs.includes('services') && (
                                <CreateServiceSheet
                                    clientId={client!.id}
                                    clientName={client!.name}
                                    open={isServiceSheetOpen}
                                    onOpenChange={setIsServiceSheetOpen}
                                    serviceToEdit={serviceToEdit}
                                    onSuccess={fetchClientData}
                                    trigger={<span className="hidden" />}
                                />
                            )}
                            {config.management.visibleTabs.includes('billing') && (
                                <CreateInvoiceSheet
                                    clientId={client!.id}
                                    clientName={client!.name}
                                    open={isInvoiceSheetOpen}
                                    onOpenChange={setIsInvoiceSheetOpen}
                                    onSuccess={fetchClientData}
                                    trigger={<span className="hidden" />}
                                />
                            )}
                            {config.management.visibleTabs.includes('hosting') && (
                                <CreateHostingSheet
                                    clientId={client!.id}
                                    open={isHostingSheetOpen}
                                    onOpenChange={setIsHostingSheetOpen}
                                    accountToEdit={hostingToEdit}
                                    onSuccess={fetchClientData}
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
                                    id: client!.id,
                                    name: client!.name,
                                    email: client!.email || undefined,
                                    phone: client!.phone || undefined,
                                    company_name: client!.company_name || undefined,
                                    invoices: client!.invoices,
                                    quotes: client!.quotes,
                                    portal_token: client!.portal_token,
                                    portal_short_token: client!.portal_short_token
                                }}
                                context={communicationContext}
                                settings={settings}
                            />
                            <NotesModal
                                clientId={client!.id}
                                initialNotes={client!.notes || ""}
                                isOpen={isNotesOpen}
                                onClose={() => setIsNotesOpen(false)}
                                onSuccess={(newNotes) => {
                                    setClient(prev => prev ? { ...prev, notes: newNotes } : null)
                                }}
                            />
                        </>
                    )
                }
            </SheetContent >
        </Sheet >
    )
}
