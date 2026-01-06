"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { createBrowserClient } from "@supabase/ssr"
import { updatePassword } from "@/modules/core/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { ParticlesBackground } from "@/components/ui/particles-background"
// ... imports ...

export function UpdatePasswordForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

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

        // Use Client SDK for Update (Works with the recovered session above)
        // Singleton 'supabase' already has the session from setSession above
        let { error } = await supabase.auth.updateUser({
            password: password
        })

        // RETRY MECHANISM: If Singleton fails (e.g. Invalid API Key), try FRESH Client
        if (error && error.message.includes("Invalid API Key")) {
            console.warn("Singleton failed with Invalid API Key. Retrying with Fresh Client...")
            const freshSupabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )
            // Re-hydrate session on fresh client
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                await freshSupabase.auth.setSession({
                    access_token: session.access_token,
                    refresh_token: session.refresh_token
                })
            }

            const retryResult = await freshSupabase.auth.updateUser({
                password: password
            })
            error = retryResult.error
        }

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            setMessage("Contraseña actualizada correctamente. Redirigiendo...")
            setTimeout(() => {
                window.location.href = "/login" // Force hard reload to login
            }, 2000)
        }
    }

    return (
        <ParticlesBackground>
            <div className="z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                <div className="mb-6">
                    <img
                        src="/branding/logo light.svg"
                        alt="Pixy"
                        className="h-16 w-auto"
                    />
                </div>

                <Card className="w-[380px] bg-black/10 backdrop-blur-md border-white/10 text-white shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/10 hover:ring-white/20 transition-all duration-500">
                    <CardHeader className="space-y-1 text-center pb-8">
                        <CardTitle className="text-2xl font-bold tracking-tight">Nueva Contraseña</CardTitle>
                        <CardDescription className="text-gray-400">
                            Ingresa tu nueva contraseña para recuperar el acceso
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-gray-300">Nueva Contraseña</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    className="bg-white/5 border-white/10 text-white focus:border-brand-pink/50 focus:ring-brand-pink/20 transition-all h-11 backdrop-blur-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-gray-300">Confirmar Contraseña</Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    className="bg-white/5 border-white/10 text-white focus:border-brand-pink/50 focus:ring-brand-pink/20 transition-all h-11 backdrop-blur-sm"
                                />
                            </div>
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-4 pb-8">
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-brand-pink to-brand-pink/80 hover:from-brand-pink/90 hover:to-brand-pink/70 text-white h-11 font-medium shadow-[0_0_20px_rgba(242,5,226,0.3)] hover:shadow-[0_0_30px_rgba(242,5,226,0.5)] transition-all hover:scale-[1.02] border border-white/10"
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
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-sm text-gray-500/80 font-medium">
                    &copy; 2026 Pixy Agency
                </p>

                {/* VISUAL DEBUGGER - REMOVE AFTER FIX */}
                <div className="mt-8 p-4 bg-black/50 rounded text-xs text-gray-500 font-mono w-full max-w-md break-all">
                    <p>DEBUG INFO:</p>
                    <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
                    <p>KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + "..." : "UNDEFINED"}</p>
                    <p>More: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length} chars</p>
                </div>
            </div>
        </ParticlesBackground>
    )
}
