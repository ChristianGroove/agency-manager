'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

/**
 * AuthSessionBridge
 * 
 * Este componente se encarga de detectar si el usuario aterrizó en esta página
 * con tokens en el fragmento hash (#access_token=...). 
 * Esto sucede en el "Implicit Flow" de Supabase cuando el servidor no puede
 * procesar el callback.
 */
export function AuthSessionBridge() {
    const [isChecking, setIsChecking] = useState(false)
    const router = useRouter()
    
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const checkHash = async () => {
            const hash = window.location.hash
            if (!hash) return

            // Case 1: Session recovery or Access Token
            if (hash.includes('access_token=') || hash.includes('type=recovery')) {
                setIsChecking(true)
                try {
                    const { data, error } = await supabase.auth.getSession()
                    if (data?.session) {
                        toast.success("Sesión autenticada correctamente")
                        if (hash.includes('type=recovery') || window.location.pathname.includes('update-password')) {
                            router.push('/update-password')
                        } else {
                            router.push('/dashboard')
                        }
                        return
                    }
                    if (error) throw error
                } catch (e: any) {
                    console.error("Bridge Session Error:", e)
                    toast.error("No se pudo recuperar la sesión por token.")
                } finally {
                    setIsChecking(false)
                }
                return
            }

            // Case 2: Error in Hash (Supabase redirects here on failure)
            if (hash.includes('error=') && hash.includes('error_description=')) {
                // We let the UI handle it or we can show a more specific toast
                const params = new URLSearchParams(hash.replace('#', ''))
                const errorDesc = params.get('error_description')
                const errorCode = params.get('error_code')
                
                if (errorCode === 'otp_expired') {
                    toast.error("El enlace ha expirado. Por favor solicita uno nuevo.")
                } else if (errorDesc) {
                    toast.error(decodeURIComponent(errorDesc).replace(/\+/g, ' '))
                }
            }
        }

        checkHash()
    }, [supabase, router])

    if (!isChecking) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg font-medium">Sincronizando seguridad...</p>
                <p className="text-sm text-gray-500">Estamos verificando tu acceso directamente con Supabase.</p>
            </div>
        </div>
    )
}
