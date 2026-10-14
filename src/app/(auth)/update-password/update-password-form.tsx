"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/modules/core/database/supabase"
import { updatePassword } from "@/modules/core/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { ParticlesBackground } from "@/components/ui/particles-background"
import { AnimatedPasswordToggle } from "@/components/ui/animated-password-toggle"
import { AnimatedBorderBeam } from "@/components/ui/animated-border-beam"

export function UpdatePasswordForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Handle Hash Recovery on Mount
    useEffect(() => {
        const handleRecovery = async () => {
            // 1. Detect Explicit Errors in URL (e.g. otp_expired)

            // 1. Detect Explicit Errors in URL (e.g. otp_expired)
            const params = new URLSearchParams(window.location.hash.substring(1)) // Remove #
            const errorDescription = params.get("error_description")
            const errorCode = params.get("error_code")

            if (errorCode || errorDescription) {
                console.error("Link Error:", errorCode, errorDescription)
                setError(
                    errorCode === "otp_expired"
                        ? "Este enlace ha expirado o ya fue utilizado. Por favor solicita uno nuevo."
                        : (errorDescription || "Enlace inválido") + plusDecoder(errorDescription)
                )
                return
            }

            // 2. Check/Recover Session
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                // Try to recover from Hash explicitly if no session yet
                const hash = window.location.hash
                if (hash && hash.includes("access_token")) {
                    console.log("Recovering session from hash mechanism...")

                    // MANUAL HYDRATION (Bypass PKCE check for legacy implicit links)
                    const params = new URLSearchParams(hash.substring(1)) // remove #
                    const access_token = params.get("access_token")
                    const refresh_token = params.get("refresh_token")

                    if (!access_token || !refresh_token) {
                        setError("Token incompleto en el enlace.")
                        return
                    }

                    const { error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token
                    })

                    if (error) {
                        console.error("Session Set Error:", error)
                        setError(error.message)
                    } else {
                        console.log("Session hydrated successfully from hash.")
                    }
                } else {
                    // No session, no token -> Invalid state
                }
            }
        }
        handleRecovery()
    }, [])

    // Helper to decode + to space if needed, though URLSearchParams handles much
    const plusDecoder = (str: string | null) => str ? str.replace(/\+/g, ' ') : ""

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const password = formData.get("password") as string
        const confirmPassword = formData.get("confirmPassword") as string

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden")
            setIsLoading(false)
            return
        }

        try {
            const result = await updatePassword(formData)
            if (!result.success) throw new Error(result.error)
            setMessage("Contraseña guardada. Continuando...")
            window.location.assign(result.redirectTo || '/dashboard')
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar la contraseña. Intenta de nuevo.')
            setIsLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0 z-0">
                <ParticlesBackground />
            </div>

            <div className="z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500 w-full max-w-sm px-4">
                <div className="mb-6">
                    <img
                        src="/branding/logo light.svg"
                        alt="Pixy"
                        className="h-11 w-auto object-contain drop-shadow-lg"
                    />
                </div>

                <Card className="w-full premium-glass-card text-white relative overflow-hidden bg-transparent">
                    <AnimatedBorderBeam className="rounded-[1.5rem]" />
                    <CardHeader className="space-y-1 text-center pb-6 pt-7 relative z-20">
                        <CardTitle className="text-xl font-bold tracking-tight">Nueva Contraseña</CardTitle>
                        <CardDescription className="text-gray-300">
                            Guarda una contraseña para ingresar con tu correo
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit} className="relative z-20">
                        <CardContent className="space-y-4 px-6 pb-7 pt-0">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-zinc-200 text-xs font-medium">Nueva Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        style={{ color: 'white' }}
                                        className="bg-white/[0.07] border-white/15 text-white placeholder:text-zinc-400 focus:border-white/35 focus:bg-white/[0.12] focus:ring-1 focus:ring-white/20 transition-all h-11 pr-11 rounded-xl"
                                    />
                                    <AnimatedPasswordToggle
                                        isVisible={showPassword}
                                        onToggle={() => setShowPassword(!showPassword)}
                                        theme="dark"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-zinc-200 text-xs font-medium">Confirmar Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        style={{ color: 'white' }}
                                        className="bg-white/[0.07] border-white/15 text-white placeholder:text-zinc-400 focus:border-white/35 focus:bg-white/[0.12] focus:ring-1 focus:ring-white/20 transition-all h-11 pr-11 rounded-xl"
                                    />
                                    <AnimatedPasswordToggle
                                        isVisible={showConfirmPassword}
                                        onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                                        theme="dark"
                                    />
                                </div>
                            </div>
                                {error && (
                                    <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-200 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                        {error}
                                    </div>
                                )}
                                {message && (
                                    <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-sm text-green-200 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                        {message}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-white text-zinc-950 hover:bg-zinc-100 font-semibold h-11 rounded-xl shadow-sm transition-all active:scale-[0.99] mt-2"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Actualizando...
                                        </>
                                    ) : (
                                        "Actualizar Contraseña"
                                    )}
                                </Button>
                            </CardContent>
                        </form>
                    </Card>

                <p className="text-xs text-white font-medium z-10 text-center select-none">
                    <span className="animate-text-shimmer-slow">Powered by Pixy</span>
                </p>
            </div>
        </div>
    )
}
