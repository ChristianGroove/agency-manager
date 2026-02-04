"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Plus, Upload, UserCircle, Mail, Globe, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n/use-translation"

interface CreateClientSheetProps {
    onSuccess?: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function CreateClientSheet({ onSuccess, open: controlledOpen, onOpenChange: setControlledOpen, trigger }: CreateClientSheetProps) {
    const { t } = useTranslation()
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const [saving, setSaving] = useState(false)
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form State - ALL fields including social media
    const [form, setForm] = useState({
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
        twitter: ""
    })

    // File Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleCreateClient = async () => {
        if (!form.name) return toast.error(t('clients.toasts.name_required'))
        if (!form.email) return toast.error(t('clients.toasts.email_required'))

        // CRITICAL: Get organization context FIRST
        const { getCurrentOrganizationId } = await import('@/modules/core/organizations/actions')
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return toast.error('No se encontró contexto de organización')

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Sesión expirada")

            let finalLogoUrl = form.logo_url

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
                ...form,
                organization_id: orgId,
                logo_url: finalLogoUrl,
                user_id: user.id,
                // Generate Portal Tokens
                portal_token: crypto.randomUUID(),
                portal_short_token: Math.random().toString(36).substring(2, 8).toUpperCase(),
                portal_token_never_expires: true
            })

            if (error) throw error

            toast.success(t('clients.toasts.created_success'))
            setOpen(false)

            // Reset form
            setForm({
                name: "", company_name: "", nit: "", email: "", phone: "", address: "",
                logo_url: "", website: "", instagram: "", facebook: "",
                tiktok: "", linkedin: "", youtube: "", twitter: ""
            })
            setSelectedFile(null)
            setPreviewUrl(null)

            if (onSuccess) onSuccess()
            else router.refresh()

        } catch (error: any) {
            console.error(error)
            toast.error(t('clients.toasts.error_create') + ": " + error.message)
        } finally {
            setSaving(false)
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
                        {t('clients.new_client')}
                    </Button>
                </SheetTrigger>
            )}

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
                        <SheetTitle>{t('clients.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('clients.form.create_desc')}</SheetDescription>
                    </SheetHeader>

                    {/* Header */}
                    <div className="bg-white border-b border-gray-100 px-8 py-6 flex-none z-10">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('clients.form.create_title')}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{t('clients.form.create_desc')}</p>
                    </div>

                    {/* Form Body */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                        {/* Avatar Upload Section */}
                        <div className="flex items-center gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="relative group">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-xl rounded-2xl">
                                    {previewUrl ? (
                                        <AvatarImage src={previewUrl} className="object-cover" />
                                    ) : (
                                        <AvatarFallback className="bg-indigo-50 text-indigo-600 text-2xl font-bold rounded-2xl">
                                            CL
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
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

                        {/* Form Grid - Copied from Mi Perfil */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                            {/* Left Column: Datos de Identidad */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <UserCircle className="h-4 w-4" /> Datos de Identidad
                                </h4>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500">{t('clients.form.fields.name')} <span className="text-red-500">*</span></Label>
                                    <Input
                                        className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                        placeholder={t('clients.form.fields.name_placeholder')}
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500">{t('clients.form.fields.company')}</Label>
                                    <Input
                                        className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                        placeholder={t('clients.form.fields.company_placeholder')}
                                        value={form.company_name}
                                        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500">{t('clients.form.fields.nit')}</Label>
                                    <Input
                                        className="bg-gray-50/50 border-gray-200 focus:bg-white h-11 font-mono"
                                        placeholder="900.123.456-7"
                                        value={form.nit}
                                        onChange={(e) => setForm({ ...form, nit: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Right Column: Comunicación */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> Comunicación
                                </h4>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500">Email Directo <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="email"
                                        className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                        placeholder="cliente@empresa.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500">Teléfono / WhatsApp</Label>
                                    <Input
                                        className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                        placeholder="+57 300..."
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500">Dirección Física</Label>
                                    <Input
                                        className="bg-gray-50/50 border-gray-200 focus:bg-white h-11"
                                        placeholder="Calle 123..."
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Full Width Bottom: Presencia Digital */}
                            <div className="md:col-span-2 pt-4 border-t border-gray-50 space-y-6">
                                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> Presencia Digital
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500">Website</Label>
                                        <Input className="bg-gray-50/50 h-10" placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500">Instagram</Label>
                                        <Input className="bg-gray-50/50 h-10" placeholder="@usuario" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500">Facebook</Label>
                                        <Input className="bg-gray-50/50 h-10" placeholder="usuario" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500">TikTok</Label>
                                        <Input className="bg-gray-50/50 h-10" placeholder="@usuario" value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500">LinkedIn</Label>
                                        <Input className="bg-gray-50/50 h-10" placeholder="URL perfil" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500">YouTube</Label>
                                        <Input className="bg-gray-50/50 h-10" placeholder="Canal" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500">Twitter / X</Label>
                                        <Input className="bg-gray-50/50 h-10" placeholder="@usuario" value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <SheetFooter className="border-t border-gray-100 p-6 bg-white flex-row justify-between items-center sm:justify-between flex-none z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="h-10 text-xs font-semibold rounded-xl"
                        >
                            {t('clients.form.buttons.cancel')}
                        </Button>
                        <Button
                            onClick={handleCreateClient}
                            disabled={saving}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl h-10 shadow-lg shadow-indigo-200 text-xs font-semibold px-8 gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? "Creando..." : "Crear Cliente"}
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}
