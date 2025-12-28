"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
    const router = useRouter()
    const [status, setStatus] = useState("Initializing...")
    const [debugInfo, setDebugInfo] = useState("")

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const processAuth = async () => {
            try {
                const url = window.location.href
                setDebugInfo(`URL: ${url}`)

                // 1. Check for errors in hash
                const hash = window.location.hash.substring(1) // Remove #
                const failParams = new URLSearchParams(hash)
                const errorDesc = failParams.get('error_description')
                const errorCode = failParams.get('error_code')

                if (errorDesc || errorCode) {
                    setStatus(`Error: ${errorDesc?.replace(/\+/g, ' ')}`)
                    return
                }

                // 2. Check for Tokens in Hash (Manual Override)
                const accessToken = failParams.get('access_token')
                const refreshToken = failParams.get('refresh_token')

                if (accessToken && refreshToken) {
                    setStatus("Found tokens. Setting session...")
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (error) throw error

                    setStatus("Session set! Redirecting to setup...")
                    setTimeout(() => {
                        // FORCE REDIRECT TO ORGANIZATIONS WITH PASSWORD PROMPT
                        router.push('/platform/organizations?promptPassword=true')
                        router.refresh()
                    }, 500)
                    return
                }

                // 3. Fallback to Listener (for other flows)
                setStatus("Listening for auth events...")
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        setStatus("Signed In! Redirecting to setup...")
                        router.push('/platform/organizations?promptPassword=true')
                        router.refresh()
                    }
                    if (event === 'PASSWORD_RECOVERY') {
                        router.push('/platform/organizations?promptPassword=true')
                    }
                })

                return () => subscription.unsubscribe()

            } catch (err: any) {
                setStatus(`Exception: ${err.message}`)
            }
        }

        processAuth()
    }, [router, supabase])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-6 p-8 text-center bg-gray-50">
            <div className="space-y-4 max-w-lg bg-white p-8 rounded-xl shadow-sm border">
                <div className="flex justify-center">
                    {status.includes("Error") || status.includes("Exception") ? (
                        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl">!</div>
                    ) : (
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    )}
                </div>

                <h2 className="text-xl font-semibold text-gray-900">{status}</h2>

                <div className="text-xs text-left bg-gray-100 p-4 rounded overflow-auto max-h-32 font-mono text-gray-500 break-all">
                    <strong>Debug Info:</strong><br />
                    {debugInfo}
                </div>

                {status.includes("Error") && (
                    <button
                        onClick={() => router.push('/login')}
                        className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium w-full"
                    >
                        Back to Login
                    </button>
                )}
            </div>
        </div>
    )
}
