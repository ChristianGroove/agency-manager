"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Lead } from "@/types"
import { updateLead } from "../leads-actions"

const leadSchema = z.object({
    name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
    company_name: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional(),
    notes: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface EditLeadSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    lead: Lead | null
    onSuccess: () => void
}

export function EditLeadSheet({ open, onOpenChange, lead, onSuccess }: EditLeadSheetProps) {
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<LeadFormData>({
        resolver: zodResolver(leadSchema),
    })

    // Reset form when lead changes
    useEffect(() => {
        if (lead) {
            reset({
                name: lead.name,
                company_name: lead.company_name || "",
                email: lead.email || "",
                phone: lead.phone || "",
                notes: lead.notes || "",
            })
        }
    }, [lead, reset])

    const onSubmit = async (data: LeadFormData) => {
        if (!lead) return

        setIsLoading(true)
        try {
            const result = await updateLead(lead.id, data)

            if (result.success) {
                toast.success("Lead actualizado correctamente")
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error(result.error || "Error al actualizar lead")
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
                className="
                    sm:max-w-[540px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 bg-white/80 dark:bg-zinc-800/80 border-b border-gray-100 dark:border-white/5 flex-shrink-0 backdrop-blur-md sticky top-0 z-10">
                        <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white">Editar Lead</SheetTitle>
                        <SheetDescription>
                            Actualiza la información del prospecto
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="edit-lead-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Nombre */}
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Nombre del Lead <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Juan Pérez"
                                    {...register("name")}
                                    className={errors.name ? "border-red-500" : ""}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name.message}</p>
                                )}
                            </div>

                            {/* Empresa */}
                            <div className="space-y-2">
                                <Label htmlFor="company_name">Empresa</Label>
                                <Input
                                    id="company_name"
                                    placeholder="Acme Corp"
                                    {...register("company_name")}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="juan@acme.com"
                                    {...register("email")}
                                    className={errors.email ? "border-red-500" : ""}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500">{errors.email.message}</p>
                                )}
                            </div>

                            {/* Teléfono */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    placeholder="+57 300 123 4567"
                                    {...register("phone")}
                                />
                            </div>

                            {/* Notas */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Información adicional..."
                                    rows={4}
                                    {...register("notes")}
                                    className="bg-white dark:bg-zinc-900 resize-none"
                                />
                            </div>
                        </form>
                    </div>

                    <SheetFooter className="p-6 bg-white/80 dark:bg-zinc-800/80 border-t border-gray-100 dark:border-white/5 backdrop-blur-md flex flex-row justify-between gap-3 sm:space-x-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 sm:flex-none"
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" form="edit-lead-form" disabled={isLoading} className="flex-1 sm:flex-none">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}
