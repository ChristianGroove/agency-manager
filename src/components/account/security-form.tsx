"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { createBrowserClient } from "@supabase/ssr"
import { Loader2, Lock } from "lucide-react"

export function SecurityForm() {
    const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }
        if (password !== confirm) {
            toast.error("Las contraseñas no coinciden")
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: password })
            if (error) throw error

            toast.success("Contraseña actualizada exitosamente")
            setPassword("")
            setConfirm("")
        } catch (err: any) {
            toast.error(err.message || "Error al actualizar contraseña")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-orange-100 p-2 rounded-full">
                        <Lock className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-xl">Seguridad de la Cuenta</CardTitle>
                </div>
                <CardDescription>
                    Actualiza tu contraseña periódicamente para mantener tu cuenta segura.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                    <div className="grid gap-2">
                        <Label htmlFor="new-password">Nueva Contraseña</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            placeholder="Repita la contraseña"
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Actualizar Contraseña
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
