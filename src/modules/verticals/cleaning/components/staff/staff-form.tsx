"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { registerCleaningStaff, updateStaffProfile } from "../../actions/staff-actions"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    firstName: z.string().min(1, "El nombre es requerido"),
    lastName: z.string().min(1, "El apellido es requerido"),
    email: z.string().email("Email inválido"),
    phone: z.string().optional(),
    role: z.string().min(1, "El rol es requerido"),
    hourlyRate: z.coerce.number().min(0),
    skills: z.array(z.string()).default([]),
})

type FormValues = z.infer<typeof formSchema>

interface StaffFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    staffToEdit?: any
    onSuccess: () => void
}

const CLEANING_SKILLS = [
    { id: "general", label: "Limpieza General" },
    { id: "deep", label: "Limpieza Profunda" },
    { id: "windows", label: "Vidrios" },
    { id: "carpets", label: "Alfombras" },
    { id: "biosecurity", label: "Bioseguridad" },
]

export function StaffForm({ open, onOpenChange, staffToEdit, onSuccess }: StaffFormProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            role: "cleaner",
            hourlyRate: 15000,
            skills: []
        }
    })

    useEffect(() => {
        if (open) {
            if (staffToEdit) {
                // Handle splitting full name logic slightly robustly if legacy
                const firstName = staffToEdit.first_name || staffToEdit.full_name?.split(' ')[0] || ""
                const lastName = staffToEdit.last_name || (staffToEdit.full_name?.split(' ').slice(1).join(' ')) || ""

                form.reset({
                    firstName: firstName,
                    lastName: lastName,
                    email: staffToEdit.email || "",
                    phone: staffToEdit.phone || "",
                    role: staffToEdit.role,
                    hourlyRate: staffToEdit.hourly_rate,
                    skills: staffToEdit.skills || []
                })
            } else {
                form.reset({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    role: "cleaner",
                    hourlyRate: 15000,
                    skills: []
                })
            }
        }
    }, [open, staffToEdit])

    async function onSubmit(data: FormValues) {
        setIsLoading(true)
        try {
            let res
            if (staffToEdit) {
                res = await updateStaffProfile(staffToEdit.id, {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    role: data.role,
                    hourly_rate: data.hourlyRate,
                    skills: data.skills
                })
            } else {
                res = await registerCleaningStaff({
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    role: data.role,
                    hourly_rate: data.hourlyRate,
                    skills: data.skills
                })
            }

            if (res.success) {
                onSuccess()
                onOpenChange(false)
            } else {
                console.error(res.error)
                alert("Error: " + res.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{staffToEdit ? "Editar Perfil de Staff" : "Registrar Nuevo Staff"}</DialogTitle>
                    <DialogDescription>
                        {staffToEdit
                            ? "Actualiza los datos del personal."
                            : "Registra un nuevo colaborador. Se le generará un enlace de acceso al portal."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ej: Juan" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Apellido</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ej: Pérez" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Correo Electrónico</FormLabel>
                                    <FormControl>
                                        <Input type="email" {...field} placeholder="juan@email.com" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teléfono / Celular</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="+57 300 123 4567" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rol Operativo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar rol" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="cleaner">Operario de Limpieza</SelectItem>
                                                <SelectItem value="supervisor">Supervisor de Campo</SelectItem>
                                                <SelectItem value="specialist">Especialista</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="hourlyRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tarifa Hora ($)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} value={field.value as string | number} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="skills"
                            render={() => (
                                <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Habilidades</FormLabel>
                                        <DialogDescription>
                                            Selecciona las categorías de limpieza que domina.
                                        </DialogDescription>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {CLEANING_SKILLS.map((item) => (
                                            <FormField
                                                key={item.id}
                                                control={form.control}
                                                name="skills"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                            key={item.id}
                                                            className="flex flex-row items-start space-x-3 space-y-0"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(item.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...(field.value || []), item.id])
                                                                            : field.onChange(
                                                                                field.value?.filter(
                                                                                    (value) => value !== item.id
                                                                                )
                                                                            )
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal text-sm cursor-pointer">
                                                                {item.label}
                                                            </FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {staffToEdit ? "Guardar Cambios" : "Registrar Personal"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
