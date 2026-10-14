"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { login, sendMagicLink } from "@/modules/core/auth/actions"
import { getPublicBranding } from "@/modules/core/settings/actions/public"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2 } from "lucide-react"
import { AnimatedPasswordToggle } from "@/components/ui/animated-password-toggle"
import { ParticlesBackground } from "@/components/ui/particles-background"
import { BiometricButton } from "@/modules/core/auth/components/biometric-button"
import { AnimatedBorderBeam } from "@/components/ui/animated-border-beam"
import { AuthThemeToggle } from "@/components/ui/auth-theme-toggle"
import { cn } from "@/modules/infrastructure/utils/utils"

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const orgSlug = searchParams.get('org')

    const [isLoading, setIsLoading] = useState(false)
    const [isHydrated, setIsHydrated] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [branding, setBranding] = useState<any>(null)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
    const [loginMethod, setLoginMethod] = useState<'password' | 'magic_link'>('password')
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        setIsHydrated(true)
        try {
            const saved = localStorage.getItem("pixy_remember_email")
            if (saved) {
                setEmail(saved)
                setRememberMe(true)
            }
        } catch {
            // Ignore if localStorage unavailable
        }
    }, [])

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

        try {
            if (rememberMe && email) {
                localStorage.setItem("pixy_remember_email", email.trim())
            } else {
                localStorage.removeItem("pixy_remember_email")
            }
        } catch {
            // Ignore
        }

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

    // Dynamic Styles & Form Ready State
    const isFormFilled = email.trim().length > 0 && (loginMethod === 'magic_link' || password.trim().length > 0)
    const bgImage = branding?.portal_login_background_url ? `url('${branding.portal_login_background_url}')` : undefined
    const bgColor = branding?.portal_login_background_color || undefined
    const logoUrl = branding?.portal_logo_url || "/branding/logo light.svg"
    const title = branding ? `Iniciar Sesión en ${branding.name}` : "¡Bienvenido de nuevo!"

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center p-4">
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

            <div className="z-10 flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-500 w-full max-w-sm px-4">
                <div className="mb-1">
                    {branding?.portal_logo_url ? (
                        <img
                            src={branding.portal_logo_url}
                            alt="Logo"
                            className="h-11 w-auto object-contain drop-shadow-lg"
                        />
                    ) : (
                        <>
                            <img
                                src="/branding/logo dark.svg"
                                alt="Pixy Logo"
                                className="h-11 w-auto object-contain drop-shadow-md dark:hidden"
                            />
                            <img
                                src="/branding/logo light.svg"
                                alt="Pixy Logo"
                                className="h-11 w-auto object-contain drop-shadow-lg hidden dark:block"
                            />
                        </>
                    )}
                </div>

                <Card className="w-full premium-glass-card text-zinc-900 dark:text-white relative overflow-hidden bg-transparent">
                    {/* Animated Border Stroke Resplandor Beam */}
                    <AnimatedBorderBeam className="rounded-[1.5rem]" />

                    <CardHeader className="space-y-1 text-center pb-6 pt-7 relative z-20">
                        <CardTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</CardTitle>
                        <CardDescription className="text-zinc-500 dark:text-gray-300 text-xs">
                            Ingresa tus credenciales para acceder
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-6 pb-7 pt-0 relative z-20">
                        <form method="post" onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-200 text-xs font-medium">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nombre@empresa.com"
                                    required
                                    className="bg-black/[0.04] dark:bg-white/[0.07] border-black/10 dark:border-white/15 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-pink/50 dark:focus:border-white/35 focus:bg-white/70 dark:focus:bg-white/[0.12] focus:ring-1 focus:ring-brand-pink/30 dark:focus:ring-white/20 transition-all h-11 rounded-xl"
                                />
                            </div>

                            {/* Password Field - Only if Login Method is Password */}
                            {loginMethod === 'password' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-200 text-xs font-medium">Contraseña</Label>
                                        <Link
                                            href={orgSlug ? `/forgot-password?org=${orgSlug}` : "/forgot-password"}
                                            className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-white/70 dark:hover:text-white transition-colors"
                                            tabIndex={-1}
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="bg-black/[0.04] dark:bg-white/[0.07] border-black/10 dark:border-white/15 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-brand-pink/50 dark:focus:border-white/35 focus:bg-white/70 dark:focus:bg-white/[0.12] focus:ring-1 focus:ring-brand-pink/30 dark:focus:ring-white/20 transition-all h-11 pr-11 rounded-xl"
                                        />
                                        <AnimatedPasswordToggle
                                            isVisible={showPassword}
                                            onToggle={() => setShowPassword(!showPassword)}
                                            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Recordarme Checkbox */}
                            <div className="flex items-center space-x-2 pt-0.5">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => {
                                        const val = !!checked
                                        setRememberMe(val)
                                        if (!val) {
                                            try {
                                                localStorage.removeItem("pixy_remember_email")
                                            } catch {}
                                        }
                                    }}
                                    className="border-zinc-400 dark:border-white/30 data-[state=checked]:bg-brand-pink data-[state=checked]:border-brand-pink data-[state=checked]:text-white cursor-pointer"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white font-normal cursor-pointer select-none transition-colors"
                                >
                                    Recordarme
                                </Label>
                            </div>

                            {/* Success State */}
                            {successMessage && (
                                <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-700 dark:text-green-200 text-center animate-in fade-in zoom-in duration-300">
                                    <div className="flex justify-center mb-2">
                                        <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400" />
                                    </div>
                                    <h3 className="font-semibold text-sm mb-1">¡Enlace Enviado!</h3>
                                    <p className="text-xs opacity-90">{successMessage}</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-600 dark:text-red-200 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className={cn(
                                    "w-full font-semibold h-11 rounded-xl shadow-sm transition-all duration-300 active:scale-[0.99] mt-2 cursor-pointer",
                                    isFormFilled
                                        ? "bg-brand-pink hover:bg-brand-pink/90 text-white"
                                        : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                                )}
                                style={
                                    isFormFilled && branding?.primary_color
                                        ? {
                                              backgroundColor: branding.primary_color,
                                          }
                                        : undefined
                                }
                                disabled={isLoading || !isHydrated}
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
                        </form>

                        <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <BiometricButton iconOnly email={email} />
                        </div>

                        <div className="text-center text-sm">
                            <span className="text-zinc-500 dark:text-gray-400">¿No tienes cuenta? </span>
                            <a 
                                href="https://pixy.com.co/contact.html" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-zinc-900 dark:text-white font-medium hover:underline"
                            >
                                Solicitar Demo
                            </a>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer branding and theme toggle */}
                <div className="flex flex-col items-center gap-2 z-10 select-none">
                    <p className="text-xs text-zinc-600 dark:text-white font-medium text-center">
                        <span className="animate-text-shimmer-slow">Powered by Pixy</span>
                    </p>
                    <AuthThemeToggle />
                </div>
            </div>
        </div>
    )
}
