"use client"

import { useState } from "react"
import { updatePassword } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { ParticlesBackground } from "@/components/ui/particles-background"

export function UpdatePasswordForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const result = await updatePassword(formData)

        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
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
            </div>
        </ParticlesBackground>
    )
}
