"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Search, Phone, Mail, Calendar, ArrowRight, AlertTriangle, CheckCircle2, Clock, Loader2, Upload, X, Image as ImageIcon, Globe, CreditCard, FileText, LayoutGrid, Rows } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { getSettings } from "@/lib/actions/settings"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { WhatsAppActionsModal } from "@/components/modules/clients/whatsapp-modal"
import { AddServiceModal } from "@/components/modules/services/add-service-modal"

// Types
type Client = {
    id: string
    created_at: string
    user_id: string
    name: string
    company_name: string
    email: string
    phone: string
    logo_url?: string
    invoices: { id: string; total: number; status: string; due_date?: string }[]
    hosting_accounts: { status: string; renewal_date: string }[]
    subscriptions: { id: string; name: string; next_billing_date: string; status: string; amount: number; service_type: string; frequency: string }[]
    services?: { id: string; status: string; name: string }[]
    quotes?: { id: string; number: string; total: number; status: string; pdf_url?: string }[]
    portal_token?: string
    portal_short_token?: string
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [settings, setSettings] = useState<any>(null)

    useEffect(() => {
        getSettings().then(setSettings)
    }, [])

    // Create Client Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newClient, setNewClient] = useState({
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

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    // Invoices Modal State
    const [isInvoicesModalOpen, setIsInvoicesModalOpen] = useState(false)
    const [selectedClientForInvoices, setSelectedClientForInvoices] = useState<Client | null>(null)

    // WhatsApp Actions Modal
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
    const [selectedClientForWhatsApp, setSelectedClientForWhatsApp] = useState<Client | null>(null)

    // Add Service Modal
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
    const [selectedClientForService, setSelectedClientForService] = useState<Client | null>(null)

    // View State
    const [isCompactView, setIsCompactView] = useState(false)

    const handleOpenInvoices = (client: Client) => {
        setSelectedClientForInvoices(client)
        setIsInvoicesModalOpen(true)
    }

    const handleMarkAsPaid = async (invoiceId: string) => {
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid' })
                .eq('id', invoiceId)

            if (error) throw error

            // Update local state
            if (selectedClientForInvoices) {
                const updatedInvoices = selectedClientForInvoices.invoices.map(inv =>
                    inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
                )
                setSelectedClientForInvoices({ ...selectedClientForInvoices, invoices: updatedInvoices })
            }

            // Refresh main list
            fetchClients()
        } catch (error) {
            console.error("Error marking invoice as paid:", error)
            alert("Error al actualizar la factura.")
        }
    }

    useEffect(() => {
        fetchClients()
    }, [])

    const fetchClients = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clients')
                .select(`
          *,
          portal_token,
          portal_short_token,
          invoices (id, total, status, due_date, number, pdf_url),
          quotes (id, number, total, status, pdf_url),
          hosting_accounts (status, renewal_date),
          subscriptions (id, name, next_billing_date, status, amount, service_type, frequency),
          services (id, status)
        `)

            if (error) throw error

            if (data) {
                // @ts-ignore
                setClients(data as unknown as Client[])
            }
        } catch (error) {
            console.error("Error fetching clients:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
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

    const handleCreateClient = async () => {
        setCreating(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                alert("Sesión expirada. Por favor inicia sesión nuevamente.")
                return
            }

            let finalLogoUrl = newClient.logo_url

            // Upload Image if selected
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${user.id}/${fileName}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('client-logos')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) {
                    console.error("Upload error:", uploadError)
                    alert("Error subiendo la imagen. Por favor intenta de nuevo.")
                    throw uploadError
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('client-logos')
                    .getPublicUrl(filePath)

                finalLogoUrl = publicUrl
                console.log("Logo uploaded successfully:", publicUrl)
            }

            const { error } = await supabase.from('clients').insert({
                ...newClient,
                logo_url: finalLogoUrl,
                user_id: user.id
            })

            if (error) throw error

            // Success
            await fetchClients()
            setIsCreateModalOpen(false)
            setNewClient({
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
            removeFile()

        } catch (error) {
            console.error("Error creating client:", error)
            alert("Error al crear el cliente. Verifica los datos.")
        } finally {
            setCreating(false)
        }
    }

    const getNextPayment = (client: Client) => {
        const dates: { date: Date, source: string }[] = []

        // Add hosting renewals
        client.hosting_accounts?.forEach(h => {
            if (h.status === 'active' && h.renewal_date) dates.push({ date: new Date(h.renewal_date), source: 'Hosting' })
        })

        // Add subscriptions
        client.subscriptions?.forEach(s => {
            if (s.status === 'active' && s.next_billing_date) dates.push({ date: new Date(s.next_billing_date), source: s.name })
        })

        if (dates.length === 0) return null

        // Sort by date asc
        dates.sort((a, b) => a.date.getTime() - b.date.getTime())
        return dates[0]
    }

    const getDaysDiff = (targetDate: Date) => {
        const now = new Date()
        const diffTime = targetDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    // We need settings for the link generation, but fetching it here might be overkill for just a link.
    // However, to be consistent, we should. Or we can just use the utility with default settings if not loaded.
    // Since this is a list page, we can fetch settings once at the top.

    const getClientWhatsAppLink = (phone: string, name: string) => {
        const message = `Hola ${name}, te escribo de la agencia para revisar tus servicios.`
        return getWhatsAppLink(phone, message, settings)
    }

    const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'overdue' | 'urgent' | 'active' | 'inactive'

    // Process clients with status logic for filtering
    const clientsWithStatus = clients.map(client => {
        let futureDebt = 0
        const debt = client.invoices?.reduce((acc, inv) => {
            if (inv.status !== 'pending' && inv.status !== 'overdue') return acc

            if (inv.due_date) {
                const dueDate = new Date(inv.due_date)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                dueDate.setHours(0, 0, 0, 0)

                if (today > dueDate) return acc + inv.total
                else {
                    futureDebt += inv.total
                    return acc
                }
            }
            return acc + inv.total
        }, 0) || 0

        const activeServicesCount = client.services ? client.services.filter((s: any) => s.status === 'active').length : (client.subscriptions?.filter((s: any) => s.status === 'active').length || 0)

        let status = 'active' // Default
        if (debt > 0) status = 'overdue'
        else if (futureDebt > 0) status = 'urgent'
        else if (activeServicesCount === 0) status = 'inactive'

        const nextPayment = getNextPayment(client)
        const daysToPay = nextPayment ? getDaysDiff(nextPayment.date) : null

        return { ...client, debt, futureDebt, status, activeServicesCount, nextPayment, daysToPay }
    })

    const filteredClients = clientsWithStatus.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.company_name && client.company_name.toLowerCase().includes(searchTerm.toLowerCase()))

        if (!matchesSearch) return false
        if (activeFilter === 'all') return true
        return client.status === activeFilter
    })

    // Counts for tabs
    const counts = {
        all: clients.length,
        overdue: clientsWithStatus.filter(c => c.status === 'overdue').length,
        urgent: clientsWithStatus.filter(c => c.status === 'urgent').length,
        active: clientsWithStatus.filter(c => c.status === 'active').length,
        inactive: clientsWithStatus.filter(c => c.status === 'inactive').length,
    }

    return (
        <div className="space-y-8 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Mis Clientes</h2>
                    <p className="text-muted-foreground">Gestión visual de tu cartera y estados de cuenta.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <Link href="/debug/tokens">
                        <Button variant="outline" className="h-9 px-4 border-gray-200 text-gray-600 hover:bg-gray-50">
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Portal Tokens
                        </Button>
                    </Link>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-9 px-4 bg-brand-pink hover:bg-brand-pink/90 shadow-md text-white border-0">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Cliente
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                                <DialogDescription>
                                    Ingresa la información básica del cliente para comenzar a gestionar sus servicios.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-1">
                                {/* Logo Upload - Featured Section */}
                                <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
                                    {!previewUrl ? (
                                        <div
                                            className={cn(
                                                "w-32 h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all",
                                                isDragging ? "border-indigo-500 bg-indigo-50 scale-105" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
                                            )}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <p className="text-xs font-medium text-gray-600">Logo del cliente</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG • 300x300</p>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-indigo-200">
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg"
                                                onClick={(e) => { e.stopPropagation(); removeFile(); }}
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
                                            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1.5">
                                                Nombre Completo
                                                <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="name"
                                                placeholder="Juan Pérez"
                                                value={newClient.name}
                                                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="company" className="text-sm font-medium">
                                                Empresa
                                            </Label>
                                            <Input
                                                id="company"
                                                placeholder="Agencia S.A.S"
                                                value={newClient.company_name}
                                                onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
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
                                            <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                                                Email
                                                <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="cliente@empresa.com"
                                                value={newClient.email}
                                                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-sm font-medium">
                                                Teléfono
                                            </Label>
                                            <Input
                                                id="phone"
                                                placeholder="+57 300 123 4567"
                                                value={newClient.phone}
                                                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
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
                                            <Label htmlFor="nit" className="text-sm font-medium">
                                                NIT / ID
                                            </Label>
                                            <Input
                                                id="nit"
                                                placeholder="900.123.456-7"
                                                value={newClient.nit}
                                                onChange={(e) => setNewClient({ ...newClient, nit: e.target.value })}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address" className="text-sm font-medium">
                                                Dirección
                                            </Label>
                                            <Input
                                                id="address"
                                                placeholder="Calle 123 #45-67"
                                                value={newClient.address}
                                                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
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
                                            <Label htmlFor="facebook" className="text-sm font-medium">
                                                Facebook
                                            </Label>
                                            <Input
                                                id="facebook"
                                                placeholder="facebook.com/empresa"
                                                value={newClient.facebook}
                                                onChange={(e) => setNewClient({ ...newClient, facebook: e.target.value })}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="instagram" className="text-sm font-medium">
                                                Instagram
                                            </Label>
                                            <Input
                                                id="instagram"
                                                placeholder="@empresa"
                                                value={newClient.instagram}
                                                onChange={(e) => setNewClient({ ...newClient, instagram: e.target.value })}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tiktok" className="text-sm font-medium">
                                                TikTok
                                            </Label>
                                            <Input
                                                id="tiktok"
                                                placeholder="@empresa"
                                                value={newClient.tiktok}
                                                onChange={(e) => setNewClient({ ...newClient, tiktok: e.target.value })}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="website" className="text-sm font-medium">
                                                Sitio Web
                                            </Label>
                                            <Input
                                                id="website"
                                                placeholder="https://empresa.com"
                                                value={newClient.website}
                                                onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                                                className="h-10"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateClient} disabled={creating || !newClient.name || !newClient.email} className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear Cliente
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>


            {/* Unified Control Block & View Toggle */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                {/* Search & Filters */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md">
                    {/* Integrated Search */}
                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input
                            placeholder="Buscar cliente rapidísimo..."
                            className="bg-transparent border-0 focus:ring-0 text-sm w-full outline-none text-gray-700 placeholder:text-gray-400 h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Vertical Divider (Desktop) */}
                    <div className="h-6 w-px bg-gray-200 hidden md:block" />

                    {/* Filter Pills - Compact */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-hide p-1 md:p-0">
                        {[
                            { id: 'all', label: 'Todos', count: counts.all, color: 'gray' },
                            { id: 'overdue', label: 'Vencidos', count: counts.overdue, color: 'red' },
                            { id: 'urgent', label: 'Por Vencer', count: counts.urgent, color: 'amber' },
                            { id: 'active', label: 'Al día', count: counts.active, color: 'emerald' },
                            { id: 'inactive', label: 'Sin Servicio', count: counts.inactive, color: 'slate' },
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                    activeFilter === filter.id
                                        ? filter.id === 'overdue' ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 shadow-sm"
                                            : filter.id === 'urgent' ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 shadow-sm"
                                                : filter.id === 'active' ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shadow-sm"
                                                    : filter.id === 'inactive' ? "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20 shadow-sm"
                                                        : "bg-gray-900 text-white shadow-sm"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <span>{filter.label}</span>
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[10px]",
                                    activeFilter === filter.id
                                        ? "bg-white/20 text-current"
                                        : "bg-gray-100 text-gray-500"
                                )}>
                                    {filter.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* View Toggle - Separated but on same line */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex items-center transition-all hover:shadow-md h-[52px]">
                    <div className="flex bg-gray-50 rounded-xl p-0.5">
                        <button
                            onClick={() => setIsCompactView(false)}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                !isCompactView ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            )}
                            title="Vista Detallada"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setIsCompactView(true)}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                isCompactView ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            )}
                            title="Vista Compacta"
                        >
                            <Rows className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {
                    loading ? (
                        [1, 2, 3, 4].map(i => (
                            <Card key={i} className="h-[300px] animate-pulse bg-gray-100 border-0" />
                        ))
                    ) : filteredClients.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No se encontraron clientes.
                        </div>
                    ) : (
                        filteredClients.map((client: any) => {
                            const { debt, futureDebt, nextPayment, daysToPay, activeServicesCount } = client

                            const isOverdue = daysToPay !== null && daysToPay < 0
                            const isUrgent = daysToPay !== null && daysToPay <= 5 && daysToPay >= 0

                            return (
                                <div key={client.id} className="group relative">
                                    {/* Animated Border Effect */}
                                    <Card className={cn(
                                        "relative h-full flex flex-col hover:shadow-lg transition-all duration-300 overflow-hidden bg-white border-gray-100",
                                        debt > 0
                                            ? "animate-shadow-pulse-slow-red"
                                            : futureDebt > 0
                                                ? "animate-shadow-pulse-slow-amber"
                                                : ""
                                    )}>
                                        <CardHeader className="pb-3 pt-5 px-5 relative">
                                            {/* Service Count Badge - Top Right */}
                                            <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-[250ms] delay-100 z-10">
                                                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-[10px] px-2 h-5 gap-0 shadow-sm group/badge cursor-help transition-all duration-[250ms] hover:bg-gray-100 hover:pr-3">
                                                    <div className="flex items-center overflow-hidden transition-all duration-[250ms] ease-in-out w-3 opacity-100 group-hover/badge:w-0 group-hover/badge:opacity-0">
                                                        <CreditCard className="h-3 w-3 text-gray-400 shrink-0" />
                                                    </div>
                                                    <span className="transition-all duration-[250ms] group-hover/badge:ml-0 ml-1">{activeServicesCount}</span>
                                                    <div className="flex items-center overflow-hidden transition-all duration-[250ms] ease-in-out max-w-0 opacity-0 group-hover/badge:max-w-[60px] group-hover/badge:opacity-100 group-hover/badge:ml-1">
                                                        <span className="font-medium whitespace-nowrap">Servicios</span>
                                                    </div>
                                                </Badge>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                {/* Avatar with enhanced styling */}
                                                <div className="relative">
                                                    <Avatar className="h-14 w-14 rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
                                                        <AvatarImage src={client.logo_url} className="object-cover w-full h-full" />
                                                        <AvatarFallback className="bg-gray-100 text-gray-600 font-bold text-lg rounded-xl">
                                                            {client.name.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {/* Active indicator */}
                                                    <div className={cn(
                                                        "absolute -bottom-1 -right-1 h-3.5 w-3.5 border-2 border-white rounded-full",
                                                        debt > 0 ? "bg-red-500" : futureDebt > 0 ? "bg-amber-500" : "bg-emerald-500"
                                                    )} />
                                                </div>

                                                <div className="flex-1 min-w-0 pr-16"> {/* Added padding-right to avoid overlap with badge */}
                                                    <h3 className="font-semibold text-gray-900 text-lg leading-tight truncate">
                                                        {client.name}
                                                    </h3>
                                                    {client.company_name && (
                                                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                                                            {client.company_name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className={cn("px-5 space-y-3 flex-1", isCompactView ? "pb-0 pt-0" : "pb-5")}>
                                            {!isCompactView && (
                                                <>
                                                    {/* Status Block - Full Width & Single Line */}
                                                    <div className={cn(
                                                        "w-full px-4 py-3 rounded-lg border transition-colors flex items-center shadow-sm",
                                                        debt > 0
                                                            ? "bg-red-50 border-red-100 justify-between"
                                                            : futureDebt > 0
                                                                ? "bg-amber-50 border-amber-100 justify-between"
                                                                : "bg-gray-50 border-gray-100 justify-center"
                                                    )}>
                                                        <div className="flex items-center gap-2">
                                                            {debt > 0 ? (
                                                                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                                                            ) : futureDebt > 0 ? (
                                                                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                                                            ) : (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                            )}
                                                            <span className={cn(
                                                                "font-medium uppercase tracking-wide text-sm",
                                                                debt > 0 ? "text-red-700" : futureDebt > 0 ? "text-amber-700" : "text-gray-700"
                                                            )}>
                                                                {debt > 0 ? "Vencido" : futureDebt > 0 ? "Por Vencer" : "Al día"}
                                                            </span>
                                                        </div>

                                                        {(debt > 0 || futureDebt > 0) && (
                                                            <p className={cn(
                                                                "text-lg font-bold leading-none",
                                                                debt > 0 ? "text-red-900" : "text-amber-900"
                                                            )}>
                                                                {debt > 0
                                                                    ? `$${debt.toLocaleString()}`
                                                                    : `$${futureDebt.toLocaleString()}`
                                                                }
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Next Payment Section */}
                                                    {nextPayment ? (
                                                        <div className={cn(
                                                            "p-3 rounded-lg border transition-all h-[74px] flex flex-col justify-center",
                                                            isOverdue
                                                                ? "bg-red-50 border-red-100"
                                                                : isUrgent
                                                                    ? "bg-amber-50 border-amber-100"
                                                                    : "bg-gray-50 border-gray-100"
                                                        )}>
                                                            <div className="flex items-center justify-between mb-1.5 pt-1">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className={cn(
                                                                        "h-3.5 w-3.5",
                                                                        isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-gray-500"
                                                                    )} />
                                                                    <span className={cn(
                                                                        "text-xs font-medium uppercase tracking-wide",
                                                                        isOverdue ? "text-red-700" : isUrgent ? "text-amber-700" : "text-gray-600"
                                                                    )}>
                                                                        {isOverdue ? "¡Vencido!" : "Próximo Pago"}
                                                                    </span>
                                                                </div>
                                                                <Badge variant="secondary" className={cn(
                                                                    "text-[10px] font-semibold h-5 px-2",
                                                                    isOverdue
                                                                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                                                                        : isUrgent
                                                                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                                )}>
                                                                    {isOverdue ? `Hace ${Math.abs(daysToPay!)}d` : `${daysToPay}d`}
                                                                </Badge>
                                                            </div>
                                                            <p className={cn(
                                                                "text-sm font-medium truncate pb-1",
                                                                isOverdue ? "text-red-900" : isUrgent ? "text-amber-900" : "text-gray-900"
                                                            )}>
                                                                {nextPayment.source}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-center h-[74px] flex flex-col justify-center items-center">
                                                            <p className="text-xs text-gray-400 font-medium">Sin cobros programados</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </CardContent>

                                        {/* Action Buttons - Modernized */}
                                        <CardFooter className="px-5 pb-5 pt-0 flex gap-2 items-center">
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-green-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-green-100 transition-all duration-300"
                                                    title="Contactar por WhatsApp"
                                                    onClick={() => {
                                                        setSelectedClientForWhatsApp(client)
                                                        setIsWhatsAppModalOpen(true)
                                                    }}
                                                >
                                                    <Phone className="h-4 w-4" />
                                                </Button>


                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-blue-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-100 transition-all duration-300"
                                                    onClick={() => handleOpenInvoices(client)}
                                                    title="Ver Facturas"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-indigo-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-indigo-100 transition-all duration-300"
                                                    onClick={() => {
                                                        setSelectedClientForService(client)
                                                        setIsServiceModalOpen(true)
                                                    }}
                                                    title="Agregar Servicio"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>

                                                {(client.portal_short_token || client.portal_token) && (
                                                    <a
                                                        href={`${window.location.origin}/portal/${client.portal_short_token || client.portal_token}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-purple-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-purple-100 transition-all duration-300"
                                                            title="Ir al Portal"
                                                        >
                                                            <Globe className="h-4 w-4" />
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>

                                            <Link href={`/clients/${client.id}`} className="ml-auto">
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-4 text-xs font-semibold rounded-full bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
                                                >
                                                    <span>Gestionar</span>
                                                    <ArrowRight className="h-3 w-3 ml-1.5 transition-transform group-hover:translate-x-1" />
                                                </Button>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                </div>
                            )
                        })
                    )
                }
            </div>

            {/* Quick Invoices Modal */}
            <Dialog open={isInvoicesModalOpen} onOpenChange={setIsInvoicesModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Facturas Rápidas</DialogTitle>
                        <DialogDescription>
                            Gestiona las facturas de {selectedClientForInvoices?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {selectedClientForInvoices?.invoices && selectedClientForInvoices.invoices.length > 0 ? (
                            selectedClientForInvoices.invoices
                                .sort((a, b) => new Date(b.due_date || '').getTime() - new Date(a.due_date || '').getTime())
                                .map(invoice => (
                                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">${invoice.total.toLocaleString()}</span>
                                                <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                                                    {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Vence: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Sin fecha'}
                                            </p>
                                        </div>

                                        {invoice.status !== 'paid' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                                onClick={() => handleMarkAsPaid(invoice.id)}
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                Marcar Pagada
                                            </Button>
                                        )}
                                    </div>
                                ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>No hay facturas registradas</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* WhatsApp Actions Modal */}
            <WhatsAppActionsModal
                isOpen={isWhatsAppModalOpen}
                onOpenChange={setIsWhatsAppModalOpen}
                client={selectedClientForWhatsApp}
                settings={settings}
            />

            {/* Add Service Modal */}
            <AddServiceModal
                open={isServiceModalOpen}
                onOpenChange={setIsServiceModalOpen}
                clientId={selectedClientForService?.id}
                clientName={selectedClientForService?.name}
                onSuccess={() => {
                    fetchClients()
                    setIsServiceModalOpen(false)
                }}
            />
        </div>
    )
}
