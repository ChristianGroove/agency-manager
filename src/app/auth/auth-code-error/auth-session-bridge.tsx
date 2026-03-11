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
            if (hash && (hash.includes('access_token=') || hash.includes('type=recovery'))) {
                setIsChecking(true)
                try {
                    // Supabase detectará automáticamente los tokens en el hash del objeto window
                    const { data, error } = await supabase.auth.getSession()
                    
                    if (data?.session) {
                        toast.success("Sesión recuperada correctamente")
                        
                        // Si es recuperación, enviar a update-password
                        if (hash.includes('type=recovery')) {
                            router.push('/update-password')
                        } else {
                            router.push('/dashboard')
                        }
                        return
                    }
                    
                    if (error) {
                        console.error("Bridge Session Error:", error)
                    }
                } catch (e) {
                    console.error("Critical Bridge Error:", e)
                } finally {
                    setIsChecking(false)
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
