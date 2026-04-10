"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Fingerprint, Loader2, ScanFace } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePasskeys } from "@/modules/auth/passkeys/use-passkeys"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BiometricButtonProps {
    className?: string
    variant?: "default" | "outline" | "ghost" | "cyber"
    mode?: "login" | "register"
    onSuccess?: () => void
    email?: string
    iconOnly?: boolean
}

export function BiometricButton({ className, variant = "cyber", mode = "login", onSuccess, email, iconOnly }: BiometricButtonProps) {
    const { loginWithPasskey, registerPasskey, checkPasskeyStatus, loading } = usePasskeys()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // 1. Feature Detection (Hardware)
        if (typeof window === 'undefined' || !window.PublicKeyCredential) return

        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
            .then(available => {
                if (!available) return

                // 2. Logic Split
                if (mode === "register") {
                    // Always show if hardware supports it (for registration)
                    setIsVisible(true)
                } else if (mode === "login" && email) {
                    // For login, only show if user actually HAS a passkey
                    // Debounce check to avoid spamming API
                    const timer = setTimeout(async () => {
                        const hasPasskeys = await checkPasskeyStatus(email)
                        setIsVisible(hasPasskeys)
                    }, 800)
                    return () => clearTimeout(timer)
                } else {
                    setIsVisible(false)
                }
            })
            .catch(() => setIsVisible(false))
    }, [mode, email])

    if (!isVisible) return null

    const handleClick = async () => {
        const success = mode === "login"
            ? await loginWithPasskey(email)
            : await registerPasskey()

        if (success && onSuccess) onSuccess()
    }

    const label = mode === "login" ? "Acceder con Biometría" : "Registrar este dispositivo"
    const Icon = mode === "login" ? Fingerprint : ScanFace

    if (variant === "cyber") {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            onClick={handleClick}
                            disabled={loading}
                            className={cn(
                                "group relative overflow-hidden bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 hover:border-indigo-500/50 transition-all duration-300",
                                "shadow-[0_0_20px_-10px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.5)]",
                                iconOnly ? "w-12 h-12 p-0 rounded-xl" : "w-full",
                                className
                            )}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                            {loading ? (
                                <Loader2 className={cn("animate-spin text-indigo-400", iconOnly ? "h-6 w-6" : "h-5 w-5 mr-2")} />
                            ) : (
                                <Icon className={cn("text-indigo-400 group-hover:text-indigo-300 transition-colors", iconOnly ? "h-6 w-6" : "h-5 w-5 mr-2")} />
                            )}

                            {!iconOnly && (
                                <span className="relative font-medium tracking-wide">
                                    {loading ? "Procesando..." : label}
                                </span>
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-700 text-xs text-gray-200">
                        <p>Usa tu huella o rostro para {mode === "login" ? "entrar" : "guardar esta llave"}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Button
            variant={variant as any}
            className={className}
            onClick={handleClick}
            disabled={loading}
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
            {label}
        </Button>
    )
}
