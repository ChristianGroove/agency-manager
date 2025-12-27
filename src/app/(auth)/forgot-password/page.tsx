"use client"

import { useState } from "react"
import { resetPassword } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import { ParticlesBackground } from "@/components/ui/particles-background"
import Link from "next/link"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const result = await resetPassword(formData)

        if (result?.error) {
            setError(result.error)
            toast.error("Error al enviar solicitud", { description: result.error })
        } else {
            setSubmitted(true)
            toast.success("Enlace enviado", { description: "Revisa tu correo electrónico para restablecer tu contraseña." })
        }
        setIsLoading(false)
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
                        <CardTitle className="text-2xl font-bold tracking-tight">Recuperar acceso</CardTitle>
                        <CardDescription className="text-gray-400">
                            Te enviaremos un enlace para restablecer tu contraseña
                        </CardDescription>
                    </CardHeader>
                    {!submitted ? (
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        required
                                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-brand-pink/50 focus:ring-brand-pink/20 transition-all h-11 backdrop-blur-sm"
                                    />
                                </div>
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-medium text-center animate-in fade-in slide-in-from-top-2">
                                        {error}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="pt-4 pb-8 flex flex-col gap-4">
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-brand-pink to-brand-pink/80 hover:from-brand-pink/90 hover:to-brand-pink/70 text-white h-11 font-medium shadow-[0_0_20px_rgba(242,5,226,0.3)] hover:shadow-[0_0_30px_rgba(242,5,226,0.5)] transition-all hover:scale-[1.02] border border-white/10"
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
                                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                                    <ArrowLeft className="h-4 w-4" /> Volver al Login
                                </Link>
                            </CardFooter>
                        </form>
                    ) : (
                        <CardContent className="space-y-6 pt-4 pb-8">
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                                <p className="text-green-400 font-medium">¡Correo enviado!</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Si la cuenta existe, recibirás instrucciones en unos momentos.
                                </p>
                            </div>
                            <Button
                                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white h-11 transition-colors"
                                asChild
                            >
                                <Link href="/login">Volver al inicio de sesión</Link>
                            </Button>
                        </CardContent>
                    )}
                </Card>

                <p className="text-sm text-gray-500/80 font-medium">
                    &copy; 2026 Pixy Agency
                </p>
            </div>
        </ParticlesBackground>
    )
}
