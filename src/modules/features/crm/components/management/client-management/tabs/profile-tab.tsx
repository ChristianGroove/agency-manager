import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, UserCircle, Mail, Globe, Building2, Landmark, ShieldCheck, Briefcase, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategorySelector } from "../../../category-selector"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { EditFormState } from "../../../../hooks/management/use-client-management"
import { COLOMBIAN_BANKS } from "@/modules/core/organizations/vertical-registry"
import { cn } from "@/modules/infrastructure/utils/utils"

interface ProfileTabProps {
    client: any
    editForm: EditFormState
    setEditForm: (form: EditFormState) => void
    onLogoUpload: (file: File) => void
    visibleSections: string[]
    spaceType?: string
}

export function ProfileTab({
    client,
    editForm,
    setEditForm,
    onLogoUpload,
    visibleSections,
    spaceType
}: ProfileTabProps) {
    const { t } = useTranslation()
    const isRealEstate = spaceType === 'real_estate'

    return (
        <div className="space-y-8 m-0 animate-in slide-in-from-right-4 duration-300">
            {/* Header Persona */}
            <div className="flex items-center gap-6 bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                <div className="relative group">
                    <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-900 shadow-xl">
                        <AvatarImage src={editForm.logo_url} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                            {client.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <button
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                        <Upload className="h-6 w-6" />
                    </button>
                    <input 
                        id="logo-upload"
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => e.target.files?.[0] && onLogoUpload(e.target.files[0])} 
                    />
                </div>
                <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Personalización Visual</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sube el logo de la marca para que aparezca en el portal y documentos.</p>
                </div>
            </div>

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
                                    onClick={() => setEditForm({ ...editForm, role: item.key })}
                                    className={cn(
                                        "p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer",
                                        editForm.role === item.key
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
                                value={editForm.city || ""}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 dark:text-gray-400">Ocupación / Profesión</Label>
                            <Input
                                className="bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 h-11 dark:text-white"
                                placeholder="Ej: Médico / Ingeniero / Comerciante"
                                value={editForm.occupation || ""}
                                onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* If Owner: Bank Payout Details */}
                    {editForm.role === "owner" && (
                        <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300/40 dark:border-amber-500/20 space-y-4">
                            <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                <Landmark className="h-4 w-4 text-amber-600" /> Datos Bancarios para Dispersión de Rentas (Liquidación)
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Banco</Label>
                                    <Select value={editForm.bank || "Bancolombia"} onValueChange={(val) => setEditForm({ ...editForm, bank: val })}>
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
                                    <Select value={editForm.account_type || "savings"} onValueChange={(val: any) => setEditForm({ ...editForm, account_type: val })}>
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
                                        value={editForm.account_number || ""}
                                        onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* If Tenant or Guarantor: Financial Capacity */}
                    {(editForm.role === "tenant" || editForm.role === "guarantor") && (
                        <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                            <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Estudio de Crédito & Capacidad Financiera
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Estado de Estudio de Fianza / Aseguradora</Label>
                                    <Select value={editForm.credit_status || "approved"} onValueChange={(val) => setEditForm({ ...editForm, credit_status: val })}>
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
                                        value={editForm.monthly_income || ""}
                                        onChange={(e) => setEditForm({ ...editForm, monthly_income: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Formulario Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white dark:bg-white/5 p-8 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <UserCircle className="h-4 w-4" /> Datos de Identidad
                    </h4>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500">{t('clients.form.fields.name')}</Label>
                        <Input
                            className="h-11"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500">{t('clients.form.fields.company')}</Label>
                        <Input
                            className="h-11"
                            value={editForm.company_name}
                            onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
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
                    <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Comunicación
                    </h4>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500">Email</Label>
                        <Input
                            className="h-11"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500">Teléfono</Label>
                        <Input
                            className="h-11"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500">Notas</Label>
                        <Textarea
                            className="min-h-[100px]"
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        />
                    </div>
                </div>

                {visibleSections.includes('digital_presence') && (
                    <div className="md:col-span-2 pt-4 border-t border-gray-50 space-y-6">
                        <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <Globe className="h-4 w-4" /> Presencia Digital
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input placeholder="Website" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
                            <Input placeholder="Instagram" value={editForm.instagram} onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
