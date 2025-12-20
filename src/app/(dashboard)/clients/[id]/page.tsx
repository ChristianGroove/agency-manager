"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServiceDetailModal } from "@/components/modules/services/service-detail-modal"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Plus,
    FileText,
    Server,
    Loader2,
    Pencil,
    Upload,
    X,
    Trash2,
    DollarSign,
    TrendingUp,
    MoreVertical,
    CheckCircle2,
    Send,
    Globe,
    AlertCircle,
    ExternalLink,
    Edit,
    RefreshCw,
    CalendarClock,
    PauseCircle,
    PlayCircle,
    StickyNote,
    Eye,
    Share2
} from "lucide-react"
import { NotesModal } from "@/components/modules/clients/notes-modal"
import { ResumeServiceModal } from "@/components/modules/services/resume-service-modal"
import { toggleServiceStatus } from "@/app/actions/services-actions"
import { supabase } from "@/lib/supabase"
import { getSettings } from "@/lib/actions/settings"
import { cn } from "@/lib/utils"
import { CreateInvoiceModal } from "@/components/modules/invoices/create-invoice-modal"
import { ShareInvoiceModal } from "@/components/modules/invoices/share-invoice-modal"
import { AddServiceModal } from "@/components/modules/services/add-service-modal"
import { regeneratePortalToken } from "@/app/actions/portal-actions"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"

// Types
type Client = {
    id: string
    name: string
    company_name: string
    email: string
    phone: string
    address: string
    nit: string
    logo_url?: string
    notes?: string
    facebook?: string
    instagram?: string
    tiktok?: string
    website?: string
    invoices: any[]
    hosting_accounts: any[]
    subscriptions: any[]
    services: any[]
    portal_token?: string
    portal_short_token?: string
}

