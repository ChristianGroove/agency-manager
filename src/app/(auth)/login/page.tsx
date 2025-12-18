"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
        // If success, the server action redirects, so we don't need to do anything here.
        // But since we are preventing default, the redirect might not happen automatically if we don't handle it?
        // No, `redirect` in server action throws an error that Next.js catches to redirect.
        // However, when called from a client component event handler, we might need to handle it.
        // Actually, `redirect` works in server actions called from client components too.
    }

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Iniciar Sesión</CardTitle>
                <CardDescription>
                    Ingresa tus credenciales para acceder al panel.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="admin@agencia.com"
                                required
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                            />
                        </div>
                        {error && (
                            <div className="text-sm text-red-500 font-medium">
                                {error}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ingresar
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
