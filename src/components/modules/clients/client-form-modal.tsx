"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Loader2, Upload, X, Mail, Phone, Globe } from "lucide-react"
import { toast } from "sonner"

interface ClientFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function ClientFormModal({ isOpen, onClose, onSuccess }: ClientFormModalProps) {
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
        if (!newClient.name || !newClient.email) {
            toast.error("Por favor completa los campos obligatorios (*)")
            return
        }

        setCreating(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error("Sesión expirada")
                return
            }

            let finalLogoUrl = newClient.logo_url

            // Upload Image if selected
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${user.id}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('client-logos')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) throw uploadError

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('client-logos')
                    .getPublicUrl(filePath)

                finalLogoUrl = publicUrl
            }

            const { error } = await supabase.from('clients').insert({
                ...newClient,
                logo_url: finalLogoUrl,
                user_id: user.id
            })

            if (error) throw error

            // Success
            toast.success("Cliente creado exitosamente")
            onSuccess?.()
            onClose()

            // Reset form
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
            toast.error("Error al crear el cliente")
        } finally {
            setCreating(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[550px] top-[5%] translate-y-0">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                    <DialogDescription>
                        Ingresa la información básica organizada por secciones.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="profile" className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="profile">Perfil</TabsTrigger>
                        <TabsTrigger value="contact">Contacto</TabsTrigger>
                        <TabsTrigger value="social">Redes</TabsTrigger>
                    </TabsList>

                    {/* TAB 1: PERFIL */}
                    <TabsContent value="profile" className="space-y-4 py-2">
                        <div className="flex items-center gap-4 border p-3 rounded-lg bg-gray-50/50">
                            {!previewUrl ? (
                                <div
                                    className={cn(
                                        "h-16 w-16 border-2 border-dashed rounded-full flex flex-col items-center justify-center cursor-pointer transition-all bg-white shrink-0",
                                        isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"
                                    )}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-5 w-5 text-gray-400" />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                    />
                                </div>
                            ) : (
                                <div className="relative h-16 w-16 shrink-0">
                                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                                        <AvatarImage src={previewUrl} className="object-cover" />
                                        <AvatarFallback>CL</AvatarFallback>
                                    </Avatar>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(); }}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            <div className="flex-1">
                                <Label className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                    Logo Corporativo <span className="text-xs text-gray-400 font-normal ml-1">(Opcional)</span>
                                </Label>
                                <p className="text-xs text-gray-500 mt-1">Sube una imagen cuadrada para mejor visualización.</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="name">Nombre del Cliente <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                placeholder="Juan Pérez"
                                value={newClient.name}
                                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="company">Empresa</Label>
                                <Input
                                    id="company"
                                    placeholder="Agencia S.A.S"
                                    value={newClient.company_name}
                                    onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="nit">NIT / ID</Label>
                                <Input
                                    id="nit"
                                    placeholder="900.123.456-7"
                                    value={newClient.nit}
                                    onChange={(e) => setNewClient({ ...newClient, nit: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="address">Dirección Fiscal</Label>
                            <Input
                                id="address"
                                placeholder="Calle 123 #45-67, Ciudad"
                                value={newClient.address}
                                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                            />
                        </div>
                    </TabsContent>

                    {/* TAB 2: CONTACTO */}
                    <TabsContent value="contact" className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Correo Electrónico <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    className="pl-9"
                                    placeholder="cliente@empresa.com"
                                    value={newClient.email}
                                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
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
                                    placeholder="+57 300 123 4567"
                                    value={newClient.phone}
                                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
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
                                    placeholder="https://empresa.com"
                                    value={newClient.website}
                                    onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="instagram">Instagram</Label>
                                <Input
                                    id="instagram"
                                    placeholder="@empresa"
                                    value={newClient.instagram}
                                    onChange={(e) => setNewClient({ ...newClient, instagram: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="facebook">Facebook</Label>
                                <Input
                                    id="facebook"
                                    placeholder="facebook.com/empresa"
                                    value={newClient.facebook}
                                    onChange={(e) => setNewClient({ ...newClient, facebook: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="tiktok">TikTok</Label>
                                <Input
                                    id="tiktok"
                                    placeholder="@empresa"
                                    value={newClient.tiktok}
                                    onChange={(e) => setNewClient({ ...newClient, tiktok: e.target.value })}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="pt-4 border-t border-gray-100">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleCreateClient}
                        disabled={creating}
                        className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                    >
                        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Crear Cliente"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
