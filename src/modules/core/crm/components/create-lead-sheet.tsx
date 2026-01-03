"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
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
                <SheetHeader className="hidden">
                    <SheetTitle>Nuevo Lead</SheetTitle>
                    <SheetDescription>Agrega un nuevo prospecto al CRM</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Nuevo Lead</h2>
                                <p className="text-xs text-muted-foreground">
                                    Agrega un nuevo prospecto a tu pipeline
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <ScrollArea className="flex-1 px-8 py-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Sección: Información Básica */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Información del Lead
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent" />
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
                                        className={`h-11 ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
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
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Sección: Contacto */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Información de Contacto
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent" />
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
                                        className={`h-11 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
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
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Sección: Notas */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Notas Adicionales
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent" />
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
                                        className="resize-none"
                                    />
                                </div>
                            </div>
                        </form>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-gray-500 hover:text-red-500"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                            className="bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 px-6 rounded-xl h-11"
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
