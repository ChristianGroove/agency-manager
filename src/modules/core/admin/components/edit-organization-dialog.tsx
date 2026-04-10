"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { updateOrganization, getSaasProducts, updateAdvancedOrganizationOptions } from '@/modules/core/admin/actions'
import { toast } from "sonner"
import { Loader2, Key, Calendar, Mail } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    base_app_slug: z.string().optional(),
    created_at: z.string().optional(),
    owner_email: z.string().email("Correo inválido").optional().or(z.literal('')),
    owner_password: z.string().min(6, "Mínimo 6 caracteres").optional().or(z.literal('')),
})

interface EditOrganizationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organization: any
    onSuccess: () => void
}

export function EditOrganizationDialog({ open, onOpenChange, organization, onSuccess }: EditOrganizationDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [products, setProducts] = useState<any[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            slug: "",
            base_app_slug: "",
            created_at: "",
            owner_email: "",
            owner_password: "",
        },
    })

    // Update form when organization changes
    useEffect(() => {
        if (organization) {
            // Convert to YYYY-MM-DDThh:mm for datetime-local
            let formattedDate = ""
            if (organization.created_at) {
                const date = new Date(organization.created_at)
                formattedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            }

            form.reset({
                name: organization.name || "",
                slug: organization.slug || "",
                base_app_slug: organization.base_app_slug || "none",
                created_at: formattedDate,
                owner_email: "", // We don't fetch it directly here by default to prevent leaking unless needed, but we provide the field to overwrite
                owner_password: "",
            })
        }
    }, [organization, form])

    // Fetch products on mount
    useEffect(() => {
        getSaasProducts().then(setProducts).catch(console.error)
    }, [])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            // 1. Basic Update
            await updateOrganization(organization.id, {
                name: values.name,
                slug: values.slug,
                base_app_slug: values.base_app_slug === 'none' ? undefined : values.base_app_slug
            })

            // 2. Advanced Update (if any field is provided)
            if (values.created_at || values.owner_email || values.owner_password) {
                const advancedPayload: any = {}

                if (values.created_at) {
                    // Convert back to ISO UTC
                    advancedPayload.created_at = new Date(values.created_at).toISOString()
                }

                if (values.owner_email && values.owner_email.trim() !== '') {
                    advancedPayload.new_email = values.owner_email
                }

                if (values.owner_password && values.owner_password.trim() !== '') {
                    advancedPayload.new_password = values.owner_password
                }

                if (Object.keys(advancedPayload).length > 0) {
                    await updateAdvancedOrganizationOptions(organization.id, advancedPayload)
                }
            }

            toast.success("Organización actualizada correctamente")
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar la organización")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Organización & Ajustes Avanzados</DialogTitle>
                    <DialogDescription>
                        Modifica los parámetros raíz del Tenant. Los cambios en Accesos y Auth son instantáneos.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">

                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-2">Datos Básicos</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug (URL)</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="base_app_slug"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>App Base (Template de Módulos)</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Sin asignación base</SelectItem>
                                                {products.map((p) => (
                                                    <SelectItem key={p.id} value={p.slug}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-amber-700 border-b border-amber-200 pb-2 flex items-center gap-2">
                                Modificaciones Críticas (SuperAdmin)
                            </h4>

                            <FormField
                                control={form.control}
                                name="created_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            Fecha de Registro (Sobrescribir)
                                        </FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormDescription>Útil para alinear fechas de clientes importados.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-4">
                                <div className="text-sm text-rose-800 font-medium mb-2">Auth de Propietario (Owner)</div>
                                <FormField
                                    control={form.control}
                                    name="owner_email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                Nuevo Correo Electrónico
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="Dejar en blanco para no cambiar..." type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="owner_password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Key className="h-4 w-4 text-muted-foreground" />
                                                Forzar Nueva Contraseña
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="Dejar en blanco para no cambiar..." type="password" {...field} autoComplete="new-password" />
                                            </FormControl>
                                            <FormDescription>
                                                Asignará una clave de acceso directo sin confirmación por correo.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="mr-2" disabled={isLoading}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="shadow-md">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Configuraciones
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
