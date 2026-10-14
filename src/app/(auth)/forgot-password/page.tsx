"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { resetPasswordRequest } from "@/modules/core/auth/actions"
import { getPublicBranding } from "@/modules/core/settings/actions/public"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import { ParticlesBackground } from "@/components/ui/particles-background"
import { toast } from "sonner"
import { AnimatedBorderBeam } from "@/components/ui/animated-border-beam"

export default function ForgotPasswordPage() {
    const searchParams = useSearchParams()
    const orgSlug = searchParams.get('org')

    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [branding, setBranding] = useState<any>(null)

    useEffect(() => {
        if (orgSlug) {
            getPublicBranding(orgSlug).then((b) => {
                setBranding(b)
            }).catch((e) => console.error(e))
        }
    }, [orgSlug])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const result = await resetPasswordRequest(formData)

        if (result?.error) {
            setError(result.error)
            toast.error("Error al enviar solicitud", { description: result.error })
        } else {
            setSubmitted(true)
            toast.success("Enlace enviado", { description: "Revisa tu correo electrónico para restablecer tu contraseña." })
        }
        setIsLoading(false)
    }

    // Dynamic Styles matching LoginPage
    const bgImage = branding?.portal_login_background_url ? `url('${branding.portal_login_background_url}')` : undefined
    const bgColor = branding?.portal_login_background_color || undefined
    const logoUrl = branding?.portal_logo_url || "/branding/logo light.svg"
    const loginHref = orgSlug ? `/login?org=${orgSlug}` : "/login"

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
            {/* Dynamic Background */}
            {branding ? (
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700"
                    style={{
                        backgroundImage: bgImage,
                        backgroundColor: bgColor || '#111827'
                    }}
                >
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                </div>
            ) : (
                <div className="absolute inset-0 z-0">
                    <ParticlesBackground />
                </div>
            )}

            <div className="z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500 w-full max-w-sm px-4">
                <div className="mb-6">
                    <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-11 w-auto object-contain drop-shadow-lg"
                    />
                </div>

                <Card className="w-full premium-glass-card text-white relative overflow-hidden bg-transparent">
                    <AnimatedBorderBeam className="rounded-[1.5rem]" />
                    <CardHeader className="space-y-1 text-center pb-6 pt-7 relative z-20">
                        <CardTitle className="text-xl font-bold tracking-tight">Recuperar acceso</CardTitle>
                        <CardDescription className="text-gray-300">
                            Te enviaremos un enlace para restablecer tu contraseña
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-6 pb-7 pt-0 relative z-20">
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-zinc-200 text-xs font-medium">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="nombre@empresa.com"
                                        required
                                        style={{ color: 'white' }}
                                        className="bg-white/[0.07] border-white/15 text-white placeholder:text-zinc-400 focus:border-white/35 focus:bg-white/[0.12] focus:ring-1 focus:ring-white/20 transition-all h-11 rounded-xl"
                                    />
                                </div>

                                    {error && (
                                        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-sm text-red-200 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                            {error}
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
                                                Enviando...
                                            </>
                                        ) : (
                                            "Enviar enlace de recuperación"
                                        )}
                                    </Button>

                                    <div className="flex justify-center pt-2">
                                        <Link
                                            href={loginHref}
                                            className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2"
                                        >
                                            <ArrowLeft className="h-4 w-4" /> Volver al Login
                                        </Link>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-200 text-center animate-in fade-in zoom-in duration-300 space-y-2">
                                        <div className="flex justify-center mb-1">
                                            <CheckCircle2 className="h-6 w-6 text-green-400" />
                                        </div>
                                        <h3 className="font-semibold text-sm">¡Enlace Enviado!</h3>
                                        <p className="text-xs opacity-90">
                                            Revisa tu correo electrónico para restablecer tu contraseña.
                                        </p>
                                    </div>

                                    <Button
                                        className="w-full bg-white text-zinc-950 hover:bg-zinc-100 font-semibold h-11 rounded-xl shadow-sm transition-all active:scale-[0.99] mt-2"
                                        asChild
                                    >
                                        <Link href={loginHref}>Volver al inicio de sesión</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <p className="text-xs text-white font-medium z-10 text-center select-none">
                        <span className="animate-text-shimmer-slow">Powered by Pixy</span>
                    </p>
            </div>
        </div>
    )
}
