'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function ConfirmContent() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
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

    useEffect(() => {
        const verify = async () => {
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

            // No valid params
            if (!token_hash && !code) {
                setStatus('error')
                setErrorMessage('No se encontró un token válido en el enlace.')
            }
        }

        verify()
    }, [token_hash, type, code, next, supabase, router])

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4">
            <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
                <div className="flex flex-col items-center text-center space-y-6">
                    {status === 'loading' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">Validando Acceso</h1>
                                <p className="text-gray-500">Estamos verificando tu identidad de forma segura...</p>
                            </div>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">¡Acceso Verificado!</h1>
                                <p className="text-gray-500">Te estamos redirigiendo a tu panel...</p>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">No se pudo acceder</h1>
                                <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 italic">
                                    "{errorMessage}"
                                </p>
                                <p className="text-gray-500 text-sm mt-4">
                                    El enlace puede haber expirado o ya ha sido utilizado. Intenta solicitar uno nuevo.
                                </p>
                            </div>
                            <div className="flex w-full gap-3 pt-4">
                                <Button asChild variant="outline" className="flex-1">
                                    <Link href="/login">Regresar al Login</Link>
                                </Button>
                                <Button asChild className="flex-1 bg-primary">
                                    <Link href="/forgot-password">Solicitar nuevo Link</Link>
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