export default function ClientDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [client, setClient] = useState<Client | null>(null)
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<any>(null)

    useEffect(() => {
        getSettings().then(setSettings)
    }, [])

    // Unified View State
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)
    const [selectedServiceForResume, setSelectedServiceForResume] = useState<any>(null)
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<any>(null)

    // Helper: Get invoices linked to a service
    const getServiceInvoices = (serviceId: string) => {
        const linkedInvoices = client?.invoices?.filter(inv => inv.service_id === serviceId) || []
        // Sort by created_at desc (newest first)
        return linkedInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    // Helper: Get invoices NOT linked to any service
    const getUnlinkedInvoices = () => {
        const serviceIds = client?.services?.map(s => s.id) || []
        return client?.invoices?.filter(inv => !inv.service_id || !serviceIds.includes(inv.service_id)) || []
    }

    const handlePauseService = async (id: string) => {
        if (!client) return
        if (!confirm("¿Estás seguro de que deseas pausar este servicio? Se detendrá la facturación hasta que lo reanudes.")) return

        try {
            const result = await toggleServiceStatus(id, 'paused')
            if (result.success) {
                await fetchClientData(client.id)
            } else {
                alert("Error al pausar el servicio")
            }
        } catch (error) {
            console.error(error)
            alert("Error desconocido")
        }
    }

    const handleDeleteService = async (serviceId: string) => {
        if (!confirm("¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.")) return

        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', serviceId)

            if (error) throw error

            alert("Servicio eliminado correctamente")
            // Re-fetch client data to update the UI
            if (client) fetchClientData(client.id)
        } catch (error) {
            console.error("Error deleting service:", error)
            alert("No se pudo eliminar el servicio. Verifica si tiene facturas asociadas que impidan la eliminación.")
        }
    }

    // Add Service Modal State
    const [invoiceFilter, setInvoiceFilter] = useState("all")
    const [serviceToEdit, setServiceToEdit] = useState<any>(null)
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)

    // Share Invoice Modal
    const [isShareInvoiceModalOpen, setIsShareInvoiceModalOpen] = useState(false)
    const [invoiceToShare, setInvoiceToShare] = useState<any>(null)

    // Edit Client Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        name: "",
        company_name: "",
        nit: "",
        email: "",
        phone: "",
        address: "",
        logo_url: "",
        facebook: "",
        instagram: "",
        tiktok: "",
        website: ""
    })

    // File upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (params.id) {
            fetchClientData(params.id as string)
        }
    }, [params.id])

    // Initialize edit form when client loads or modal opens
    useEffect(() => {
        if (client && isEditModalOpen) {
            setEditForm({
                name: client.name || "",
                company_name: client.company_name || "",
                nit: client.nit || "",
                email: client.email || "",
                phone: client.phone || "",
                address: client.address || "",
                logo_url: client.logo_url || "",
                facebook: client.facebook || "",
                instagram: client.instagram || "",
                tiktok: client.tiktok || "",
                website: client.website || ""
            })
            setPreviewUrl(client.logo_url || null)
            setSelectedFile(null)
        }
    }, [client, isEditModalOpen])

    const fetchClientData = async (id: string) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clients')
                .select(`
          *,
          services (*),
          invoices (*),
          hosting_accounts (*),
          subscriptions (
            *,
            invoice:invoices!subscriptions_invoice_id_fkey(sent)
          )
        `)
                .eq('id', id)
                .single()

            if (error) throw error

            // Filter out archived invoices after fetching
            if (data && data.invoices) {
                data.invoices = data.invoices.filter((inv: any) => !inv.archived)
            }

            setClient(data)
        } catch (error) {
            console.error("Error fetching client:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0]
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const removeFile = () => {
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleMarkAsPaid = async (invoiceId: string) => {
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid' })
                .eq('id', invoiceId)

            if (error) throw error

            // Refresh data
            fetchClientData(params.id as string)
        } catch (error) {
            console.error("Error marking invoice as paid:", error)
            alert("Error al actualizar la factura.")
        }
    }

    const handleUpdateClient = async () => {
        if (!client) return
        setEditing(true)

        try {
            let logoUrl = editForm.logo_url

            // Upload new logo if selected
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${client.id}-${Date.now()}.${fileExt}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('client-logos')
                    .upload(fileName, selectedFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('client-logos')
                    .getPublicUrl(fileName)

                logoUrl = publicUrl
            }

            const { error } = await supabase
                .from('clients')
                .update({
                    name: editForm.name,
                    company_name: editForm.company_name,
                    nit: editForm.nit,
                    email: editForm.email,
                    phone: editForm.phone,
                    address: editForm.address,
                    logo_url: logoUrl,
                    facebook: editForm.facebook,
                    instagram: editForm.instagram,
                    tiktok: editForm.tiktok,
                    website: editForm.website
                })
                .eq('id', client.id)

            if (error) throw error

            await fetchClientData(client.id)
            setIsEditModalOpen(false)
            setSelectedFile(null)
            setPreviewUrl(null)
        } catch (error) {
            console.error("Error updating client:", error)
            alert("Error al actualizar el cliente")
        } finally {
            setEditing(false)
        }
    }

    // Calculate client stats
    const totalDebt = client?.invoices
        ?.filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

    const totalSpent = client?.invoices
        ?.filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

    const activeServices = client?.subscriptions?.filter(sub => sub.status === 'active').length || 0

    const filteredInvoices = client?.invoices?.filter(inv => {
        if (invoiceFilter === 'all') return true
        return inv.status === invoiceFilter
    }) || []

    // Check for attention needed (any pending or overdue invoice)
    const hasAttentionInvoices = client?.invoices?.some(inv =>
        inv.status === 'pending' || inv.status === 'overdue'
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (!client) {
        return (
            <div className="p-8">
                <p className="text-muted-foreground">Cliente no encontrado</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-xl mb-6">
                <div className="px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/clients')}
                                className="hover:bg-gray-100"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver
                            </Button>
                            <div className="h-8 w-px bg-gray-300" />
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Cliente</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Delete - Icon Only */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                onClick={async () => {
                                    if (confirm(`¿Estás seguro de eliminar a ${client.name}? Esta acción eliminará toda su información incluyendo facturas, suscripciones y hosting. Esta acción no se puede deshacer.`)) {
                                        try {
                                            const { error } = await supabase
                                                .from('clients')
                                                .delete()
                                                .eq('id', client.id)

                                            if (error) throw error
                                            router.push('/clients')
                                        } catch (error) {
                                            console.error('Error deleting client:', error)
                                            alert('Error al eliminar cliente')
                                        }
                                    }
                                }}
                                title="Eliminar Cliente"
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>

                            {/* Notes - Icon Only */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                onClick={() => setIsNotesModalOpen(true)}
                                title="Notas"
                            >
                                <StickyNote className="h-5 w-5" />
                            </Button>

                            {/* Edit - Icon Only */}
                            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50" title="Editar Cliente">
                                        <Pencil className="h-5 w-5" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[550px]">
                                    <DialogHeader>
                                        <DialogTitle>Editar Cliente</DialogTitle>
                                        <DialogDescription>
                                            Actualiza la información del cliente organizada por secciones.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateClient(); }}>
                                        <Tabs defaultValue="profile" className="w-full">
                                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                                <TabsTrigger value="profile">Perfil</TabsTrigger>
                                                <TabsTrigger value="contact">Contacto</TabsTrigger>
                                                <TabsTrigger value="social">Redes</TabsTrigger>
                                            </TabsList>

                                            {/* TAB 1: PERFIL */}
                                            <TabsContent value="profile" className="space-y-4 py-2">
                                                <div className="flex items-center gap-4 border p-3 rounded-lg bg-gray-50/50">
                                                    <div
                                                        className="relative group cursor-pointer shrink-0"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={handleDrop}
                                                    >
                                                        <Avatar className="h-16 w-16 border-2 border-white shadow-sm group-hover:border-indigo-200 transition-colors">
                                                            <AvatarImage src={previewUrl || editForm.logo_url} className="object-cover" />
                                                            <AvatarFallback className="text-lg font-bold bg-indigo-50 text-indigo-600">
                                                                {editForm.name?.substring(0, 2).toUpperCase() || "CL"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                            <Upload className="h-4 w-4" />
                                                        </div>
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleFileSelect}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <Label className="cursor-pointer hover:text-indigo-600 transition-colors" htmlFor="logo-upload">
                                                            Logo Corporativo
                                                        </Label>
                                                        <p className="text-xs text-gray-500 mt-1">Sube una imagen cuadrada (PNG/JPG).</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="company_name">Empresa / Razón Social</Label>
                                                        <Input
                                                            id="company_name"
                                                            value={editForm.company_name}
                                                            onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                                                            placeholder="Empresa SAS"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="nit">NIT</Label>
                                                        <Input
                                                            id="nit"
                                                            value={editForm.nit}
                                                            onChange={(e) => setEditForm({ ...editForm, nit: e.target.value })}
                                                            placeholder="900.123.456-7"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="address">Dirección Fiscal</Label>
                                                    <Input
                                                        id="address"
                                                        value={editForm.address}
                                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                        placeholder="Dirección completa"
                                                    />
                                                </div>
                                            </TabsContent>

                                            {/* TAB 2: CONTACTO */}
                                            <TabsContent value="contact" className="space-y-4 py-2">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="name">Nombre del Contacto</Label>
                                                    <div className="relative">
                                                        <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                        <Input
                                                            id="name"
                                                            className="pl-9"
                                                            value={editForm.name}
                                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                            placeholder="Nombre completo"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="email">Correo Electrónico</Label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                        <Input
                                                            id="email"
                                                            className="pl-9"
                                                            value={editForm.email}
                                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                            placeholder="correo@ejemplo.com"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="phone">Teléfono / Celular</Label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                        <Input
                                                            id="phone"
                                                            className="pl-9"
                                                            value={editForm.phone}
                                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                            placeholder="+57 300 ..."
                                                        />
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            {/* TAB 3: REDES */}
                                            <TabsContent value="social" className="space-y-4 py-2">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="website">Sitio Web</Label>
                                                    <div className="relative">
                                                        <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                        <Input
                                                            id="website"
                                                            className="pl-9"
                                                            value={editForm.website}
                                                            onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                                            placeholder="www.tusitio.com"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="instagram">Instagram</Label>
                                                        <Input
                                                            id="instagram"
                                                            value={editForm.instagram}
                                                            onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                                                            placeholder="@usuario"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="facebook">Facebook</Label>
                                                        <Input
                                                            id="facebook"
                                                            value={editForm.facebook}
                                                            onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })}
                                                            placeholder="usuario"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="tiktok">TikTok</Label>
                                                        <Input
                                                            id="tiktok"
                                                            value={editForm.tiktok}
                                                            onChange={(e) => setEditForm({ ...editForm, tiktok: e.target.value })}
                                                            placeholder="@usuario"
                                                        />
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </Tabs>

                                        <DialogFooter className="pt-4 mt-2 border-t border-gray-100">
                                            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={loading} className="bg-brand-pink hover:bg-brand-pink/90 text-white">
                                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cambios"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            {/* Primary Action: Add Service (Right-Most) */}
                            <Button
                                onClick={() => {
                                    setServiceToEdit(null)
                                    setIsServiceModalOpen(true)
                                }}
                                className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-sm ml-2"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Servicio
                            </Button>
                        </div>
                    </div>
                </div >
            </div >

            {/* Main Content */}
            <div>

                {/* Client Header Card */}
                {/* Client Header - Split-Bar Modern Style */}
                <div className="mb-8 rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg overflow-hidden transition-all hover:shadow-xl sticky top-4 z-20">

                    {/* TOP ROW: Identity & Stats */}
                    <div className="p-6 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">

                        {/* Identity */}
                        <div className="flex items-center gap-5">
                            <Avatar className="h-20 w-20 rounded-2xl border-2 border-white shadow-md ring-1 ring-gray-100">
                                <AvatarImage src={client.logo_url} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 font-bold text-2xl rounded-2xl">
                                    {client.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{client.name}</h1>
                                <div className="flex items-center gap-3 mt-1 text-gray-500 font-medium">
                                    <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5" /> {client.company_name}</span>
                                    {client.nit && (
                                        <>
                                            <div className="h-1 w-1 rounded-full bg-gray-300" />
                                            <span className="text-sm">NIT: {client.nit}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats Group - Horizontal */}
                        <div className="flex items-center gap-3 w-full xl:w-auto">
                            <div className={cn("flex-1 xl:flex-none px-5 py-3 rounded-xl border flex flex-col min-w-[120px]", totalDebt > 0 ? "bg-red-50/50 border-red-100" : "bg-emerald-50/50 border-emerald-100")}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className={cn("text-[10px] uppercase font-bold tracking-wider", totalDebt > 0 ? "text-red-500" : "text-emerald-500")}>{totalDebt > 0 ? "Por Cobrar" : "Estado"}</span>
                                    <DollarSign className={cn("h-4 w-4", totalDebt > 0 ? "text-red-500" : "text-emerald-500")} />
                                </div>
                                <span className={cn("text-2xl font-bold leading-none", totalDebt > 0 ? "text-red-600" : "text-emerald-600")}>${totalDebt > 0 ? totalDebt.toLocaleString() : "Al Día"}</span>
                            </div>

                            <div className="flex-1 xl:flex-none px-5 py-3 rounded-xl border border-indigo-100 bg-indigo-50/30 flex flex-col min-w-[120px]">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">Servicios</span>
                                    <CreditCard className="h-4 w-4 text-indigo-500" />
                                </div>
                                <span className="text-2xl font-bold leading-none text-indigo-600">{activeServices}</span>
                            </div>

                            <div className="hidden md:flex flex-1 xl:flex-none px-5 py-3 rounded-xl border border-gray-100 bg-gray-50/50 flex-col min-w-[120px]">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Pagado</span>
                                    <TrendingUp className="h-4 w-4 text-gray-400" />
                                </div>
                                <span className="text-2xl font-bold leading-none text-gray-700">${totalSpent.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* BOTTOM ROW: Connectivity Bar */}
                    <div className="px-6 py-3 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">

                        {/* Contact Info */}
                        <div className="flex flex-wrap items-center gap-4 text-gray-600 w-full md:w-auto justify-center md:justify-start">
                            <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-indigo-500" />
                                <span className="font-medium cursor-copy hover:text-indigo-600 transition-colors" title="Copiar">{client.email}</span>
                            </div>
                            <div className="hidden md:block h-4 w-[1px] bg-gray-300" />
                            <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="font-medium">{client.phone}</span>
                            </div>
                            {client.address && (
                                <>
                                    <div className="hidden md:block h-4 w-[1px] bg-gray-300" />
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                        <span className="font-medium truncate max-w-[200px]">{client.address}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Actions & Socials (Full Buttons) */}
                        <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
                            {client.facebook && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 rounded-full" asChild title="Facebook">
                                    <a href={client.facebook.startsWith('http') ? client.facebook : `https://${client.facebook}`} target="_blank">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                    </a>
                                </Button>
                            )}
                            {client.instagram && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-pink-50 hover:text-pink-600 rounded-full" asChild title="Instagram">
                                    <a href={client.instagram.startsWith('http') ? client.instagram : `https://instagram.com/${client.instagram.replace('@', '')}`} target="_blank">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                    </a>
                                </Button>
                            )}
                            {client.tiktok && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 hover:text-black rounded-full" asChild title="TikTok">
                                    <a href={client.tiktok.startsWith('http') ? client.tiktok : `https://tiktok.com/@${client.tiktok.replace('@', '')}`} target="_blank">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
                                    </a>
                                </Button>
                            )}

                            {(client.facebook || client.instagram || client.tiktok) && client.website && (
                                <div className="h-4 w-[1px] bg-gray-300 mx-1" />
                            )}

                            {client.website && (
                                <Button variant="outline" size="sm" className="h-8 gap-2 hover:text-brand-pink hover:border-brand-pink/30 hover:bg-brand-pink/5" asChild>
                                    <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank">
                                        <Globe className="h-3.5 w-3.5" /> Web
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Unified Content View */}
                <div className="space-y-8 pb-20">

                    {/* 1. Services & Their Invoices (The Core View) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Server className="h-5 w-5 text-indigo-600" />
                                Servicios Activos & Facturación
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {client.services && client.services.length > 0 ? (
                                client.services.map((service: any) => {
                                    const linkedInvoices = getServiceInvoices(service.id)
                                    // Sort by date (newest first)
                                    const recentInvoices = linkedInvoices
                                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .slice(0, 3) // Only top 3

                                    return (
                                        <div
                                            key={service.id}
                                            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden group cursor-pointer hover:border-indigo-300"
                                            onClick={() => {
                                                setSelectedServiceForDetail(service)
                                                setIsDetailModalOpen(true)
                                            }}
                                        >
                                            {/* 1. Header: Icon, Name, Actions */}
                                            <div className="p-4 flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={cn(
                                                        "p-2 rounded-lg shrink-0",
                                                        service.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                    )}>
                                                        <Server className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-gray-900 truncate">{service.name}</h3>
                                                            {service.status === 'paused' && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-amber-100 text-amber-700">Pausado</Badge>}
                                                        </div>
                                                        <div className="flex items-center text-xs text-gray-500 mt-0.5 gap-2">
                                                            <span className="capitalize">{service.frequency === 'monthly' ? 'Mensual' : service.frequency === 'yearly' ? 'Anual' : 'Único'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 shrink-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuItem onClick={(e) => {
                                                            e.stopPropagation()
                                                            setServiceToEdit(service)
                                                            setIsServiceModalOpen(true)
                                                        }}>
                                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        {service.status === 'active' ? (
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation()
                                                                handlePauseService(service.id)
                                                            }} className="text-amber-600">
                                                                <PauseCircle className="mr-2 h-4 w-4" /> Pausar
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedServiceForResume(service)
                                                                setIsResumeModalOpen(true)
                                                            }} className="text-emerald-600">
                                                                <PlayCircle className="mr-2 h-4 w-4" /> Reanudar
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteService(service.id)
                                                            }}
                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* 2. Middle: Compact Invoice Table */}
                                            <div className="px-4 py-2 flex-1">
                                                {recentInvoices.length > 0 ? (
                                                    <div className="bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden">
                                                        <table className="w-full text-xs text-left">
                                                            <tbody className="divide-y divide-gray-100">
                                                                {recentInvoices.map((inv: any) => (
                                                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                                                        <td className="py-2 pl-3 font-medium text-gray-700">#{inv.number}</td>
                                                                        <td className="py-2 text-gray-500 text-[10px]">{new Date(inv.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</td>
                                                                        <td className="py-2 pr-2 text-right">
                                                                            <Badge variant="outline" className={cn(
                                                                                "text-[9px] px-1 py-0 h-4 border-0",
                                                                                inv.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                                                                                    inv.status === 'overdue' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                                                                            )}>
                                                                                {inv.status === 'paid' ? 'Pagada' : inv.status === 'overdue' ? 'Vencida' : 'Pend.'}
                                                                            </Badge>
                                                                        </td>
                                                                        <td className="py-2 pr-2 w-[24px]">
                                                                            {inv.pdf_url && (
                                                                                <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 block">
                                                                                    <Eye className="h-3 w-3" />
                                                                                </a>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center p-4 bg-gray-50/30 rounded-lg border border-gray-100 border-dashed">
                                                        <span className="text-[10px] text-gray-400 italic">Sin facturas recientes</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 3. Footer: Cost & Billing Date */}
                                            <div className="mt-2 py-3 px-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Costo</span>
                                                    <span className="font-bold text-gray-900">${service.amount?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {/* Actions for Latest Invoice */}
                                                    {recentInvoices.length > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            {(() => {
                                                                const latestInvoice = recentInvoices[0]; // Any invoice works for HTML view
                                                                const latestUnpaidInvoice = recentInvoices.find((inv: any) => inv.status !== 'paid')

                                                                return (
                                                                    <>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                            title="Ver Factura"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                if (latestInvoice?.id) window.open(`/invoices/${latestInvoice.id}`, '_blank')
                                                                            }}
                                                                        >
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                        </Button>

                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                                            title="Compartir Factura"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                if (latestInvoice) {
                                                                                    setInvoiceToShare(latestInvoice)
                                                                                    setIsShareInvoiceModalOpen(true)
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Share2 className="h-3.5 w-3.5" />
                                                                        </Button>

                                                                        {latestUnpaidInvoice && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                                                title={`Marcar Factura #${latestUnpaidInvoice.number} como Pagada`}
                                                                                onClick={() => handleMarkAsPaid(latestUnpaidInvoice.id)}
                                                                            >
                                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )
                                                            })()}
                                                        </div>
                                                    )}

                                                    {service.next_billing_date && (
                                                        <div className="text-right border-l border-gray-200 pl-4">
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                <CalendarClock className="h-3.5 w-3.5" />
                                                                <span>{new Date(service.next_billing_date).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                                    <div className="bg-gray-50 p-4 rounded-full w-fit mx-auto mb-4">
                                        <Server className="h-8 w-8 text-indigo-200" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Sin Servicios Activos</h3>
                                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">Este cliente no tiene ningún servicio registrado. Comienza añadiendo uno desde el botón superior.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Unlinked / General Invoices */}
                    {getUnlinkedInvoices().length > 0 && (
                        <div className="pt-8 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    Facturas Generales (Sin Servicio)
                                </h2>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                                <div className="p-4 space-y-2">
                                    {getUnlinkedInvoices().map((inv: any) => (
                                        <div key={inv.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                            <div className="flex items-center gap-4">
                                                <span className="font-medium">{inv.number}</span>
                                                <span className="text-gray-500 text-sm">{inv.description || "Sin descripción"}</span>
                                                <Badge variant="outline" className={cn("text-[10px]",
                                                    inv.status === 'paid' ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                                                        inv.status === 'overdue' ? "text-red-600 bg-red-50 border-red-100" : "text-gray-600"
                                                )}>
                                                    {inv.status === 'paid' ? 'Pagada' : inv.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold">${inv.total.toLocaleString()}</span>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50", !inv.pdf_url && "opacity-50 cursor-not-allowed")}
                                                        title={inv.pdf_url ? "Ver Factura" : "Sin PDF disponible"}
                                                        disabled={!inv.pdf_url}
                                                        onClick={() => inv.pdf_url && window.open(inv.pdf_url, '_blank')}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50", !inv.pdf_url && "opacity-50 cursor-not-allowed")}
                                                        title={inv.pdf_url ? "Compartir Factura" : "Sin PDF disponible"}
                                                        disabled={!inv.pdf_url}
                                                        onClick={() => {
                                                            if (inv.pdf_url) {
                                                                setInvoiceToShare(inv)
                                                                setIsShareInvoiceModalOpen(true)
                                                            }
                                                        }}
                                                    >
                                                        <Share2 className="h-4 w-4" />
                                                    </Button>

                                                    {inv.status !== 'paid' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                            title="Marcar como Pagada"
                                                            onClick={() => handleMarkAsPaid(inv.id)}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modals */}
                <AddServiceModal
                    clientId={client.id}
                    clientName={client.name}
                    open={isServiceModalOpen}
                    onOpenChange={setIsServiceModalOpen}
                    serviceToEdit={serviceToEdit}
                    onSuccess={() => fetchClientData(client.id)}
                    trigger={<span className="hidden" />}
                />

                <NotesModal
                    clientId={client.id}
                    initialNotes={client.notes || ""}
                    isOpen={isNotesModalOpen}
                    onClose={() => setIsNotesModalOpen(false)}
                    onSuccess={(newNotes) => {
                        setClient({ ...client, notes: newNotes })
                    }}
                />

                <ServiceDetailModal
                    isOpen={isDetailModalOpen}
                    onOpenChange={setIsDetailModalOpen}
                    service={selectedServiceForDetail}
                />

                <ResumeServiceModal
                    service={selectedServiceForResume}
                    isOpen={isResumeModalOpen}
                    onClose={() => setIsResumeModalOpen(false)}
                    onSuccess={() => fetchClientData(client.id)}
                />

                <ShareInvoiceModal
                    isOpen={isShareInvoiceModalOpen}
                    onOpenChange={setIsShareInvoiceModalOpen}
                    invoice={invoiceToShare}
                    client={client}
                    settings={settings}
                />
            </div >
        </div >
    )
}
// End of component
