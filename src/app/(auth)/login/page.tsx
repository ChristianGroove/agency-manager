"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { login, sendMagicLink } from "@/modules/core/auth/actions"
import { getPublicBranding } from "@/modules/core/settings/actions/public"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Wand2, KeyRound, CheckCircle2 } from "lucide-react"

import { ParticlesBackground } from "@/components/ui/particles-background"
import { BiometricButton } from "@/modules/core/auth/components/biometric-button"


export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const orgSlug = searchParams.get('org')

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [branding, setBranding] = useState<any>(null)
    const [email, setEmail] = useState("")
    const [loginMethod, setLoginMethod] = useState<'password' | 'magic_link'>('password')
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Fetch branding on mount
    // Fetch branding on mount
    useEffect(() => {
        if (orgSlug) {
            getPublicBranding(orgSlug).then((b) => {
                console.log("Branding loaded (Org):", b)
                setBranding(b)
            }).catch((e) => console.error(e))
        }
    }, [orgSlug])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)

        let result;
        if (loginMethod === 'magic_link') {
            result = await sendMagicLink(formData)
            if (result?.success) {
                setSuccessMessage(result.message || "Enlace enviado.")
                setIsLoading(false)
                return
            }
        } else {
            result = await login(formData)
        }

        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        }
    }

    // Dynamic Styles
    const bgImage = branding?.portal_login_background_url ? `url('${branding.portal_login_background_url}')` : undefined
    const bgColor = branding?.portal_login_background_color || undefined
    const logoUrl = branding?.portal_logo_url || "/branding/logo light.svg"
    const title = branding ? `Iniciar Sesión en ${branding.name}` : "¡Bienvenido de nuevo!"

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
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
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

                <Card className="w-full bg-black/20 backdrop-blur-xl border-white/10 text-white shadow-2xl ring-1 ring-white/10">
                    <CardHeader className="space-y-1 text-center pb-8">
                        <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>
                        <CardDescription className="text-gray-300">
                            Ingresa tus credenciales para acceder
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">


                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-200">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nombre@empresa.com"
                                    required
                                    style={{ color: 'white' }}
                                    className="bg-white/10 border-white/10 text-white placeholder:text-gray-400 focus:border-white/30 focus:ring-white/20 transition-all h-11"
                                />
                            </div>

                            {/* Password Field - Only if Login Method is Password */}
                            {loginMethod === 'password' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-gray-200">Contraseña</Label>
                                        <Link
                                            href="/forgot-password"
                                            className="text-xs text-white/70 hover:text-white transition-colors"
                                            tabIndex={-1}
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        style={{ color: 'white' }}
                                        className="bg-white/10 border-white/10 text-white focus:border-white/30 focus:ring-white/20 transition-all h-11"
                                    />
                                </div>
                            )}

                            {/* Success State */}
                            {successMessage && (
                                <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-center animate-in fade-in zoom-in duration-300">
                                    <div className="flex justify-center mb-2">
                                        <CheckCircle2 className="h-6 w-6 text-green-400" />
                                    </div>
                                    <h3 className="font-semibold text-sm mb-1">¡Enlace Enviado!</h3>
                                    <p className="text-xs opacity-90">{successMessage}</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-sm text-red-200 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-white text-black hover:bg-gray-200 h-11 font-medium transition-all mt-2"
                                disabled={isLoading || (successMessage !== null)}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {loginMethod === 'magic_link' ? 'Enviando...' : 'Verificando...'}
                                    </>
                                ) : (
                                    loginMethod === 'magic_link' ? 'Enviar Enlace de Acceso' : "Iniciar Sesión"
                                )}
                            </Button>
                        </form>

                        <div className="flex justify-center pt-2">
                            <Button
                                variant="link"
                                type="button"
                                onClick={() => {
                                    setLoginMethod(prev => prev === 'password' ? 'magic_link' : 'password')
                                    setError(null)
                                    setSuccessMessage(null)
                                }}
                                className="text-white/60 hover:text-white text-xs"
                            >
                                {loginMethod === 'password' ? (
                                    <><Wand2 className="mr-2 h-3 w-3" /> Usar Magic Link (Sin Contraseña)</>
                                ) : (
                                    <><KeyRound className="mr-2 h-3 w-3" /> Usar Contraseña</>
                                )}
                            </Button>
                        </div>

                        <div className="flex justify-center pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <BiometricButton iconOnly email={email} />
                        </div>

                        <div className="text-center text-sm pt-2">
                            <span className="text-gray-400">¿No tienes cuenta? </span>
                            <Link href="/register" className="text-white font-medium hover:underline">
                                Regístrate
                            </Link>
                        </div>

                    </CardContent>
                </Card>

                <p className="text-xs text-white/50 font-medium z-10">
                    Powered by Pixy
                </p>
            </div>
        </div >
    )
}
