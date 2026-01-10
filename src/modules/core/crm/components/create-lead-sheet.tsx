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
import { createLead } from "../leads-actions"
import { supabase } from "@/lib/supabase"

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

export function CreateLeadSheet({ open, onOpenChange, onSuccess }: CreateLeadSheetProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState<any>(null)

    const checkDuplicatePhone = async (phone: string): Promise<any> => {
        if (!phone || phone.length < 7) {
            setDuplicateWarning(null)
            return null
        }
        const clean = phone.replace(/\D/g, '')
        const orgId = (await import('@/modules/core/organizations/actions').then(m => m.getCurrentOrganizationId()))!

        // Check Leads
        // Use maybeSingle() to handle 0 or 1 matches gracefully. limit(1) ensures we don't error on multiples.
        const { data: lead } = await supabase.from('leads').select('*').eq('organization_id', orgId).ilike('phone', `%${clean}%`).limit(1).maybeSingle()
        if (lead) {
            const dbClean = lead.phone?.replace(/\D/g, '') || ''
            if (dbClean.endsWith(clean) || clean.endsWith(dbClean)) {
                setDuplicateWarning({ ...lead, type: 'lead' })
                return { ...lead, type: 'lead' }
            }
        }

        // Check Clients
        const { data: client } = await supabase.from('clients').select('*').eq('organization_id', orgId).ilike('phone', `%${clean}%`).limit(1).maybeSingle()
        if (client) {
            const dbClean = client.phone?.replace(/\D/g, '') || ''
            if (dbClean.endsWith(clean) || clean.endsWith(dbClean)) {
                setDuplicateWarning({ ...client, type: 'client' })
                return { ...client, type: 'client' }
            }
        }
        setDuplicateWarning(null)
        return null
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<LeadFormData>({
        resolver: zodResolver(leadSchema),
        defaultValues: {
            name: "",
            company_name: "",
            email: "",
            phone: "",
            notes: "",
        },
    })

    const onSubmit = async (data: LeadFormData) => {
        if (data.phone) {
            const dup = await checkDuplicatePhone(data.phone)
            if (dup) {
                toast.warning(`El número ya existe en un ${dup.type === 'lead' ? 'Lead' : 'Cliente'}: ${dup.name}`)
                return
            }
        }
        setIsLoading(true)
        try {
            const result = await createLead(data)

            if (result.success) {
                toast.success("Lead creado correctamente")
                reset()
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(result.error || "Error al crear lead")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
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
                <div className="flex flex-col h-full bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 bg-white/80 dark:bg-zinc-800/80 border-b border-gray-100 dark:border-white/5 flex-shrink-0 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Lead</SheetTitle>
                                <SheetDescription>Agrega un nuevo prospecto al pipeline</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Form */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="create-lead-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Sección: Información Básica */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-zinc-700" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Información del Lead
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent dark:from-zinc-700" />
                                </div>

                                {/* Nombre */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-semibold">
                                        Nombre del Lead <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        placeholder="Juan Pérez"
                                        {...register("name")}
                                        className={`h-11 bg-white dark:bg-zinc-900 ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-red-500">{errors.name.message}</p>
                                    )}
                                </div>

                                {/* Empresa */}
                                <div className="space-y-2">
                                    <Label htmlFor="company_name" className="text-sm font-semibold flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-gray-400" />
                                        Empresa
                                    </Label>
                                    <Input
                                        id="company_name"
                                        placeholder="Acme Corp"
                                        {...register("company_name")}
                                        className="h-11 bg-white dark:bg-zinc-900"
                                    />
                                </div>
                            </div>

                            <Separator className="dark:bg-zinc-700" />

                            {/* Sección: Contacto */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-zinc-700" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Información de Contacto
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent dark:from-zinc-700" />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="juan@acme.com"
                                        {...register("email")}
                                        className={`h-11 bg-white dark:bg-zinc-900 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-500">{errors.email.message}</p>
                                    )}
                                </div>

                                {/* Teléfono */}
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="phone"
                                        placeholder="+57 300 123 4567"
                                        {...register("phone")}
                                        className="h-11 bg-white dark:bg-zinc-900"
                                        onBlur={(e) => checkDuplicatePhone(e.target.value)}
                                    />
                                    {duplicateWarning && (
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                                            <span className="font-bold block mb-1">⚠️ Número Duplicado</span>
                                            Este teléfono ya pertenece a: <b>{duplicateWarning.name}</b> ({duplicateWarning.type === 'lead' ? 'Lead' : 'Cliente'})
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator className="dark:bg-zinc-700" />

                            {/* Sección: Notas */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent dark:from-zinc-700" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Notas Adicionales
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent dark:from-zinc-700" />
                                </div>

                                {/* Notas */}
                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                        Observaciones
                                    </Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Información relevante sobre este lead..."
                                        rows={4}
                                        {...register("notes")}
                                        className="resize-none bg-white dark:bg-zinc-900"
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <SheetFooter className="p-6 bg-white/80 dark:bg-zinc-800/80 border-t border-gray-100 dark:border-white/5 backdrop-blur-md flex flex-row justify-between gap-3 sm:space-x-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 sm:flex-none"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            form="create-lead-form"
                            disabled={isLoading || !!duplicateWarning}
                            className="flex-1 sm:flex-none bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}
