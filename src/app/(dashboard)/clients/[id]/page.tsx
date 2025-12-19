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
    Copy,
    MessageCircle,
    Edit,
    RefreshCw
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getSettings } from "@/lib/actions/settings"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { cn } from "@/lib/utils"
import { CreateInvoiceModal } from "@/components/modules/invoices/create-invoice-modal"
import { AddServiceModal } from "@/components/modules/services/add-service-modal"
import { regeneratePortalToken } from "@/app/actions/portal-actions"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
    const [activeTab, setActiveTab] = useState("services")

    // Notes state
    const [notes, setNotes] = useState("")
    const [savingNotes, setSavingNotes] = useState(false)

    // Add Service Modal State
    const [invoiceFilter, setInvoiceFilter] = useState("all")

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
            setNotes(data?.notes || "")
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
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
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
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </Button>

                            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                        <DialogTitle>Editar Cliente</DialogTitle>
                                        <DialogDescription>
                                            Actualiza la información del cliente.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-1">
                                        {/* Logo Upload - Featured Section */}
                                        <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
                                            {!previewUrl ? (
                                                <div
                                                    className={cn(
                                                        "w-32 h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all",
                                                        "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
                                                    )}
                                                    onDrop={handleDrop}
                                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                                    <p className="text-xs font-medium text-gray-600">Logo del cliente</p>
                                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG • 300x300</p>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleFileSelect}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="relative w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-indigo-200">
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg"
                                                        onClick={removeFile}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Basic Information Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1.5 bg-indigo-100 rounded-lg">
                                                    <FileText className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <h3 className="font-semibold text-gray-900">Información Básica</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-name" className="text-sm font-medium flex items-center gap-1.5">
                                                        Nombre Completo
                                                        <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="edit-name"
                                                        placeholder="Juan Pérez"
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-company" className="text-sm font-medium">
                                                        Empresa
                                                    </Label>
                                                    <Input
                                                        id="edit-company"
                                                        placeholder="Agencia S.A.S"
                                                        value={editForm.company_name}
                                                        onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Details Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                                    <Mail className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <h3 className="font-semibold text-gray-900">Datos de Contacto</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-email" className="text-sm font-medium flex items-center gap-1.5">
                                                        Email
                                                        <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="edit-email"
                                                        type="email"
                                                        placeholder="cliente@empresa.com"
                                                        value={editForm.email}
                                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-phone" className="text-sm font-medium">
                                                        Teléfono
                                                    </Label>
                                                    <Input
                                                        id="edit-phone"
                                                        placeholder="+57 300 123 4567"
                                                        value={editForm.phone}
                                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Business Information Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1.5 bg-purple-100 rounded-lg">
                                                    <CreditCard className="h-4 w-4 text-purple-600" />
                                                </div>
                                                <h3 className="font-semibold text-gray-900">Información Fiscal</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-nit" className="text-sm font-medium">
                                                        NIT / ID
                                                    </Label>
                                                    <Input
                                                        id="edit-nit"
                                                        placeholder="900.123.456-7"
                                                        value={editForm.nit}
                                                        onChange={(e) => setEditForm({ ...editForm, nit: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-address" className="text-sm font-medium">
                                                        Dirección
                                                    </Label>
                                                    <Input
                                                        id="edit-address"
                                                        placeholder="Calle 123 #45-67"
                                                        value={editForm.address}
                                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Social Media Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1.5 bg-green-100 rounded-lg">
                                                    <Globe className="h-4 w-4 text-green-600" />
                                                </div>
                                                <h3 className="font-semibold text-gray-900">Redes Sociales</h3>
                                                <span className="text-xs text-gray-500">(opcional)</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-facebook" className="text-sm font-medium">
                                                        Facebook
                                                    </Label>
                                                    <Input
                                                        id="edit-facebook"
                                                        placeholder="facebook.com/empresa"
                                                        value={editForm.facebook}
                                                        onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-instagram" className="text-sm font-medium">
                                                        Instagram
                                                    </Label>
                                                    <Input
                                                        id="edit-instagram"
                                                        placeholder="@empresa"
                                                        value={editForm.instagram}
                                                        onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-tiktok" className="text-sm font-medium">
                                                        TikTok
                                                    </Label>
                                                    <Input
                                                        id="edit-tiktok"
                                                        placeholder="@empresa"
                                                        value={editForm.tiktok}
                                                        onChange={(e) => setEditForm({ ...editForm, tiktok: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-website" className="text-sm font-medium">
                                                        Sitio Web
                                                    </Label>
                                                    <Input
                                                        id="edit-website"
                                                        placeholder="https://empresa.com"
                                                        value={editForm.website}
                                                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                                        className="h-10"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleUpdateClient} disabled={editing} className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                                            {editing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Guardar Cambios
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {(client.portal_token || client.portal_short_token) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-50">
                                            <Globe className="mr-2 h-4 w-4" />
                                            Portal
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => {
                                            const token = client.portal_short_token || client.portal_token
                                            const domain = window.location.origin
                                            window.open(`${domain}/portal/${token}`, '_blank')
                                        }}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Ver Portal
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            const token = client.portal_short_token || client.portal_token
                                            const domain = window.location.origin
                                            const url = `${domain}/portal/${token}`
                                            navigator.clipboard.writeText(url)
                                            alert("Enlace copiado al portapapeles")
                                        }}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copiar Enlace
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            const token = client.portal_short_token || client.portal_token
                                            const domain = window.location.origin
                                            const url = `${domain}/portal/${token}`
                                            const text = `Hola ${client.name}, aquí tienes tu enlace al portal de clientes para ver tus facturas y realizar pagos: ${url}`
                                            const waUrl = getWhatsAppLink(client.phone, text, settings)
                                            window.open(waUrl, '_blank')
                                        }}>
                                            <MessageCircle className="mr-2 h-4 w-4" />
                                            Enviar por WhatsApp
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={async () => {
                                            if (confirm("¿Estás seguro de regenerar el token? El enlace anterior dejará de funcionar.")) {
                                                try {
                                                    const res = await regeneratePortalToken(client.id)
                                                    if (res.success) {
                                                        fetchClientData(client.id)
                                                        alert("Token regenerado exitosamente")
                                                    }
                                                } catch (e) {
                                                    console.error(e)
                                                    alert("Error al regenerar token")
                                                }
                                            }
                                        }}>
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Regenerar Token
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div>

                {/* Client Header Card */}
                <Card className="mb-8 border-0 shadow-lg">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Left: Logo & Info */}
                            <div className="flex items-start gap-6">
                                <Avatar className="h-24 w-24 rounded-xl border border-gray-100 shadow-sm">
                                    <AvatarImage src={client.logo_url} alt={client.name} className="object-contain p-1" />
                                    <AvatarFallback className="text-2xl font-bold bg-gray-100 text-gray-600 rounded-xl">
                                        {client.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h2 className="text-3xl font-bold text-gray-900 mb-1">{client.name}</h2>
                                    <p className="text-lg text-gray-600 mb-4">{client.company_name}</p>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <span>{client.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span>{client.phone}</span>
                                        </div>
                                        {client.address && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                                <span>{client.address}</span>
                                            </div>
                                        )}
                                        {client.nit && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <FileText className="h-4 w-4 text-gray-400" />
                                                <span>NIT: {client.nit}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Middle: Social Media */}
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-gray-400" />
                                    Redes Sociales
                                </h3>
                                <div className="space-y-2">
                                    {client.facebook && (
                                        <a href={client.facebook.startsWith('http') ? client.facebook : `https://${client.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-pink transition-colors">
                                            <div className="p-1.5 bg-brand-pink/10 rounded border border-brand-pink/20">
                                                <svg className="h-3.5 w-3.5 text-brand-pink" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                            </div>
                                            <span className="truncate">Facebook</span>
                                        </a>
                                    )}
                                    {client.instagram && (
                                        <a href={client.instagram.startsWith('http') ? client.instagram : `https://instagram.com/${client.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-pink transition-colors">
                                            <div className="p-1.5 bg-brand-pink/10 rounded border border-brand-pink/20">
                                                <svg className="h-3.5 w-3.5 text-brand-pink" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                            </div>
                                            <span className="truncate">Instagram</span>
                                        </a>
                                    )}
                                    {client.tiktok && (
                                        <a href={client.tiktok.startsWith('http') ? client.tiktok : `https://tiktok.com/@${client.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-pink transition-colors">
                                            <div className="p-1.5 bg-brand-pink/10 rounded border border-brand-pink/20">
                                                <svg className="h-3.5 w-3.5 text-brand-pink" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
                                            </div>
                                            <span className="truncate">TikTok</span>
                                        </a>
                                    )}
                                    {client.website && (
                                        <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-pink transition-colors">
                                            <div className="p-1.5 bg-brand-pink/10 rounded border border-brand-pink/20">
                                                <Globe className="h-3.5 w-3.5 text-brand-pink" />
                                            </div>
                                            <span className="truncate">Sitio Web</span>
                                        </a>
                                    )}
                                    {!client.facebook && !client.instagram && !client.tiktok && !client.website && (
                                        <p className="text-xs text-gray-400 italic">Sin redes sociales</p>
                                    )}
                                </div>
                            </div>

                            {/* Right: Stats - Vertical Stack */}
                            <div className="flex flex-col gap-2 md:min-w-[180px]">
                                <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 mb-1">Por Cobrar</p>
                                            <p className={cn("text-xl font-bold", totalDebt > 0 ? "text-red-600" : "text-gray-900")}>${totalDebt.toLocaleString()}</p>
                                        </div>
                                        <div className={cn("p-2 rounded-lg", totalDebt > 0 ? "bg-red-50" : "bg-gray-50")}>
                                            <DollarSign className={cn("h-4 w-4", totalDebt > 0 ? "text-red-600" : "text-gray-400")} />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 mb-1">Pagado</p>
                                            <p className="text-xl font-bold text-gray-900">${totalSpent.toLocaleString()}</p>
                                        </div>
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            <TrendingUp className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-xs text-gray-500 mb-1">Servicios</p>
                                            <p className="text-xl font-bold text-indigo-600">{activeServices}</p>
                                        </div>
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <CreditCard className="h-4 w-4 text-indigo-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs Navigation */}
                <div className="mb-6">
                    <div className="flex gap-2 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
                        <button
                            onClick={() => setActiveTab("services")}
                            className={cn(
                                "flex-1 px-6 py-3 rounded-lg font-medium text-sm transition-all",
                                activeTab === "services"
                                    ? "bg-brand-dark text-white shadow-md"
                                    : "text-gray-600 hover:bg-gray-100"
                            )}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>Servicios</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab("invoices")}
                            className={cn(
                                "flex-1 px-6 py-3 rounded-lg font-medium text-sm transition-all",
                                activeTab === "invoices"
                                    ? "bg-brand-dark text-white shadow-md"
                                    : "text-gray-600 hover:bg-gray-100"
                            )}
                        >
                            <div className="flex items-center justify-center gap-2 relative">
                                <FileText className="h-4 w-4" />
                                <span>Facturas</span>
                                {hasAttentionInvoices && (
                                    <AlertCircle className="h-4 w-4 text-brand-pink animate-pulse" />
                                )}
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab("notes")}
                            className={cn(
                                "flex-1 px-6 py-3 rounded-lg font-medium text-sm transition-all",
                                activeTab === "notes"
                                    ? "bg-brand-dark text-white shadow-md"
                                    : "text-gray-600 hover:bg-gray-100"
                            )}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>Datos y Notas</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Tab Content: Services */}
                {
                    activeTab === "services" && (
                        <div className="space-y-6">
                            {/* Subscriptions Section */}
                            <Card className="border-0 shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between pb-4">
                                    <div>
                                        <CardTitle className="text-xl font-bold">Suscripciones Activas</CardTitle>
                                        <CardDescription className="mt-1">Servicios recurrentes del cliente</CardDescription>
                                    </div>
                                    <AddServiceModal
                                        clientId={client.id}
                                        clientName={client.name}
                                        onSuccess={() => fetchClientData(client.id)}
                                        trigger={
                                            <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Añadir Servicio
                                            </Button>
                                        }
                                    />
                                </CardHeader>
                                <CardContent>
                                    {client.subscriptions?.filter(sub => sub.status === 'active' && sub.service_type !== 'hosting').length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                            <p className="text-sm text-gray-500">No hay suscripciones activas</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {client.subscriptions?.filter(sub => sub.status === 'active' && sub.service_type !== 'hosting').map((sub) => (
                                                <Card key={sub.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className={cn(
                                                                    "p-3 rounded-lg border",
                                                                    sub.service_type === 'marketing' ? "bg-blue-50 border-blue-200 text-blue-700" :
                                                                        sub.service_type === 'marketing_ads' ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                                                                            sub.service_type === 'ads' ? "bg-purple-50 border-purple-200 text-purple-700" :
                                                                                sub.service_type === 'branding' ? "bg-pink-50 border-pink-200 text-pink-700" :
                                                                                    sub.service_type === 'crm' ? "bg-orange-50 border-orange-200 text-orange-700" :
                                                                                        sub.service_type === 'hosting' ? "bg-slate-50 border-slate-200 text-slate-700" :
                                                                                            "bg-gray-50 border-gray-200 text-gray-700"
                                                                )}>
                                                                    <CreditCard className="h-5 w-5" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-semibold text-gray-900">{sub.name}</h4>
                                                                    <p className="text-sm text-gray-500">
                                                                        {sub.frequency === 'one-time'
                                                                            ? 'Servicio único'
                                                                            : `${sub.frequency === 'biweekly' ? 'Quincenal' : sub.frequency === 'monthly' ? 'Mensual' : sub.frequency === 'quarterly' ? 'Trimestral' : 'Anual'} • Próximo cobro: ${sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : 'N/A'}`
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-right">
                                                                    <p className="text-xl font-bold text-gray-900">${sub.amount?.toLocaleString()}</p>
                                                                    <Badge className="bg-green-100 text-green-700 border-green-300 mt-1">Activo</Badge>
                                                                </div>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-56">
                                                                        <AddServiceModal
                                                                            clientId={client.id}
                                                                            clientName={client.name}
                                                                            serviceToEdit={sub}
                                                                            onSuccess={() => fetchClientData(client.id)}
                                                                            trigger={
                                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                                    <span>Editar</span>
                                                                                </DropdownMenuItem>
                                                                            }
                                                                        />
                                                                        {sub.invoice_id && (
                                                                            <>
                                                                                <DropdownMenuItem onClick={() => router.push(`/invoices/${sub.invoice_id}`)}>
                                                                                    <FileText className="mr-2 h-4 w-4" />
                                                                                    <span>Ver Factura</span>
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    disabled={sub.invoice?.sent}
                                                                                    onClick={async () => {
                                                                                        if (!sub.invoice?.sent) {
                                                                                            try {
                                                                                                const { error } = await supabase
                                                                                                    .from('invoices')
                                                                                                    .update({ sent: true })
                                                                                                    .eq('id', sub.invoice_id)
                                                                                                if (error) throw error
                                                                                                await fetchClientData(client.id)
                                                                                            } catch (error) {
                                                                                                console.error('Error marking as sent:', error)
                                                                                                alert('Error al marcar como enviada')
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {sub.invoice?.sent ? (
                                                                                        <>
                                                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                                            <span className="text-muted-foreground">Enviada</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Send className="mr-2 h-4 w-4" />
                                                                                            <span>Marcar Enviada</span>
                                                                                        </>
                                                                                    )}
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                        <DropdownMenuItem
                                                                            className="text-red-600 focus:text-red-600"
                                                                            onClick={async () => {
                                                                                if (confirm('¿Eliminar esta suscripción y su factura asociada?')) {
                                                                                    try {
                                                                                        if (sub.invoice_id) {
                                                                                            await supabase
                                                                                                .from('invoices')
                                                                                                .delete()
                                                                                                .eq('id', sub.invoice_id)
                                                                                        }
                                                                                        const { error } = await supabase
                                                                                            .from('subscriptions')
                                                                                            .delete()
                                                                                            .eq('id', sub.id)
                                                                                        if (error) throw error
                                                                                        await fetchClientData(client.id)
                                                                                    } catch (error) {
                                                                                        console.error('Error deleting subscription:', error)
                                                                                        alert('Error al eliminar suscripción')
                                                                                    }
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            <span>Eliminar</span>
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Hosting Section */}
                            <Card className="border-0 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-xl font-bold">Hosting & Dominios</CardTitle>
                                    <CardDescription className="mt-1">Servicios de alojamiento y dominios</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {client.subscriptions?.filter(sub => sub.status === 'active' && sub.service_type === 'hosting').length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                            <Server className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                            <p className="text-sm text-gray-500">No hay servicios de hosting registrados</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {client.subscriptions?.filter(sub => sub.status === 'active' && sub.service_type === 'hosting').map((sub) => (
                                                <Card key={sub.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                                                                    <Server className="h-5 w-5" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-semibold text-gray-900">{sub.name}</h4>
                                                                    <p className="text-sm text-gray-500">
                                                                        {sub.frequency === 'one-time'
                                                                            ? 'Servicio único'
                                                                            : `${sub.frequency === 'biweekly' ? 'Quincenal' : sub.frequency === 'monthly' ? 'Mensual' : sub.frequency === 'quarterly' ? 'Trimestral' : 'Anual'} • Próximo cobro: ${sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : 'N/A'}`
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-right">
                                                                    <p className="text-xl font-bold text-gray-900">${sub.amount?.toLocaleString()}</p>
                                                                    <Badge className="bg-green-100 text-green-700 border-green-300 mt-1">Activo</Badge>
                                                                </div>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-56">
                                                                        <AddServiceModal
                                                                            clientId={client.id}
                                                                            clientName={client.name}
                                                                            serviceToEdit={sub}
                                                                            onSuccess={() => fetchClientData(client.id)}
                                                                            trigger={
                                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                                    <span>Editar</span>
                                                                                </DropdownMenuItem>
                                                                            }
                                                                        />
                                                                        {sub.invoice_id && (
                                                                            <>
                                                                                <DropdownMenuItem onClick={() => router.push(`/invoices/${sub.invoice_id}`)}>
                                                                                    <FileText className="mr-2 h-4 w-4" />
                                                                                    <span>Ver Factura</span>
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    disabled={sub.invoice?.sent}
                                                                                    onClick={async () => {
                                                                                        if (!sub.invoice?.sent) {
                                                                                            try {
                                                                                                const { error } = await supabase
                                                                                                    .from('invoices')
                                                                                                    .update({ sent: true })
                                                                                                    .eq('id', sub.invoice_id)
                                                                                                if (error) throw error
                                                                                                await fetchClientData(client.id)
                                                                                            } catch (error) {
                                                                                                console.error('Error marking as sent:', error)
                                                                                                alert('Error al marcar como enviada')
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <Send className={cn("mr-2 h-4 w-4", sub.invoice?.sent ? "text-muted-foreground" : "")} />
                                                                                    <span>{sub.invoice?.sent ? 'Ya enviada' : 'Marcar como enviada'}</span>
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                        <DropdownMenuItem
                                                                            className="text-red-600 focus:text-red-600"
                                                                            onClick={async () => {
                                                                                if (confirm('¿Estás seguro de que deseas eliminar esta suscripción?')) {
                                                                                    try {
                                                                                        const { error } = await supabase
                                                                                            .from('subscriptions')
                                                                                            .delete()
                                                                                            .eq('id', sub.id)
                                                                                        if (error) throw error
                                                                                        await fetchClientData(client.id)
                                                                                    } catch (error) {
                                                                                        console.error('Error deleting subscription:', error)
                                                                                        alert('Error al eliminar la suscripción')
                                                                                    }
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            <span>Eliminar Suscripción</span>
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )
                }

                {/* Tab Content: Invoices */}
                {
                    activeTab === "invoices" && (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="text-xl font-bold">Historial de Facturas</CardTitle>
                                    <CardDescription className="mt-1">Todas las cuentas de cobro del cliente</CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={invoiceFilter}
                                        onChange={(e) => setInvoiceFilter(e.target.value)}
                                    >
                                        <option value="all">Todas</option>
                                        <option value="pending">Pendientes</option>
                                        <option value="paid">Pagadas</option>
                                        <option value="overdue">Vencidas</option>
                                    </select>
                                    <CreateInvoiceModal
                                        clientId={client.id}
                                        clientName={client.name}
                                        onInvoiceCreated={() => fetchClientData(client.id)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {filteredInvoices.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                        <p className="text-sm text-gray-500">No hay facturas registradas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredInvoices.map((inv, index) => (
                                            <Card
                                                key={inv.id}
                                                className={cn(
                                                    "border border-gray-200 hover:shadow-md transition-all cursor-pointer",
                                                    index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                                )}
                                                onClick={() => router.push(`/invoices/${inv.id}`)}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                                                <FileText className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900">Factura #{inv.number}</p>
                                                                <div className="flex gap-4 text-sm text-gray-500">
                                                                    <span>Emisión: {inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A'}</span>
                                                                    {inv.due_date && (
                                                                        <span className={cn(
                                                                            "font-medium",
                                                                            new Date(inv.due_date) < new Date() && inv.status !== 'paid' ? "text-red-600" : "text-gray-500"
                                                                        )}>
                                                                            Vence: {new Date(inv.due_date).toLocaleDateString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <p className="text-xl font-bold text-gray-900">${inv.total?.toLocaleString()}</p>
                                                                <Badge className={cn(
                                                                    "mt-1",
                                                                    inv.status === 'paid' ? "bg-green-100 text-green-700 border-green-300" :
                                                                        inv.status === 'pending' ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                                                                            "bg-red-100 text-red-700 border-red-300"
                                                                )}>
                                                                    {inv.status === 'paid' ? 'Pagada' : inv.status === 'pending' ? 'Pendiente' : 'Vencida'}
                                                                </Badge>
                                                            </div>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                    <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <CreateInvoiceModal
                                                                        clientId={client.id}
                                                                        clientName={client.name}
                                                                        invoiceToEdit={inv}
                                                                        onInvoiceCreated={() => fetchClientData(client.id)}
                                                                        trigger={
                                                                            <DropdownMenuItem
                                                                                onSelect={(e) => e.preventDefault()}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <Edit className="mr-2 h-4 w-4" />
                                                                                <span>Editar</span>
                                                                            </DropdownMenuItem>
                                                                        }
                                                                    />
                                                                    {inv.status !== 'paid' && (
                                                                        <DropdownMenuItem
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation()
                                                                                try {
                                                                                    const { error } = await supabase
                                                                                        .from('invoices')
                                                                                        .update({ status: 'paid' })
                                                                                        .eq('id', inv.id)
                                                                                    if (error) throw error

                                                                                    const { data: subscription } = await supabase
                                                                                        .from('subscriptions')
                                                                                        .select('*')
                                                                                        .eq('invoice_id', inv.id)
                                                                                        .single()

                                                                                    if (subscription && subscription.frequency === 'one-time') {
                                                                                        await supabase
                                                                                            .from('subscriptions')
                                                                                            .update({ status: 'cancelled' })
                                                                                            .eq('id', subscription.id)
                                                                                    }

                                                                                    await fetchClientData(client.id)
                                                                                } catch (error) {
                                                                                    console.error("Error updating invoice:", error)
                                                                                    alert("Error al marcar como pagada")
                                                                                }
                                                                            }}
                                                                        >
                                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                            <span>Marcar Pagada</span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation()
                                                                            if (confirm('¿Archivar esta factura?')) {
                                                                                try {
                                                                                    const { error } = await supabase
                                                                                        .from('invoices')
                                                                                        .update({ archived: true })
                                                                                        .eq('id', inv.id)
                                                                                    if (error) throw error
                                                                                    await fetchClientData(client.id)
                                                                                } catch (error) {
                                                                                    console.error('Error archiving invoice:', error)
                                                                                    alert('Error al archivar factura')
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <FileText className="mr-2 h-4 w-4" />
                                                                        <span>Archivar</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="text-red-600 focus:text-red-600"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation()
                                                                            if (confirm('¿Eliminar esta factura?')) {
                                                                                try {
                                                                                    const { error } = await supabase
                                                                                        .from('invoices')
                                                                                        .delete()
                                                                                        .eq('id', inv.id)
                                                                                    if (error) throw error
                                                                                    await fetchClientData(client.id)
                                                                                } catch (error) {
                                                                                    console.error("Error deleting invoice:", error)
                                                                                    alert("Error al eliminar factura")
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        <span>Eliminar</span>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                }

                {/* Tab Content: Notes */}
                {
                    activeTab === "notes" && (
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold">Datos y Notas del Cliente</CardTitle>
                                <CardDescription className="mt-1">Almacena información importante como contraseñas, accesos, notas, etc.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Escribe aquí notas, contraseñas, accesos, o cualquier información importante del cliente..."
                                        className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
                                    />
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-500">
                                            {notes.length} caracteres
                                        </p>
                                        <Button
                                            onClick={async () => {
                                                if (!client) return
                                                setSavingNotes(true)
                                                try {
                                                    const { error } = await supabase
                                                        .from('clients')
                                                        .update({ notes: notes })
                                                        .eq('id', client.id)
                                                    if (error) throw error
                                                    await fetchClientData(client.id)
                                                    alert('Notas guardadas correctamente')
                                                } catch (error) {
                                                    console.error('Error saving notes:', error)
                                                    alert('Error al guardar notas')
                                                } finally {
                                                    setSavingNotes(false)
                                                }
                                            }}
                                            disabled={savingNotes}
                                            className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0"
                                        >
                                            {savingNotes ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    Guardar Notas
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                }
            </div >
        </div >
    )
}
