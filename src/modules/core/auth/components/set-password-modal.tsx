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
import { LockKeyhole, ShieldCheck, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export function SetPasswordModal() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        if (searchParams.get("promptPassword") === "true") {
            setOpen(true)
        }
    }, [searchParams])

    const handleClose = (openState: boolean) => {
        // Prevent closing if we want to FORCE. 
        // But user might already have password? We don't know easily. 
        // Let's allow simple close but maybe warn? 
        // The user asked to "avoid asking for magic links again", implying forcing is good.
        // I will disable closing via outside click/esc.
        // Only close via 'Skip' button or Success.
        if (!openState) {
            // Do nothing, enforce explicit action
            return
        }
        setOpen(openState)
    }

    const handleSkip = () => {
        // Remove query param
        const params = new URLSearchParams(searchParams)
        params.delete("promptPassword")
        router.replace(`${pathname}?${params.toString()}`)
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

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: password })
            if (error) throw error

            toast.success("¡Contraseña establecida correctamente!")
            handleSkip() // Close and clean URL
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
                    <DialogTitle className="text-center text-xl">Protege tu Cuenta</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Has iniciado sesión con un enlace temporal.
                        <br />
                        Configura una contraseña segura para evitar depender del email la próxima vez.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
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
                            {loading ? "Guardando..." : "Establecer Contraseña"}
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
