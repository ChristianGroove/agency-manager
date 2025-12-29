"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { login } from "@/modules/core/auth/actions"
import { getPublicBranding } from "@/modules/core/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

import { ParticlesBackground } from "@/components/ui/particles-background"


export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const orgSlug = searchParams.get('org')

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [branding, setBranding] = useState<any>(null)

    // Fetch branding on mount
    useEffect(() => {
        if (orgSlug) {
            getPublicBranding(orgSlug).then(setBranding).catch(() => null)
        }
    }, [orgSlug])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const result = await login(formData)

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
                        className="h-16 w-auto object-contain drop-shadow-lg"
                    />
                </div>

                <Card className="w-full bg-black/20 backdrop-blur-xl border-white/10 text-white shadow-2xl ring-1 ring-white/10">
                    <CardHeader className="space-y-1 text-center pb-8">
                        <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>
                        <CardDescription className="text-gray-300">
                            Ingresa tus credenciales para acceder
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-200">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="nombre@empresa.com"
                                    required
                                    className="bg-white/10 border-white/10 text-white placeholder:text-gray-400 focus:border-white/30 focus:ring-white/20 transition-all h-11"
                                />
                            </div>
                            <div className="space-y-2">
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
                                    className="bg-white/10 border-white/10 text-white focus:border-white/30 focus:ring-white/20 transition-all h-11"
                                />
                            </div>
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-sm text-red-200 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-4 pb-8">
                            <Button
                                type="submit"
                                className="w-full bg-white text-black hover:bg-gray-200 h-11 font-medium transition-all"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    "Iniciar Sesión"
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-sm text-white/50 font-medium z-10">
                    &copy; 2026 {branding ? branding.name : 'Pixy Agency'}
                </p>
            </div>
        </div>
    )
}
