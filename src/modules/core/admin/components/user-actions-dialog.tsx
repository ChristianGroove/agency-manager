"use client"

import { useState, useEffect } from "react"
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
    DialogFooter
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { adminResetUserPassword, adminUpdateUser } from '@/modules/core/admin/actions'
import { toast } from "sonner"
import { Loader2, Key, Mail, User, ShieldAlert } from "lucide-react"

const formSchema = z.object({
    email: z.string().email("Correo inválido").optional().or(z.literal('')),
    full_name: z.string().optional().or(z.literal('')),
    platform_role: z.enum(['user', 'super_admin', 'support']).optional(),
})

interface UserActionsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: any
    orgId: string | null
    onSuccess: () => void
}

export function UserActionsDialog({ open, onOpenChange, user, orgId, onSuccess }: UserActionsDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isResetting, setIsResetting] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: user?.user?.email || "",
            full_name: user?.full_name || "",
            platform_role: user?.user?.platform_role || "user",
        },
    })

    const { reset } = form

    // Sync form with user when it changes
    useEffect(() => {
        if (open && user) {
            reset({
                email: user?.user?.email || "",
                full_name: user?.full_name || "",
                platform_role: user?.user?.platform_role || "user",
            })
        }
    }, [user, open, reset])

    async function onUpdateProfile(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            await adminUpdateUser(user.user_id, orgId, {
                email: values.email || undefined,
                full_name: values.full_name,
                platform_role: values.platform_role
            })
            toast.success("Usuario actualizado correctamente")
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar usuario")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleResetPassword() {
        if (!confirm(`¿Estás seguro de que deseas enviar un correo de restablecimiento de contraseña a ${user.user.email}?`)) return

        setIsResetting(true)
        try {
            await adminResetUserPassword(user.user_id, orgId)
            toast.success("Correo de restablecimiento enviado correctamente")
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Error al enviar restablecimiento")
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Gestionar Usuario
                    </DialogTitle>
                    <DialogDescription>
                        Modifica el perfil o solicita la recuperación de acceso para el usuario.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Password Reset Section (Requested Feature) */}
                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Key className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-indigo-950">Acceso & Seguridad</h4>
                                <p className="text-xs text-indigo-700/70">Envía un enlace oficial para cambiar contraseña.</p>
                            </div>
                        </div>
                        <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                            onClick={handleResetPassword}
                            disabled={isResetting || isLoading}
                        >
                            {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Link"}
                        </Button>
                    </div>

                    {/* Profile Form */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onUpdateProfile)} className="space-y-4">
                            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">Información del Perfil</h4>
                            
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nombre del usuario" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correo Electrónico</FormLabel>
                                        <FormControl>
                                            <Input type="email" {...field} />
                                        </FormControl>
                                        <FormDescription className="text-[10px]">
                                            Advertencia: Cambiar el correo afectará el inicio de sesión.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="platform_role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2 text-rose-600">
                                            <ShieldAlert className="h-4 w-4" />
                                            Rol de Plataforma
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un rol" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="user">Usuario (Cliente)</SelectItem>
                                                <SelectItem value="support">Soporte Pixy</SelectItem>
                                                <SelectItem value="super_admin">Super Administrador</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
                                    Cerrar
                                </Button>
                                <Button type="submit" disabled={isLoading} className="gap-2">
                                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Actualizar Perfil
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
