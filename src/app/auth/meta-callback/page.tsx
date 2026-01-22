"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

/**
 * This page handles the final redirect after OAuth callback.
 * 
 * WHY THIS EXISTS:
 * When returning from Facebook OAuth, cookies with SameSite=Lax may not be sent
 * on the initial cross-origin redirect. By landing on this client-side page first,
 * we give the browser a chance to:
 * 1. Fully load the page (same-origin context)
 * 2. Send cookies on subsequent navigation
 * 3. Verify session is intact before redirecting
 * 
 * The API callback redirects HERE instead of directly to the target page.
 */
export default function MetaCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('Verificando sesión...')

    useEffect(() => {
        async function handleCallback() {
            // Get params from URL
            const success = searchParams.get('success')
            const error = searchParams.get('error')
            const target = searchParams.get('target') || '/platform/integrations'
            const count = searchParams.get('count')

            // Check if we have a valid session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !session) {
                console.error("Session check failed:", sessionError)
                setStatus('error')
                setMessage('Sesión no encontrada. Por favor inicia sesión nuevamente.')

                // Wait a moment then redirect to login
                setTimeout(() => {
                    router.push('/login?returnTo=' + encodeURIComponent(target))
                }, 2000)
                return
            }

            // Session is valid, prepare redirect
            if (error) {
                setStatus('error')
                setMessage(`Error: ${searchParams.get('desc') || error}`)
                setTimeout(() => router.push(target + '?error=' + error), 2000)
            } else if (success) {
                setStatus('success')
                setMessage(count
                    ? `¡${count} canal(es) conectado(s) exitosamente!`
                    : '¡Conexión exitosa!'
                )
                // Small delay for UX, then redirect
                setTimeout(() => {
                    router.push(target + (success ? `?success=${success}` : ''))
                }, 1500)
            } else {
                // No specific status, just redirect
                router.push(target)
            }
        }

        handleCallback()
    }, [searchParams, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center space-y-6 p-8">
                {status === 'loading' && (
                    <>
                        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                        <p className="text-white/80 text-lg">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>
                        <p className="text-white text-lg font-medium">{message}</p>
                        <p className="text-white/60 text-sm">Redirigiendo...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <XCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <p className="text-white text-lg font-medium">{message}</p>
                        <p className="text-white/60 text-sm">Redirigiendo...</p>
                    </>
                )}
            </div>
        </div>
    )
}
