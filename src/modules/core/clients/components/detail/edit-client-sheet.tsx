"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, FileText, Mail, Phone, Globe } from "lucide-react"
import { Client } from "@/types"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface EditClientSheetProps {
    client: Client
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditClientSheet({ client, open, onOpenChange, onSuccess }: EditClientSheetProps) {
    const { t } = useTranslation()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
        tiktok: ""
    })

    useEffect(() => {
        if (client) {
            setEditForm({
                name: client.name || "",
                company_name: client.company_name || "",
                nit: client.nit || "",
                email: client.email || "",
                phone: client.phone || "",
                address: client.address || "",
                logo_url: client.logo_url || "",
                website: client.website || "",
                instagram: client.metadata?.instagram || client.instagram || "",
                facebook: client.metadata?.facebook || client.facebook || "",
                tiktok: client.metadata?.tiktok || client.tiktok || ""
            })
        }
    }, [client])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const objectUrl = URL.createObjectURL(file)
            setPreviewUrl(objectUrl)

            setLoading(true)
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
                toast.success(t('clients.toasts.logo_success'))
            } catch (error) {
                console.error(error)
                toast.error("Error al subir imagen")
            } finally {
                setLoading(false)
            }
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0]
            const objectUrl = URL.createObjectURL(file)
            setPreviewUrl(objectUrl)
            // Logic for drop upload could be same as select
        }
    }

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
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
                    tiktok: editForm.tiktok
                })
                .eq('id', client.id)

            if (error) throw error
            toast.success(t('clients.toasts.updated_success'))
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error(error)
            toast.error(t('clients.toasts.error_update'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-white/95 backdrop-blur-xl
                "
            >
                <div className="flex flex-col h-full relative">
                    <SheetHeader className="px-8 py-5 border-b border-gray-100 dark:border-white/10 bg-white/50 backdrop-blur z-10 flex-none">
                        <SheetTitle className="text-xl font-bold text-gray-900">{t('clients.form.edit_title')}</SheetTitle>
                        <SheetDescription>{t('clients.form.edit_desc')}</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleUpdateClient} className="flex-1 flex flex-col overflow-hidden">
                        <Tabs defaultValue="profile" className="flex-1 w-full flex flex-col overflow-hidden">
                            <div className="px-8 py-2 bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 flex-none sticky top-0 z-10 backdrop-blur-md">
                                <TabsList className="bg-transparent p-0 w-full justify-start h-auto gap-6">
                                    <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-2 text-gray-500 font-medium text-sm">{t('clients.form.tabs.profile')}</TabsTrigger>
                                    <TabsTrigger value="contact" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-2 text-gray-500 font-medium text-sm">{t('clients.form.tabs.contact')}</TabsTrigger>
                                    <TabsTrigger value="social" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 pb-2 text-gray-500 font-medium text-sm">{t('clients.form.tabs.social')}</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-gray-50/30">
                                <TabsContent value="profile" className="p-6 m-0 space-y-6 animate-in fade-in-50">
                                    {/* Profile Content */}
                                    <div className="flex items-center gap-4 border p-4 rounded-xl bg-white shadow-sm border-gray-100">
                                        <div
                                            className="relative group cursor-pointer shrink-0"
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={handleDrop}
                                        >
                                            <Avatar className="h-20 w-20 border-4 border-gray-50 shadow-inner group-hover:border-indigo-100 transition-colors">
                                                <AvatarImage src={previewUrl || editForm.logo_url} className="object-cover" />
                                                <AvatarFallback className="text-2xl font-bold bg-indigo-50 text-indigo-600">
                                                    {editForm.name?.substring(0, 2).toUpperCase() || "CL"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                <Upload className="h-5 w-5" />
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
                                            <Label className="cursor-pointer hover:text-indigo-600 transition-colors font-bold text-gray-900" htmlFor="logo-upload">
                                                {t('clients.form.fields.logo')}
                                            </Label>
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('clients.form.fields.logo_edit_desc')}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="company_name" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('clients.form.fields.company')}</Label>
                                            <Input
                                                id="company_name"
                                                className="h-10 bg-white border-gray-200 focus:border-indigo-500 transition-all font-medium"
                                                value={editForm.company_name}
                                                onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                                                placeholder={t('clients.form.fields.company_placeholder')}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nit" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('clients.form.fields.nit')}</Label>
                                            <Input
                                                id="nit"
                                                className="h-10 bg-white border-gray-200 font-mono text-sm"
                                                value={editForm.nit}
                                                onChange={(e) => setEditForm({ ...editForm, nit: e.target.value })}
                                                placeholder="900.123.456-7"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('clients.form.fields.address_label')}</Label>
                                            <Input
                                                id="address"
                                                className="h-10 bg-white border-gray-200"
                                                value={editForm.address}
                                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                placeholder="Calle 123 # 45-67"
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="contact" className="p-6 m-0 space-y-5 animate-in fade-in-50">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('clients.form.fields.name_label')}</Label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="name"
                                                className="pl-9 h-10 bg-white border-gray-200"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                placeholder="Nombre completo"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('clients.form.fields.email')}</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="email"
                                                className="pl-9 h-10 bg-white border-gray-200"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                placeholder="contacto@empresa.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('clients.form.fields.phone')}</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="phone"
                                                className="pl-9 h-10 bg-white border-gray-200"
                                                value={editForm.phone}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                placeholder="+57 300 123 4567"
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="social" className="p-6 m-0 space-y-5 animate-in fade-in-50">
                                    <div className="space-y-2">
                                        <Label htmlFor="website" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('clients.form.fields.website')}</Label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="website"
                                                className="pl-9 h-10 bg-white border-gray-200"
                                                value={editForm.website}
                                                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                                placeholder="www.tusitio.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="instagram" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Instagram</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-400">@</span>
                                                <Input
                                                    id="instagram"
                                                    className="pl-7 h-10 bg-white border-gray-200"
                                                    value={editForm.instagram}
                                                    onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                                                    placeholder="usuario"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="facebook" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Facebook</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-gray-400">/</span>
                                                <Input
                                                    id="facebook"
                                                    className="pl-6 h-10 bg-white border-gray-200"
                                                    value={editForm.facebook}
                                                    onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })}
                                                    placeholder="pagina"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        <div className="p-5 border-t border-gray-100 bg-white/80 backdrop-blur flex items-center justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-4 text-xs font-medium rounded-xl border-gray-200">{t('clients.form.buttons.cancel')}</Button>
                            <Button type="submit" disabled={loading} className="h-10 px-6 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('clients.form.buttons.update')}
                            </Button>
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
