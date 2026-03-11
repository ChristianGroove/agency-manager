'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function ConfirmContent() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const searchParams = useSearchParams()
    const router = useRouter()

    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as any
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Detect immediate errors in hash (like otp_expired)
    useEffect(() => {
        const hash = window.location.hash
        if (hash.includes('error=')) {
            setStatus('error')
            const params = new URLSearchParams(hash.replace('#', ''))
            const desc = params.get('error_description')
            const code = params.get('error_code')
            
            if (code === 'otp_expired') {
                setErrorMessage('El enlace ha expirado o ya fue utilizado. Por seguridad, los enlaces de acceso son de un solo uso.')
            } else {
                setErrorMessage(desc ? decodeURIComponent(desc).replace(/\+/g, ' ') : 'Error de autenticación')
            }
        }
    }, [])

    const handleVerify = async () => {
        setStatus('loading')
        
        // Case 1: Token Hash (OTP/Confirm)
        if (token_hash && type) {
            try {
                const { error } = await supabase.auth.verifyOtp({
                    type,
                    token_hash,
                })

                if (!error) {
                    setStatus('success')
                    setTimeout(() => router.push(next), 1500)
                } else {
                    throw error
                }
            } catch (err: any) {
                console.error('Verification error:', err)
                setStatus('error')
                setErrorMessage(err.message || 'Error al verificar el token')
            }
            return
        }

        // Case 2: PKCE Code Exchange
        if (code) {
            try {
                const { error } = await supabase.auth.exchangeCodeForSession(code)
                if (!error) {
                    setStatus('success')
                    setTimeout(() => router.push(next), 1500)
                } else {
                    throw error
                }
            } catch (err: any) {
                console.error('Code exchange error:', err)
                setStatus('error')
                setErrorMessage(err.message || 'Error al procesar el código de acceso')
            }
            return
        }

        // Case 3: Implicit Flow Tokens in Hash (#access_token=...)
        const hash = window.location.hash
        if (hash.includes('access_token=')) {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    setStatus('success')
                    setTimeout(() => router.push(next), 1500)
                    return
                }
            } catch (e) {
                console.error("Hash session detection error:", e)
            }
        }

        // No valid params
        if (!token_hash && !code) {
            setStatus('error')
            setErrorMessage('No se encontró un token de inicio de sesión. Por favor, asegúrate de hacer clic en el botón del correo oficial.')
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 font-sans">
            <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-xl">
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* IDLE STATE - THE SCANNER PROTECTION */}
                    {status === 'idle' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <CheckCircle2 className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900 font-display">Confirmar Acceso</h1>
                                <p className="text-gray-500 text-sm">
                                    Para proteger tu cuenta, requerimos que confirmes manualmente tu ingreso.
                                </p>
                            </div>
                            <Button 
                                onClick={handleVerify} 
                                className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02]"
                            >
                                Verificar y Entrar
                            </Button>
                        </>
                    )}

                    {status === 'loading' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">Procesando</h1>
                                <p className="text-gray-500">Verificando tu identidad con Supabase...</p>
                            </div>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">¡Bienvenido!</h1>
                                <p className="text-gray-500">Acceso concedido. Redirigiendo...</p>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">Fallo de Acceso</h1>
                                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 font-medium">
                                    {errorMessage}
                                </div>
                                <p className="text-gray-500 text-sm mt-4">
                                    Si el problema persiste, solicita un nuevo enlace de acceso.
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-3 pt-4">
                                <Button asChild className="w-full bg-primary h-11 font-medium">
                                    <Link href="/forgot-password">Solicitar nuevo Link</Link>
                                </Button>
                                <Button asChild variant="ghost" className="w-full text-gray-500 underline underline-offset-4">
                                    <Link href="/login">Ir al inicio de sesión</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function AuthConfirmPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-gray-300" />
            </div>
        }>
            <ConfirmContent />
        </Suspense>
    )
}
