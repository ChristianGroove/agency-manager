"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, UserPlus, Building2, Mail, Phone, FileText } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createLeadAction as createLead } from "../crm-actions"
import { supabase } from "@/modules/core/database/supabase"

const leadSchema = z.object({
    name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
    company_name: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional(),
    notes: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface CreateLeadSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

import { useTranslation } from "@/modules/core/i18n/use-translation"

export function CreateLeadSheet({ open, onOpenChange, onSuccess }: CreateLeadSheetProps) {
    const { t: originalT } = useTranslation()
    const t = (key: any) => originalT(key)
    const [isLoading, setIsLoading] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState<any>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<LeadFormData>({
        resolver: zodResolver(leadSchema),
        defaultValues: {
            name: "",
            company_name: "",
            email: "",
            phone: "",
            notes: ""
        }
    })

    const onSubmit = async (data: LeadFormData) => {
        setIsLoading(true)
        try {
            const { getCurrentOrganizationId } = await import('@/modules/core/organizations/organization-actions')
            const orgId = await getCurrentOrganizationId()

            if (!orgId) {
                toast.error(t('crm.leads.toasts.error_org'))
                return
            }

            const result = await createLead({
                ...data
            })

            if (result?.error) {
                toast.error(t('crm.leads.toasts.error_create'))
                return
            }

            toast.success(t('crm.leads.toasts.created'))
            reset()
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error(t('crm.leads.toasts.error_generic'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[800px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-brand-cyan/10 rounded-xl text-brand-cyan shrink-0">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{t('crm.leads.title')}</SheetTitle>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('crm.leads.desc')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Content */}
                    <ScrollArea className="flex-1">
                        <div className="px-8 py-6">
                            <form id="create-lead-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                {/* Sección: Información Básica */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-zinc-800" />
                                        <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                            {t('crm.leads.section_info')}
                                        </span>
                                        <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent dark:from-zinc-800" />
                                    </div>

                                    {/* Nombre */}
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                            {t('crm.leads.name_label')} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            placeholder="Juan Pérez"
                                            {...register("name")}
                                            className={`h-11 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl shadow-xs ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-red-500">{errors.name.message}</p>
                                        )}
                                    </div>

                                    {/* Empresa */}
                                    <div className="space-y-2">
                                        <Label htmlFor="company_name" className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                            {t('crm.leads.company_label')}
                                        </Label>
                                        <Input
                                            id="company_name"
                                            placeholder="Acme Corp"
                                            {...register("company_name")}
                                            className="h-11 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl shadow-xs"
                                        />
                                    </div>
                                </div>

                                <Separator className="dark:bg-white/5" />

                                {/* Sección: Contacto */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-zinc-800" />
                                        <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                            {t('crm.leads.section_contact')}
                                        </span>
                                        <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent dark:from-zinc-800" />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            {t('crm.leads.email_label')}
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="juan@acme.com"
                                            {...register("email")}
                                            className={`h-11 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl shadow-xs ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                        />
                                        {errors.email && (
                                            <p className="text-xs text-red-500">{errors.email.message}</p>
                                        )}
                                    </div>

                                    {/* Teléfono */}
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                            {t('crm.leads.phone_label')}
                                        </Label>
                                        <Input
                                            id="phone"
                                            placeholder="+57 300 123 4567"
                                            {...register("phone")}
                                            className="h-11 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl shadow-xs"
                                        />
                                        {duplicateWarning && (
                                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                                                <span className="font-bold block mb-1">⚠️ Número Duplicado</span>
                                                Este teléfono ya pertenece a: <b>{duplicateWarning.name}</b> ({duplicateWarning.type === 'lead' ? 'Lead' : 'Cliente'})
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator className="dark:bg-white/5" />

                                {/* Sección: Notas */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-zinc-800" />
                                        <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                            {t('crm.leads.section_notes')}
                                        </span>
                                        <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent dark:from-zinc-800" />
                                    </div>

                                    {/* Notas */}
                                    <div className="space-y-2">
                                        <Label htmlFor="notes" className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                            {t('crm.leads.notes_label')}
                                        </Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Información relevante sobre este lead..."
                                            rows={4}
                                            {...register("notes")}
                                            className="resize-none bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl shadow-xs"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            form="create-lead-form"
                            disabled={isLoading || !!duplicateWarning}
                            className="bg-brand-cyan text-white hover:bg-brand-cyan/90 shadow-xl shadow-brand-cyan/20 px-8 rounded-xl h-11 cursor-pointer font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Crear Lead
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

