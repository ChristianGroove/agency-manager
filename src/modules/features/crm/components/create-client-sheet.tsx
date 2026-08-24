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
import { Loader2, Plus, Upload, UserCircle, Mail, Globe, Save, Building2, Landmark, ShieldCheck, MapPin, Briefcase, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/modules/core/database/supabase"
import { toast } from "sonner"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { CategorySelector } from "./category-selector"
import { COLOMBIAN_BANKS } from "@/modules/core/organizations/vertical-registry"
import { useClients } from "../context/clients-context"
import { cn } from "@/modules/infrastructure/utils/utils"

interface CreateClientSheetProps {
    onSuccess?: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    spaceType?: string
}

export function CreateClientSheet({ onSuccess, open: controlledOpen, onOpenChange: setControlledOpen, trigger, spaceType: explicitSpaceType }: CreateClientSheetProps) {
    const { t } = useTranslation()
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    let detectedSpaceType = explicitSpaceType
    try {
        const clientsCtx = useClients()
        if (!detectedSpaceType && clientsCtx?.spaceType) {
            detectedSpaceType = clientsCtx.spaceType
        }
    } catch (_) {}

    const isRealEstate = detectedSpaceType === 'real_estate'

    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const [saving, setSaving] = useState(false)
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form State - ALL fields including social media and space-specific metadata
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
        twitter: "",
        category_id: null as string | null,
        // Real Estate Specific Fields
        role: "tenant" as "tenant" | "owner" | "guarantor" | "buyer" | "seller" | "other",
        city: "",
        occupation: "",
        bank: "Bancolombia",
        account_type: "savings" as "savings" | "checking",
        account_number: "",
        account_holder: "",
        id_number: "",
        credit_status: "approved" as "approved" | "in_review" | "rejected" | "exempt",
        monthly_income: "",
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
        const { getCurrentOrganizationId } = await import('@/modules/core/organizations/organization-actions')
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

            const meta: Record<string, any> = {}
            if (isRealEstate) {
                meta.role = form.role
                if (form.city) meta.city = form.city
                if (form.occupation) meta.occupation = form.occupation
                if (form.role === 'tenant') {
                    meta.credit_status = form.credit_status
                    if (form.monthly_income) meta.monthly_income = Number(form.monthly_income)
                }
                if (form.role === 'owner' || form.account_number) {
                    meta.bank_details = {
                        bank: form.bank,
                        account_type: form.account_type,
                        account_number: form.account_number,
                        account_holder: form.account_holder || form.name,
                        id_number: form.id_number || form.nit
                    }
                }
            }

            const { error } = await supabase.from('leads').insert({
                name: form.name,
                company_name: form.company_name,
                nit: form.nit,
                email: form.email,
                phone: form.phone,
                address: form.address,
                website: form.website,
                instagram: form.instagram,
                facebook: form.facebook,
                tiktok: form.tiktok,
                linkedin: form.linkedin,
                youtube: form.youtube,
                twitter: form.twitter,
                contact_type: 'client',
                organization_id: orgId,
                logo_url: finalLogoUrl,
                user_id: user.id,
                category_id: form.category_id,
                metadata: meta,
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
                tiktok: "", linkedin: "", youtube: "", twitter: "", category_id: null,
                role: "tenant", city: "", occupation: "", bank: "Bancolombia",
                account_type: "savings", account_number: "", account_holder: "",
                id_number: "", credit_status: "approved", monthly_income: ""
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
            ) : !isControlled ? (
                <SheetTrigger asChild>
                    <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white font-semibold text-xs rounded-xl h-10 px-4 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        Nuevo Contacto
                    </Button>
                </SheetTrigger>
            ) : null}

            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">
                    <SheetHeader className="sr-only">
                        <SheetTitle>{isRealEstate ? "Crear Contacto Inmobiliario" : "Crear Contacto"}</SheetTitle>
                        <SheetDescription>Completa la información del nuevo contacto.</SheetDescription>
                    </SheetHeader>

                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="p-2.5 bg-brand-pink/10 rounded-xl text-brand-pink shrink-0">
                            {isRealEstate ? <Building2 className="h-5 w-5" /> : <UserCircle className="h-5 w-5" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {isRealEstate ? "Nuevo Contacto Inmobiliario" : "Crear Contacto"}
                            </h2>
                            <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">
                                {isRealEstate
                                    ? "Registra inquilinos, propietarios, compradores y sus datos financieros o de dispersión bancaria."
                                    : "Completa los datos del nuevo contacto para tu base de datos."}
                            </p>
                        </div>
                    </div>

                    {/* Form Body */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                        {/* REAL ESTATE SPECIALIZED PROFILE BLOCK */}
                        {isRealEstate && (
                            <div className="bg-white dark:bg-white/5 p-6 sm:p-8 rounded-2xl border border-brand-pink/20 dark:border-brand-pink/10 shadow-sm space-y-6">
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                                    <h4 className="text-sm font-bold text-brand-pink uppercase tracking-widest flex items-center gap-2">
                                        <Building2 className="h-4 w-4" /> Perfil Inmobiliario & Rol
                                    </h4>
                                    <span className="text-xs text-zinc-500 font-medium">Configuración de Rol y Dispersión</span>
                                </div>

                                {/* Role Selector Pills */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-700 dark:text-gray-200">Tipo de Contacto Inmobiliario *</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {[
                                            { key: "tenant", label: "Inquilino / Arrendatario", icon: Building2, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
                                            { key: "owner", label: "Propietario / Arrendador", icon: Landmark, color: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
                                            { key: "guarantor", label: "Codeudor / Fiador", icon: ShieldCheck, color: "text-violet-600 bg-violet-500/10 border-violet-500/30" },
                                            { key: "buyer", label: "Comprador / Prospecto", icon: Users, color: "text-sky-600 bg-sky-500/10 border-sky-500/30" },
                                            { key: "seller", label: "Vendedor / Propietario", icon: Briefcase, color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/30" },
                                            { key: "other", label: "Contacto General / Otro", icon: UserCircle, color: "text-zinc-600 bg-zinc-500/10 border-zinc-500/30" },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setForm({ ...form, role: item.key as any })}
                                                className={cn(
                                                    "p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer",
                                                    form.role === item.key
                                                        ? `${item.color} shadow-sm ring-1 ring-brand-pink/30`
                                                        : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
                                                )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Ciudad / Sector</Label>
                                        <Input
                                            className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 h-11 dark:text-white"
                                            placeholder="Ej: Ibagué - El Vergel"
                                            value={form.city}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Ocupación / Profesión</Label>
                                        <Input
                                            className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 h-11 dark:text-white"
                                            placeholder="Ej: Médico / Ingeniero / Comerciante"
                                            value={form.occupation}
                                            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* If Owner: Bank Payout Details */}
                                {form.role === "owner" && (
                                    <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300/40 dark:border-amber-500/20 space-y-4">
                                        <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                            <Landmark className="h-4 w-4 text-amber-600" /> Datos Bancarios para Dispersión de Rentas (Liquidación)
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Banco</Label>
                                                <Select value={form.bank} onValueChange={(val) => setForm({ ...form, bank: val })}>
                                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60">
                                                        {COLOMBIAN_BANKS.map((b) => (
                                                            <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Tipo de Cuenta</Label>
                                                <Select value={form.account_type} onValueChange={(val: any) => setForm({ ...form, account_type: val })}>
                                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="savings" className="text-xs">Ahorros</SelectItem>
                                                        <SelectItem value="checking" className="text-xs">Corriente</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Número de Cuenta</Label>
                                                <Input
                                                    className="h-10 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                                    placeholder="Ej: 245-098765-12"
                                                    value={form.account_number}
                                                    onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* If Tenant or Guarantor: Financial Capacity */}
                                {(form.role === "tenant" || form.role === "guarantor") && (
                                    <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                                        <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Estudio de Crédito & Capacidad Financiera
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Estado de Estudio de Fianza / Aseguradora</Label>
                                                <Select value={form.credit_status} onValueChange={(val: any) => setForm({ ...form, credit_status: val })}>
                                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="approved" className="text-xs">🛡️ Aprobado</SelectItem>
                                                        <SelectItem value="in_review" className="text-xs">⏳ En Estudio</SelectItem>
                                                        <SelectItem value="rejected" className="text-xs">❌ Rechazado</SelectItem>
                                                        <SelectItem value="exempt" className="text-xs">🤝 Exento / Garantía Directa</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Ingreso Mensual Estimado (COP)</Label>
                                                <Input
                                                    type="number"
                                                    className="h-10 text-xs font-mono bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                                    placeholder="Ej: 8000000"
                                                    value={form.monthly_income}
                                                    onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Avatar Upload Section */}
                        <div className="flex items-center gap-6 bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            <div className="relative group">
                                <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-900 shadow-xl rounded-2xl">
                                    {previewUrl ? (
                                        <AvatarImage src={previewUrl} className="object-cover" />
                                    ) : (
                                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold rounded-2xl">
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
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Personalización Visual</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sube el logo de la marca para que aparezca en el portal y documentos.</p>
                            </div>
                        </div>

                        {/* Form Grid - Copied from Mi Perfil */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-white/5 p-8 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                            {/* Left Column: Datos de Identidad */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                    <UserCircle className="h-4 w-4" /> Datos de Identidad
                                </h4>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('clients.form.fields.name')} <span className="text-red-500">*</span></Label>
                                    <Input
                                        className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 h-11 dark:text-white"
                                        placeholder={t('clients.form.fields.name_placeholder')}
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('clients.form.fields.company')}</Label>
                                    <Input
                                        className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 h-11 dark:text-white"
                                        placeholder={t('clients.form.fields.company_placeholder')}
                                        value={form.company_name}
                                        onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Categoría <span className="text-red-500">*</span></Label>
                                    <CategorySelector 
                                        value={form.category_id} 
                                        onChange={(val: string) => setForm({ ...form, category_id: val })} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('clients.form.fields.nit')}</Label>
                                    <Input
                                        className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 h-11 font-mono dark:text-white"
                                        placeholder="900.123.456-7"
                                        value={form.nit}
                                        onChange={(e) => setForm({ ...form, nit: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Right Column: Comunicación */}
                            <div className="space-y-6">
                                <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> Comunicación
                                </h4>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Email Directo <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="email"
                                        className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 h-11 dark:text-white"
                                        placeholder="cliente@empresa.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Teléfono / WhatsApp</Label>
                                    <Input
                                        className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 h-11 dark:text-white"
                                        placeholder="+57 300..."
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Dirección Física</Label>
                                    <Input
                                        className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 h-11 dark:text-white"
                                        placeholder="Calle 123..."
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Full Width Bottom: Presencia Digital */}
                            <div className="md:col-span-2 pt-4 border-t border-gray-50 dark:border-white/10 space-y-6">
                                <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> Presencia Digital
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Website</Label>
                                        <Input className="bg-gray-50/50 dark:bg-black/20 dark:border-white/10 h-10 dark:text-white" placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Instagram</Label>
                                        <Input className="bg-gray-50/50 dark:bg-black/20 dark:border-white/10 h-10 dark:text-white" placeholder="@usuario" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Facebook</Label>
                                        <Input className="bg-gray-50/50 dark:bg-black/20 dark:border-white/10 h-10 dark:text-white" placeholder="usuario" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">TikTok</Label>
                                        <Input className="bg-gray-50/50 dark:bg-black/20 dark:border-white/10 h-10 dark:text-white" placeholder="@usuario" value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">LinkedIn</Label>
                                        <Input className="bg-gray-50/50 dark:bg-black/20 dark:border-white/10 h-10 dark:text-white" placeholder="URL perfil" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">YouTube</Label>
                                        <Input className="bg-gray-50/50 dark:bg-black/20 dark:border-white/10 h-10 dark:text-white" placeholder="Canal" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Twitter / X</Label>
                                        <Input className="bg-gray-50/50 dark:bg-black/20 dark:border-white/10 h-10 dark:text-white" placeholder="@usuario" value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20 shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold"
                        >
                            {t('clients.form.buttons.cancel')}
                        </Button>
                        <Button
                            onClick={handleCreateClient}
                            disabled={saving}
                            className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-xl shadow-brand-pink/20 px-8 rounded-xl h-11 font-bold cursor-pointer transition-all"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            {saving ? "Creando..." : "Crear Contacto"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

