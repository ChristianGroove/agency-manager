"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createCleaningService, updateCleaningService } from "../../actions/service-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(2, {
        message: "El nombre debe tener al menos 2 caracteres.",
    }),
    description: z.string().optional(),
    base_price: z.coerce.number().min(0),
    price_unit: z.enum(["per_service", "per_hour", "per_sqm", "flat"]),
    estimated_duration_minutes: z.coerce.number().min(1),
})

interface ServiceFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    serviceToEdit?: any
    onSuccess: () => void
}

export function ServiceForm({ open, onOpenChange, serviceToEdit, onSuccess }: ServiceFormProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: serviceToEdit?.name || "",
            description: serviceToEdit?.description || "",
            base_price: serviceToEdit?.base_price || 0,
            price_unit: serviceToEdit?.price_unit || "per_service",
            estimated_duration_minutes: serviceToEdit?.estimated_duration_minutes || 60,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            if (serviceToEdit) {
                const result = await updateCleaningService(serviceToEdit.id, values)
                if (result.success) {
                    toast.success("Servicio actualizado correctamente")
                    onSuccess()
                    onOpenChange(false)
                } else {
                    toast.error("Error al actualizar: " + result.error)
                }
            } else {
                const result = await createCleaningService(values)
                if (result.success) {
                    toast.success("Servicio creado correctamente")
                    onSuccess()
                    onOpenChange(false)
                } else {
                    toast.error("Error al crear: " + result.error)
                }
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
            <SheetContent className="sm:max-w-[500px]">
                <SheetHeader>
                    <SheetTitle>{serviceToEdit ? "Editar Servicio" : "Nuevo Servicio de Limpieza"}</SheetTitle>
                    <SheetDescription>
                        Configura los detalles del servicio de limpieza.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre del Servicio</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Limpieza Profunda" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descripción</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Detalles del servicio..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="base_price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Base ($)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="price_unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unidad de Cobro</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="per_service">Por Servicio</SelectItem>
                                                    <SelectItem value="per_hour">Por Hora</SelectItem>
                                                    <SelectItem value="per_sqm">Por m²</SelectItem>
                                                    <SelectItem value="flat">Tarifa Plana</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="estimated_duration_minutes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duración Estimada (min)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Tiempo promedio para la planificación.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {serviceToEdit ? "Guardar Cambios" : "Crear Servicio"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
