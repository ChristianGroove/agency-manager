"use client"

import { useState } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function usePasskeys() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    /**
     * Registers a new Passkey (Fingerprint/FaceID) for the current user.
     * The user MUST be logged in to perform this action.
     */
    const registerPasskey = async (deviceName?: string) => {
        setLoading(true)
        try {
            // 1. Check if device supports WebAuthn
            if (!window.PublicKeyCredential) {
                toast.error('Tu navegador no soporta WebAuthn.')
                return false
            }

            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
            if (!available) {
                toast.error('Tu dispositivo no soporta acceso biométrico (FaceID/Huella).')
                return false
            }

            // 2. Get registration options from server
            const optionsRes = await fetch('/api/passkeys/register-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!optionsRes.ok) {
                const error = await optionsRes.json()
                throw new Error(error.error || 'Failed to get registration options')
            }

            const options: PublicKeyCredentialCreationOptionsJSON = await optionsRes.json()

            // 3. Trigger browser WebAuthn ceremony
            const credential = await startRegistration(options)

            // 4. Verify with server
            const verifyRes = await fetch('/api/passkeys/register-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credential,
                    deviceName: deviceName || getBrowserInfo(),
                }),
            })

            if (!verifyRes.ok) {
                const error = await verifyRes.json()
                throw new Error(error.error || 'Verification failed')
            }

            // 5. Success
            toast.success('¡Dispositivo registrado!', {
                description: 'Ahora puedes iniciar sesión con tu huella o rostro.'
            })
            return true

        } catch (error: any) {
            console.error('Passkey Registration Error:', error)

            if (error.name === 'NotAllowedError') {
                toast.info('Registro cancelado.')
            } else {
                toast.error(error.message || 'Error al registrar biometría')
            }
            return false
        } finally {
            setLoading(false)
        }
    }

    /**
     * Attempts to log in using a Passkey.
     * Requires user's email to fetch their passkeys.
     */
    const loginWithPasskey = async (email?: string) => {
        setLoading(true)
        try {
            if (!email) {
                toast.error('Email requerido para iniciar sesión.')
                return false
            }

            // 1. Get authentication options from server
            const optionsRes = await fetch('/api/passkeys/login-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            if (!optionsRes.ok) {
                const error = await optionsRes.json()
                throw new Error(error.error || 'Failed to get login options')
            }

            const options: PublicKeyCredentialRequestOptionsJSON = await optionsRes.json()

            // 2. Trigger browser WebAuthn ceremony
            const credential = await startAuthentication(options)

            // 3. Verify with server
            const verifyRes = await fetch('/api/passkeys/login-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credential,
                    email,
                }),
            })

            if (!verifyRes.ok) {
                const error = await verifyRes.json()
                throw new Error(error.error || 'Verification failed')
            }

            const { session } = await verifyRes.json()

            // 4. Set session in Supabase
            // Note: Using the magic link URL to establish session
            if (session?.properties?.action_link) {
                // Extract token from magic link
                const url = new URL(session.properties.action_link)
                const token = url.searchParams.get('token')
                if (token) {
                    await supabase.auth.verifyOtp({
                        token_hash: token,
                        type: 'magiclink',
                    })
                }
            }

            // 5. Success
            toast.success('¡Bienvenido de nuevo!')
            router.push('/dashboard')
            router.refresh()
            return true

        } catch (error: any) {
            console.error('Passkey Login Error:', error)

            if (error.name === 'NotAllowedError') {
                toast.info('Inicio de sesión cancelado.')
            } else if (error.message?.includes('not found')) {
                toast.error('No hay llaves registradas para este email.')
            } else {
                toast.error('Error al iniciar sesión con biometría.')
            }
            return false
        } finally {
            setLoading(false)
        }
    }

    /**
     * Checks if the user has any registered passkeys.
     */
    const checkPasskeyStatus = async (email: string) => {
        try {
            const res = await fetch('/api/passkeys/check-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            if (!res.ok) return false

            const data = await res.json()
            return !!data.hasPasskeys
        } catch (error) {
            console.error('Check status failed:', error)
            return false
        }
    }

    return {
        registerPasskey,
        loginWithPasskey,
        checkPasskeyStatus,
        loading
    }
}

// Helper to get browser/device info for friendly device names
function getBrowserInfo(): string {
    const ua = navigator.userAgent
    if (ua.includes('Chrome')) return 'Chrome en ' + (navigator.platform || 'Desktop')
    if (ua.includes('Firefox')) return 'Firefox en ' + (navigator.platform || 'Desktop')
    if (ua.includes('Safari')) return 'Safari en ' + (navigator.platform || 'Desktop')
    if (ua.includes('Edge')) return 'Edge en ' + (navigator.platform || 'Desktop')
    return 'Dispositivo ' + (navigator.platform || 'Desconocido')
}
