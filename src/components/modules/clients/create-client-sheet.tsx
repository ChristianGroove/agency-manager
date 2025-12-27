"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Plus, Upload, X, Mail, Phone, Globe, Building2, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CreateClientSheetProps {
    onSuccess?: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function CreateClientSheet({ onSuccess, open: controlledOpen, onOpenChange: setControlledOpen, trigger }: CreateClientSheetProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const [loading, setLoading] = useState(false)
    const router = useRouter()

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const removeFile = () => {
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const handleCreateClient = async () => {
        if (!newClient.name) return toast.error("El nombre es obligatorio")
        if (!newClient.email) return toast.error("El email es obligatorio")

        // CRITICAL: Get organization context FIRST
        const { getCurrentOrganizationId } = await import('@/lib/actions/organizations')
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return toast.error('No se encontró contexto de organización')

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Sesión expirada")

            let finalLogoUrl = newClient.logo_url

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${user.id}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('client-logos')
                    .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false })

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('client-logos')
                    .getPublicUrl(filePath)

                finalLogoUrl = publicUrl
            }

            const { error } = await supabase.from('clients').insert({
                ...newClient,
                organization_id: orgId, // CRITICAL FIX
                logo_url: finalLogoUrl,
                user_id: user.id
            })

            if (error) throw error

            toast.success("Cliente creado exitosamente")
            setOpen(false)

            // Reset form
            setNewClient({
                name: "", company_name: "", nit: "", email: "", phone: "", address: "",
                logo_url: "", facebook: "", instagram: "", tiktok: "", website: ""
            })
            removeFile()

            if (onSuccess) onSuccess()
            else router.refresh()

        } catch (error: any) {
            console.error(error)
            toast.error("Error al crear cliente: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {trigger ? (
                <SheetTrigger asChild>
                    {trigger}
                </SheetTrigger>
            ) : (
                <SheetTrigger asChild>
                    <Button className="h-9 px-4 bg-brand-pink hover:bg-brand-pink/90 shadow-md text-white border-0 transition-all hover:scale-105 active:scale-95">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Cliente
                    </Button>
                </SheetTrigger>
            )}

            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>Nuevo Cliente</SheetTitle>
                    <SheetDescription>Formulario para crear cliente</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Nuevo Cliente</h2>
                            <p className="text-xs text-muted-foreground">Registra un nuevo contacto comercial.</p>
                        </div>
                    </div>

                    {/* Split View */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full grid grid-cols-1 lg:grid-cols-12 divide-x divide-gray-100/50">

                            {/* LEFT: FORM Form (2/3) */}
                            <div className="lg:col-span-8 overflow-y-auto p-8 h-full relative scrollbar-thin scrollbar-thumb-gray-200">
                                <Tabs defaultValue="profile" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-100/50 p-1 rounded-xl">
                                        <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Perfil</TabsTrigger>
                                        <TabsTrigger value="contact" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Contacto</TabsTrigger>
                                        <TabsTrigger value="social" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Redes</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="profile" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                        {/* Logo Upload */}
                                        <div className="flex items-center gap-6 border border-dashed border-gray-200 p-6 rounded-2xl bg-gray-50/30 hover:bg-gray-50/80 transition-colors">
                                            {!previewUrl ? (
                                                <div
                                                    className={cn(
                                                        "h-20 w-20 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all bg-white shadow-sm shrink-0",
                                                        isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-400 hover:text-indigo-600"
                                                    )}
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Upload className="h-6 w-6 text-gray-400" />
                                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                                </div>
                                            ) : (
                                                <div className="relative h-20 w-20 shrink-0 group">
                                                    <Avatar className="h-20 w-20 rounded-2xl border-2 border-white shadow-md">
                                                        <AvatarImage src={previewUrl} className="object-cover" />
                                                        <AvatarFallback>CL</AvatarFallback>
                                                    </Avatar>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeFile(); }}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <Label className="text-base font-semibold text-gray-900 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                                    Logo Corporativo
                                                </Label>
                                                <p className="text-sm text-gray-500 max-w-xs">
                                                    Sube una imagen (PNG, JPG) para identificar a tu cliente en la plataforma.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2 col-span-2 md:col-span-1">
                                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre del Cliente <span className="text-red-500">*</span></Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                    <Input className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="Ej. Juan Pérez" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2 col-span-2 md:col-span-1">
                                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa</Label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                    <Input className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="Ej. Agencia S.A.S" value={newClient.company_name} onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">NIT / ID</Label>
                                                <Input className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="900.123.456-7" value={newClient.nit} onChange={(e) => setNewClient({ ...newClient, nit: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dirección</Label>
                                                <Input className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="Calle 123..." value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="contact" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input type="email" className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="cliente@empresa.com" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono / Celular</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="+57 300..." value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="social" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sitio Web</Label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="https://..." value={newClient.website} onChange={(e) => setNewClient({ ...newClient, website: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Instagram</Label>
                                                <Input className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="@usuario" value={newClient.instagram} onChange={(e) => setNewClient({ ...newClient, instagram: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Facebook</Label>
                                                <Input className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all" placeholder="usuario" value={newClient.facebook} onChange={(e) => setNewClient({ ...newClient, facebook: e.target.value })} />
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <div className="h-24"></div> {/* Spacer */}
                            </div>

                            {/* RIGHT: PREVIEW (1/3) */}
                            <div className="hidden lg:flex lg:col-span-4 bg-slate-100/50 p-8 flex-col justify-center items-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none" />

                                <div className="w-full max-w-sm space-y-6 relative z-10">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vista Previa</h3>
                                        <p className="text-sm text-slate-500">Así se verá tu cliente en la plataforma</p>
                                    </div>

                                    {/* PREVIEW CARD */}
                                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transform transition-all duration-500 hover:scale-[1.02]">
                                        <div className="p-6 flex items-start gap-4">
                                            <Avatar className="h-16 w-16 rounded-xl border-2 border-white shadow-md bg-slate-50">
                                                <AvatarImage src={previewUrl || ""} className="object-cover" />
                                                <AvatarFallback className="bg-slate-100 text-slate-400 text-xl font-bold rounded-xl">
                                                    {(newClient.name?.[0] || "C").toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="h-6 w-3/4 bg-slate-100 rounded animate-pulse hidden" />
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">
                                                    {newClient.name || "Nombre del Cliente"}
                                                </h3>
                                                <p className="text-sm text-gray-500 truncate">
                                                    {newClient.company_name || "Nombre de Empresa"}
                                                </p>

                                                <div className="flex gap-2 mt-3">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium ring-1 ring-inset ring-emerald-600/20">
                                                        Al día
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium ring-1 ring-inset ring-slate-400/20">
                                                        0 Servicios
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                            <div className="text-xs text-gray-500 flex flex-col gap-1">
                                                <span className="uppercase tracking-wider font-bold text-[10px] text-slate-400">Email</span>
                                                <span className="truncate">{newClient.email || "—"}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 flex flex-col gap-1">
                                                <span className="uppercase tracking-wider font-bold text-[10px] text-slate-400">Teléfono</span>
                                                <span className="truncate">{newClient.phone || "—"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-500 hover:text-red-500">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateClient}
                            disabled={loading}
                            className="bg-black text-white hover:bg-gray-800 shadow-xl shadow-black/10 px-8 rounded-xl h-11"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar Cliente"}
                        </Button>
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
