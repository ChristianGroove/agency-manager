"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

import { createWorkOrder, updateWorkOrder } from "../actions/work-order-actions"
import { getCleaningServices } from "../actions/service-actions"
import { getCleaningStaff } from "../actions/staff-actions"
import { getClients } from "@/modules/core/clients/actions"

const formSchema = z.object({
    clientId: z.string().min(1, "El cliente es requerido"),
    serviceId: z.string().min(1, "El servicio es requerido"),
    staffId: z.string().optional(),
    startTime: z.date(),
    address: z.string().min(5, "La dirección es requerida"),
    notes: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

interface JobFormProps {
    jobToEdit?: any
    onSuccess: () => void
    onCancel: () => void
}

export function JobForm({ jobToEdit, onSuccess, onCancel }: JobFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [services, setServices] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientId: "",
            serviceId: "",
            staffId: "unassigned",
            startTime: new Date(),
            address: "",
            notes: ""
        }
    })

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (jobToEdit) {
            form.reset({
                clientId: jobToEdit.client_id,
                serviceId: jobToEdit.service_id,
                staffId: jobToEdit.staff_id || "unassigned",
                startTime: new Date(jobToEdit.start_time),
                address: jobToEdit.address_text || jobToEdit.location_address, // Fallback
                notes: jobToEdit.description || ""
            })
        }
    }, [jobToEdit])

    async function loadData() {
        const [servicesRes, staffRes, clientsRes] = await Promise.all([
            getCleaningServices(),
            getCleaningStaff(),
            getClients()
        ])
        setServices(servicesRes || [])
        setStaff(staffRes || [])
        setClients(clientsRes || [])
    }

    const selectedClientId = form.watch('clientId')
    useEffect(() => {
        if (selectedClientId && !jobToEdit) { // Only auto-fill on create
            const client = clients.find(c => c.id === selectedClientId)
            if (client && client.address) {
                form.setValue('address', client.address)
            }
        }
    }, [selectedClientId, clients, form, jobToEdit])

    async function onSubmit(data: FormValues) {
        setIsLoading(true)
        try {
            let res
            if (jobToEdit) {
                res = await updateWorkOrder(jobToEdit.id, {
                    staffId: data.staffId === "unassigned" ? undefined : data.staffId,
                    startTime: data.startTime ? data.startTime.toISOString() : undefined,
                    notes: data.notes,
                    // We don't update client/service/address usually in simple edit
                })
            } else {
                res = await createWorkOrder({
                    clientId: data.clientId,
                    serviceId: data.serviceId,
                    staffId: data.staffId === "unassigned" ? undefined : data.staffId,
                    startTime: data.startTime.toISOString(),
                    address: data.address,
                    notes: data.notes
                })
            }

            if (res.success) {
                onSuccess()
            } else {
                console.error(res.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* Read-only Client/Service in Edit Mode? Or allow change? Let's allow change for flexibilty but maybe warn */}

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cliente</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!jobToEdit}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar cliente" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name || `${client.first_name || ''} ${client.last_name || ''}`}
                                            </SelectItem>
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
                                <FormLabel>Servicio</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!jobToEdit}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tipo de servicio" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {services.map((service) => (
                                            <SelectItem key={service.id} value={service.id}>
                                                {service.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Fecha y Hora</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {isMounted && field.value ? (
                                                    format(field.value, "dd/MM HH:mm", { locale: es })
                                                ) : (
                                                    <span>Seleccionar fecha</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(date) => {
                                                const newDate = date || new Date()
                                                newDate.setHours(9, 0, 0, 0)
                                                field.onChange(newDate)
                                            }}
                                            initialFocus
                                        />
                                        <div className="p-3 border-t">
                                            <Input
                                                type="time"
                                                onChange={(e) => {
                                                    const [hours, minutes] = e.target.value.split(':')
                                                    const newDate = new Date(field.value || new Date())
                                                    newDate.setHours(parseInt(hours), parseInt(minutes))
                                                    field.onChange(newDate)
                                                }}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="staffId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Asignado A</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="unassigned">-- Sin asignar --</SelectItem>
                                        {staff.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.name}
                                            </SelectItem>
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
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input className="pl-9" {...field} />
                                </div>
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
                            <FormLabel>Notas</FormLabel>
                            <FormControl>
                                <Input placeholder="Instrucciones especiales..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {jobToEdit ? "Guardar Cambios" : "Agendar Trabajo"}
                    </Button>
                </div>
            </form>
        </Form >
    )
}
