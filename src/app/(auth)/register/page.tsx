"use client"

import { useState } from "react"
import Link from "next/link"
import { signup } from "@/modules/core/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2 } from "lucide-react"

import { ParticlesBackground } from "@/components/ui/particles-background"
// import { BiometricButton } from "@/components/auth/biometric-button" // Removing per user request
import { useBranding } from "@/components/providers/branding-provider"

import { Turnstile } from "@marsidev/react-turnstile"

export default function RegisterPage() {
    const branding = useBranding()
    const primaryColor = branding?.colors?.primary || "#4f46e5"

    const [isLoading, setIsLoading] = useState(false)
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Form States
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    // Check if captcha is configured
    const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const isCaptchaRequired = Boolean(captchaSiteKey && captchaSiteKey.length > 0)
    const isCaptchaValid = !isCaptchaRequired || captchaToken !== null

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccessMessage(null)

        const formData = new FormData()
        formData.append('fullName', fullName)
        formData.append('email', email)
        formData.append('password', password)
        if (captchaToken) formData.append('captchaToken', captchaToken)

        try {
            const result = await signup(formData)

            if (result?.error) {
                setError(result.error)
                setIsLoading(false)
            } else if (result?.success && result?.message) {
                // Email confirmation case
                setSuccessMessage(result.message)
                setIsLoading(false)
            }
            // If direct redirect happens, execution stops here anyway due to browser nav
        } catch (e: any) {
            setError(e.message || "Error inesperado")
            setIsLoading(false)
        }
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

                <Card className="w-full bg-white/70 backdrop-blur-xl border-white/40 text-gray-900 shadow-2xl ring-1 ring-black/5">
                    <CardHeader className="space-y-1 text-center pb-8">
                        <CardTitle className="text-xl font-bold tracking-tight text-gray-900">Crear Cuenta</CardTitle>
                        <CardDescription className="text-gray-500">
                            Únete y crea tu organización en segundos
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {successMessage ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in fade-in">
                                <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center ring-1 ring-green-600/20">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">¡Cuenta creada!</h3>
                                <p className="text-gray-500 text-sm">{successMessage}</p>
                                <Button variant="outline" className="mt-4 border-gray-200 text-gray-900 hover:bg-gray-50 mb-4" asChild>
                                    <Link href="/login">Ir a Iniciar Sesión</Link>
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-gray-700">Nombre Completo</Label>
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Juan Pérez"
                                        required
                                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500 transition-all h-11 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-700">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="nombre@empresa.com"
                                        required
                                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500 transition-all h-11 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-white border-gray-200 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 transition-all h-11 shadow-sm"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 font-medium text-center animate-in fade-in slide-in-from-top-2">
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
                                    className="w-full text-white h-11 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-indigo-600 hover:bg-indigo-700"
                                    style={{
                                        backgroundColor: primaryColor,
                                        // Slight darken for hover could be handled via CSS var manipulation or just kept simple
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

                                <div className="text-center text-sm">
                                    <span className="text-gray-500">¿Ya tienes cuenta? </span>
                                    <Link href="/login" className="font-medium hover:underline hover:opacity-80 transition-colors" style={{ color: primaryColor }}>
                                        Iniciar Sesión
                                    </Link>
                                </div>
                            </form>
                        )}

                    </CardContent>
                </Card>

                <p className="text-xs text-gray-500 font-medium z-10">
                    Powered by Pixy
                </p>
            </div>
        </div>
    )
}
