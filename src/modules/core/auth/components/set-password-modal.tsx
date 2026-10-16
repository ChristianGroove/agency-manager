"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Eye, EyeOff, User } from "lucide-react"
import { toast } from "sonner"
import { syncCurrentUserFullName } from "@/modules/core/settings/actions/team"

export function SetPasswordModal() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [fullName, setFullName] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        if (searchParams.get("promptPassword") === "true") {
            setOpen(true)
            supabase.auth.getUser().then(({ data: { user } }) => {
                const metaName = user?.user_metadata?.full_name
                if (metaName && typeof metaName === "string" && metaName.toLowerCase() !== "unknown") {
                    setFullName(metaName)
                }
            })
        }
    }, [searchParams])

    const handleClose = (openState: boolean) => {
        if (!openState) {
            return
        }
        setOpen(openState)
    }

    const handleSkip = () => {
        const params = new URLSearchParams(searchParams)
        params.delete("promptPassword")
        const queryString = params.toString()
        router.replace(queryString ? `${pathname}?${queryString}` : pathname)
        setOpen(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden")
            return
        }

        const cleanName = fullName.trim()

        setLoading(true)
        try {
            const { data: updateData, error } = await supabase.auth.updateUser({
                password: password,
                data: {
                    password_configured: true,
                    ...(cleanName ? { full_name: cleanName } : {})
                }
            })
            if (error) throw error

            const user = updateData?.user
            const effectiveName = cleanName || user?.user_metadata?.full_name
            if (user?.id && effectiveName && effectiveName.toLowerCase() !== "unknown") {
                // Update client-side tables if RLS permits, plus server-side admin sync for organization_members
                await Promise.allSettled([
                    supabase
                        .from("profiles")
                        .update({ full_name: effectiveName, updated_at: new Date().toISOString() })
                        .eq("id", user.id),
                    supabase
                        .from("organization_members")
                        .update({ full_name: effectiveName })
                        .eq("user_id", user.id),
                    syncCurrentUserFullName(effectiveName)
                ])
            } else {
                await syncCurrentUserFullName()
            }

            toast.success("¡Cuenta y contraseña configuradas correctamente!")
            handleSkip()
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar contraseña")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4 w-fit">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl">Completa tu Cuenta</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Has iniciado sesión con un enlace de invitación.
                        <br />
                        Confirma tu nombre y configura una contraseña segura para futuros ingresos.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="fullName">Tu Nombre Completo</Label>
                        <div className="relative">
                            <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                            <Input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="pl-9"
                                placeholder="Ej: Ana García"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Nueva Contraseña</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="pr-10"
                                placeholder="********"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirm">Confirmar Contraseña</Label>
                        <Input
                            id="confirm"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="********"
                        />
                    </div>

                    <DialogFooter className="flex-col gap-2 sm:gap-0 mt-4">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Guardando..." : "Guardar y Continuar"}
                        </Button>
                        <div className="flex justify-center mt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-muted-foreground text-xs h-auto py-1"
                                onClick={handleSkip}
                            >
                                Omitir por ahora
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
