"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AvatarUpload } from "./avatar-upload"
import { uploadAvatar, updateProfile } from "@/modules/core/auth/actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ProfileFormProps {
    user: {
        id: string
        email?: string
        user_metadata: any
    }
    profile: {
        full_name: string | null
        job_title: string | null
        phone: string | null
        avatar_url: string | null
    } | null
    align?: "center" | "left"
}

export function ProfileForm({ user, profile, align = "center" }: ProfileFormProps) {
    const [loading, setLoading] = useState(false)

    async function onSubmit(formData: FormData) {
        setLoading(true)
        try {
            const result = await updateProfile(null, formData)

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Perfil guardado correctamente")
            }
        } catch (err) {
            toast.error("Ocurrió un error inesperado")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid gap-6">
            {/* Personal Info Section with Integrated Avatar */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle>Información Personal</CardTitle>
                        <CardDescription>Actualiza tus datos de contacto e identidad.</CardDescription>
                    </div>
                    <div>
                        <AvatarUpload
                            userId={user.id}
                            currentUrl={profile?.avatar_url || user.user_metadata?.avatar_url}
                            fullName={profile?.full_name || user.user_metadata?.full_name}
                            align={align}
                            layout="horizontal"
                            showLabel={false}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <form action={onSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" value={user.email} disabled className="bg-muted" />
                            <p className="text-[0.8rem] text-muted-foreground">El correo no se puede cambiar aquí.</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="fullName">Nombre Completo</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                defaultValue={profile?.full_name || ""}
                                placeholder="Ej: Juan Pérez"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="jobTitle">Cargo / Título</Label>
                                <Input
                                    id="jobTitle"
                                    name="jobTitle"
                                    defaultValue={profile?.job_title || ""}
                                    placeholder="Ej: Gerente de Ventas"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    defaultValue={profile?.phone || ""}
                                    placeholder="+57 300 123 4567"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
