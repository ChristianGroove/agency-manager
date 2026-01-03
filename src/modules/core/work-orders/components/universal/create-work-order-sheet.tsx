"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

import { createWorkOrder } from "../../actions/work-order-actions"
import { getActiveServices, getClients, getStaffMembers } from "../../actions/catalog-actions"

// Schema definition
const formSchema = z.object({
    clientId: z.string().min(1, "El cliente es requerido"),
    serviceId: z.string().min(1, "El servicio es requerido"),
    staffId: z.string().optional(),
    title: z.string().min(1, "El título es requerido"),
    startTime: z.string().min(1, "La fecha de inicio es requerida"),
    address: z.string().optional(),
    notes: z.string().optional(),
    location_type: z.string().optional().default("at_client_address"),
})

type FormValues = z.infer<typeof formSchema>

export function CreateWorkOrderSheet() {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Data state
    const [clients, setClients] = useState<any[]>([])
    const [services, setServices] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            notes: "",
            location_type: "at_client_address",
            clientId: "",
            serviceId: "",
            startTime: "",
            staffId: "unassigned",
            address: ""
        },
    })

    useEffect(() => {
        if (open) {
            loadData()
        }
    }, [open])

    async function loadData() {
        try {
            const [c, s, st] = await Promise.all([
                getClients(),
                getActiveServices(),
                getStaffMembers()
            ])
            setClients(c || [])
            setServices(s || [])
            setStaff(st || [])
        } catch (e) {
            console.error(e)
        }
    }

    // Auto-fill title based on service
    const watchedServiceId = form.watch("serviceId")
    useEffect(() => {
        if (watchedServiceId && services.length > 0) {
            const svc = services.find(s => s.id === watchedServiceId)
            if (svc && !form.getValues("title")) {
                form.setValue("title", svc.name)
            }
        }
    }, [watchedServiceId, services, form])

    async function onSubmit(values: FormValues) {
        setIsLoading(true)
        try {
            const res = await createWorkOrder({
                clientId: values.clientId,
                serviceId: values.serviceId,
                staffId: values.staffId === 'unassigned' ? undefined : values.staffId,
                startTime: values.startTime,
                address: values.address || '',
                notes: values.notes,
                title: values.title
            })

            if (res.success) {
                toast.success("Orden de trabajo creada")
                setOpen(false)
                form.reset()
                window.location.reload()
            } else {
                toast.error(res.error || "Error al crear orden")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Orden
                </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-[540px]">
                <SheetHeader>
                    <SheetTitle>Crear Orden de Trabajo</SheetTitle>
                    <SheetDescription>
                        Asigna un servicio del catálogo a un cliente.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cliente</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar cliente" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {clients.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="serviceId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Servicio (Catálogo)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar servicio" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {services.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.base_price > 0 ? `$${s.base_price}` : 'Consultar'})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Título de la Tarea</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej. Limpieza Profunda" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fecha y Hora Inicio</FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="staffId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Asignar a (Opcional)</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar personal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                                                    {staff.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dirección (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Dejar vacío para usar dirección del cliente" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notas Internas</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Instrucciones para el personal..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Crear Orden
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
