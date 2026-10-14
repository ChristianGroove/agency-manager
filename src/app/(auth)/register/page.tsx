"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { signup } from "@/modules/core/auth/actions"
import { validateInviteCode } from "@/modules/core/iam/actions/invitation-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2 } from "lucide-react"
import { AnimatedPasswordToggle } from "@/components/ui/animated-password-toggle"

import { ParticlesBackground } from "@/components/ui/particles-background"
import { useBranding } from "@/components/providers/branding-provider"

import { Turnstile } from "@marsidev/react-turnstile"

export default function RegisterPage() {
    const searchParams = useSearchParams()
    const inviteParam = searchParams.get('invite')
    const branding = useBranding()
    const primaryColor = branding?.colors?.primary || "#4f46e5"

    const [isValidatingInvite, setIsValidatingInvite] = useState(true)
    const [inviteCode, setInviteCode] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Form States
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    const [devConfirmLink, setDevConfirmLink] = useState<string | null>(null)

    // Validate invite parameter on mount. If missing or invalid, redirect immediately to contact page.
    useEffect(() => {
        let isMounted = true
        async function checkInvite() {
            if (!inviteParam) {
                window.location.href = 'https://pixy.com.co/contact.html'
                return
            }
            const res = await validateInviteCode(inviteParam)
            if (!isMounted) return

            if (res.isValid && res.invitation) {
                setInviteCode(res.invitation.code)
                if (res.invitation.recipient_email) {
                    setEmail(res.invitation.recipient_email)
                }
                setIsValidatingInvite(false)
            } else {
                window.location.href = 'https://pixy.com.co/contact.html'
            }
        }
        checkInvite()
        return () => { isMounted = false }
    }, [inviteParam])

    // Check if captcha is configured
    const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const isCaptchaRequired = Boolean(captchaSiteKey && captchaSiteKey.length > 0)
    const isCaptchaValid = !isCaptchaRequired || captchaToken !== null

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!inviteCode) {
            setError("Código de invitación requerido")
            return
        }

        setIsLoading(true)
        setError(null)
        setSuccessMessage(null)
        setDevConfirmLink(null)

        const formData = new FormData()
        formData.append('fullName', fullName)
        formData.append('email', email)
        formData.append('password', password)
        formData.append('inviteCode', inviteCode)
        if (captchaToken) formData.append('captchaToken', captchaToken)

        try {
            const result = await signup(formData)

            if (result?.error) {
                setError(result.error)
                setIsLoading(false)
            } else if (result?.success && result?.message) {
                setSuccessMessage(result.message)
                if (result.devConfirmLink) {
                    setDevConfirmLink(result.devConfirmLink)
                }
                setIsLoading(false)
            }
        } catch (e: any) {
            setError(e.message || "Error inesperado")
            setIsLoading(false)
        }
    }

    if (isValidatingInvite) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0 z-0">
                <ParticlesBackground theme="light" />
            </div>

            <div className="z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500 w-full max-w-sm px-4">
                <div className="mb-6 flex justify-center">
                    {branding?.logos?.main_light || branding?.logos?.main ? (
                        <img
                            src={branding.logos.main_light || branding.logos.main!}
                            alt={branding?.name || "Logo"}
                            className="h-11 w-auto object-contain drop-shadow-lg"
                        />
                    ) : (
                        <img
                            src="/branding/logo.svg"
                            alt="Logo"
                            className="h-11 w-auto object-contain drop-shadow-lg"
                        />
                    )}
                </div>

                <Card className="w-full premium-glass-card-light text-gray-900">
                        <CardHeader className="space-y-1 text-center pb-6 pt-7">
                            <CardTitle className="text-xl font-bold tracking-tight text-gray-900">Crear Cuenta</CardTitle>
                            <CardDescription className="text-gray-500">
                                Únete y crea tu organización en segundos
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 px-6 pb-7 pt-0">

                            {successMessage ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-in fade-in">
                                    <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center ring-1 ring-green-600/20">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">¡Cuenta creada!</h3>
                                    <p className="text-gray-600 text-xs">{successMessage}</p>

                                    {devConfirmLink ? (
                                        <div className="w-full pt-2 space-y-2">
                                            <Button
                                                className="w-full text-white font-bold bg-emerald-600 hover:bg-emerald-700 h-11 rounded-xl shadow-md cursor-pointer text-xs"
                                                asChild
                                            >
                                                <a href={devConfirmLink}>
                                                    ⚡ Activar Cuenta e Iniciar Onboarding
                                                </a>
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            className="mt-4 mb-4 text-white"
                                            style={{ backgroundColor: primaryColor }}
                                            asChild
                                        >
                                            <Link href="/login">Ir a Iniciar Sesión</Link>
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName" className="text-gray-700 text-xs font-medium">Nombre Completo</Label>
                                        <Input
                                            id="fullName"
                                            name="fullName"
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Juan Pérez"
                                            required
                                            style={{ color: '#1f2937' }}
                                            className="bg-white/80 border-gray-200/80 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all h-11 rounded-xl shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-gray-700 text-xs font-medium">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="nombre@empresa.com"
                                            required
                                            style={{ color: '#1f2937' }}
                                            className="bg-white/80 border-gray-200/80 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all h-11 rounded-xl shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-gray-700 text-xs font-medium">Contraseña</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                minLength={6}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                style={{ color: '#1f2937' }}
                                                className="bg-white/80 border-gray-200/80 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all h-11 rounded-xl shadow-sm pr-11"
                                            />
                                            <AnimatedPasswordToggle
                                                isVisible={showPassword}
                                                onToggle={() => setShowPassword(!showPassword)}
                                                theme="light"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                            {error}
                                        </div>
                                    )}

                                    {isCaptchaRequired && (
                                        <div className="space-y-2 flex justify-center">
                                            <Turnstile
                                                siteKey={captchaSiteKey!}
                                                onSuccess={(token) => setCaptchaToken(token)}
                                                onExpire={() => setCaptchaToken(null)}
                                                onError={() => setCaptchaToken(null)}
                                                options={{
                                                    theme: 'light',
                                                    size: 'normal',
                                                }}
                                            />
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full text-white h-11 font-semibold transition-all shadow-md hover:shadow-lg rounded-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-indigo-600 hover:bg-indigo-700 mt-2"
                                        style={{
                                            backgroundColor: primaryColor,
                                        }}
                                        disabled={isLoading || !isCaptchaValid}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Registrando...
                                            </>
                                        ) : (
                                            "Registrarse"
                                        )}
                                    </Button>

                                    <div className="text-center text-sm pt-1">
                                        <span className="text-gray-500">¿Ya tienes cuenta? </span>
                                        <Link href="/login" className="font-medium hover:underline hover:opacity-80 transition-colors" style={{ color: primaryColor }}>
                                            Iniciar Sesión
                                        </Link>
                                    </div>
                                </form>
                            )}

                        </CardContent>
                    </Card>

                    <p className="text-xs text-gray-500 font-medium z-10 text-center select-none">
                        <span className="animate-text-shimmer-slow">Powered by Pixy</span>
                    </p>
            </div>
        </div>
    )
}
