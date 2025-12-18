"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Search, Phone, Mail, Calendar, ArrowRight, AlertTriangle, CheckCircle2, Clock, Loader2, Upload, X, Image as ImageIcon, Globe, CreditCard, FileText } from "lucide-react"
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

// Types
type Client = {
    id: string
    name: string
    company_name: string
    email: string
    phone: string
    logo_url?: string
    invoices: { id: string; total: number; status: string; due_date?: string }[]
    hosting_accounts: { status: string; renewal_date: string }[]
    subscriptions: { id: string; name: string; next_billing_date: string; status: string; amount: number; service_type: string; frequency: string }[]
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

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
          invoices (id, total, status, due_date),
          hosting_accounts (status, renewal_date),
          subscriptions (id, name, next_billing_date, status, amount, service_type, frequency)
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

    const getWhatsAppLink = (phone: string, name: string) => {
        const cleanPhone = phone?.replace(/\D/g, '') || ''
        const message = `Hola ${name}, te escribo de la agencia para revisar tus servicios.`
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    }

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company_name && client.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-8 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Mis Clientes</h2>
                    <p className="text-muted-foreground">Gestión visual de tu cartera y estados de cuenta.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar cliente..."
                            className="pl-9 bg-white w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Link href="/debug/tokens">
                        <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Portal Tokens
                        </Button>
                    </Link>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-brand-pink hover:bg-brand-pink/90 shadow-md text-white border-0">
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

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <Card key={i} className="h-[300px] animate-pulse bg-gray-100 border-0" />
                    ))
                ) : filteredClients.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No se encontraron clientes.
                    </div>
                ) : (
                    filteredClients.map((client) => {
                        // Logic
                        let futureDebt = 0

                        // Calculate debt - only count invoices whose due date has passed
                        const debt = client.invoices?.reduce((acc, inv) => {
                            if (inv.status !== 'pending' && inv.status !== 'overdue') return acc

                            // Only count as debt if the due date has passed
                            if (inv.due_date) {
                                const dueDate = new Date(inv.due_date)
                                const today = new Date()
                                // Normalize times to compare only dates
                                today.setHours(0, 0, 0, 0)
                                dueDate.setHours(0, 0, 0, 0)

                                // Only add to debt if due date has passed (today > dueDate)
                                if (today > dueDate) {
                                    return acc + inv.total
                                } else {
                                    // It's pending but not yet due
                                    futureDebt += inv.total
                                    return acc
                                }
                            }

                            // If no due date specified, count it as debt
                            return acc + inv.total
                        }, 0) || 0

                        const nextPayment = getNextPayment(client)
                        const daysToPay = nextPayment ? getDaysDiff(nextPayment.date) : null

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
                                    <CardHeader className="pb-3 pt-5 px-5">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar with enhanced styling */}
                                            <div className="relative">
                                                <Avatar className="h-14 w-14 rounded-xl border border-gray-100 shadow-sm">
                                                    <AvatarImage src={client.logo_url} className="object-contain p-1" />
                                                    <AvatarFallback className="bg-gray-100 text-gray-600 font-bold text-lg rounded-xl">
                                                        {client.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {/* Active indicator */}
                                                <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                                            </div>

                                            <div className="flex-1 min-w-0">
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

                                    <CardContent className="px-5 pb-5 space-y-3 flex-1">
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Debt Status */}
                                            <div className={cn(
                                                "p-3 rounded-lg border transition-colors",
                                                debt > 0
                                                    ? "bg-red-50 border-red-100"
                                                    : futureDebt > 0
                                                        ? "bg-amber-50 border-amber-100"
                                                        : "bg-gray-50 border-gray-100"
                                            )}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {debt > 0 ? (
                                                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                                    ) : futureDebt > 0 ? (
                                                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                                                    ) : (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />
                                                    )}
                                                    <span className={cn(
                                                        "text-xs font-medium uppercase tracking-wide",
                                                        debt > 0 ? "text-red-700" : futureDebt > 0 ? "text-amber-700" : "text-gray-600"
                                                    )}>
                                                        {debt > 0 ? "Vencido" : futureDebt > 0 ? "Por Vencer" : "Al día"}
                                                    </span>
                                                </div>
                                                <p className={cn(
                                                    "text-lg font-bold leading-none",
                                                    debt > 0 ? "text-red-900" : futureDebt > 0 ? "text-amber-900" : "text-gray-900"
                                                )}>
                                                    {debt > 0
                                                        ? `$${debt.toLocaleString()}`
                                                        : futureDebt > 0
                                                            ? `$${futureDebt.toLocaleString()}`
                                                            : "Al día"}
                                                </p>
                                            </div>

                                            {/* Active Services */}
                                            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                                                    <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                                                        Servicios
                                                    </span>
                                                </div>
                                                <p className="text-lg font-bold text-gray-900 leading-none">
                                                    {client.subscriptions?.filter((s: any) => s.status === 'active').length || 0}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Next Payment Section */}
                                        {nextPayment ? (
                                            <div className={cn(
                                                "p-3 rounded-lg border transition-all",
                                                isOverdue
                                                    ? "bg-red-50 border-red-100"
                                                    : isUrgent
                                                        ? "bg-amber-50 border-amber-100"
                                                        : "bg-gray-50 border-gray-100"
                                            )}>
                                                <div className="flex items-center justify-between mb-1.5">
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
                                                    "text-sm font-medium truncate",
                                                    isOverdue ? "text-red-900" : isUrgent ? "text-amber-900" : "text-gray-900"
                                                )}>
                                                    {nextPayment.source}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-center">
                                                <p className="text-xs text-gray-400 font-medium">Sin cobros programados</p>
                                            </div>
                                        )}
                                    </CardContent>

                                    {/* Action Buttons */}
                                    <CardFooter className="px-5 pb-5 pt-0 flex gap-2">
                                        <a
                                            href={getWhatsAppLink(client.phone, client.name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"
                                                title="Contactar por WhatsApp"
                                            >
                                                <Phone className="h-4 w-4" />
                                            </Button>
                                        </a>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                            onClick={() => handleOpenInvoices(client)}
                                            title="Ver Facturas"
                                        >
                                            <FileText className="h-4 w-4" />
                                        </Button>

                                        <Link href={`/clients/${client.id}`} className="flex-1">
                                            <Button
                                                size="sm"
                                                className="w-full h-9 text-xs font-medium bg-brand-dark hover:bg-brand-dark/90 text-white shadow-sm"
                                            >
                                                <span>Ver Detalle</span>
                                                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            </div>
                        )
                    })
                )}
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
        </div>

    )
}
