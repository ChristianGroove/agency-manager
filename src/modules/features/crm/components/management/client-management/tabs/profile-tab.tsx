import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, UserCircle, Mail, Globe } from "lucide-react"
import { CategorySelector } from "../../../category-selector"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { EditFormState } from "../../../../hooks/management/use-client-management"

interface ProfileTabProps {
    client: any
    editForm: EditFormState
    setEditForm: (form: EditFormState) => void
    onLogoUpload: (file: File) => void
    visibleSections: string[]
}

export function ProfileTab({
    client,
    editForm,
    setEditForm,
    onLogoUpload,
    visibleSections
}: ProfileTabProps) {
    const { t } = useTranslation()

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
