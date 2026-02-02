"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, Lock } from "lucide-react"
import { createBrandingUpgradeTransaction } from "../billing-actions"
import { toast } from "sonner"

interface DirectUpgradeButtonProps {
    className?: string
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
    allowDirectBilling?: boolean
}

declare global {
    interface Window {
        WidgetCheckout: any
    }
}

export function DirectUpgradeButton({
    className,
    variant = "default",
    allowDirectBilling = true
}: DirectUpgradeButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleUpgrade = async () => {
        setLoading(true)
        try {
            // 1. Create transaction in DB
            const result = await createBrandingUpgradeTransaction()

            if (!result.success) {
                toast.error("No se pudo iniciar el proceso de pago")
                return
            }

            // 2. Open Wompi Widget
            // Use Pixy's Public Key from environment
            const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'pub_prod_yLQNKtKrUhFcIu1HLcLsVjJO3zLWbZBT'

            const checkout = new window.WidgetCheckout({
                currency: result.currency,
                amountInCents: result.amountInCents,
                reference: result.reference,
                publicKey: publicKey,
                // redirectUrl: window.location.href, // Optional
            })

            checkout.open((result: any) => {
                const transaction = result.transaction
                if (transaction.status === 'APPROVED') {
                    toast.success("¡Pago aprobado! Tu branding se activará en unos segundos.")
                    // Refresh after a delay to show new tier
                    setTimeout(() => window.location.reload(), 3000)
                } else {
                    toast.error("El pago no fue aprobado. Estado: " + transaction.status)
                }
            })

        } catch (error: any) {
            console.error("Upgrade error:", error)
            toast.error(error.message || "Error al procesar el upgrade")
        } finally {
            setLoading(false)
        }
    }

    if (!allowDirectBilling) {
        return (
            <Button
                onClick={() => toast.info("Por favor contacta a tu proveedor para activar esta función.")}
                className={`bg-gray-100 hover:bg-gray-200 text-gray-700 gap-2 border border-gray-200 shadow-none ${className}`}
                variant="outline"
            >
                <Lock className="h-4 w-4" />
                Contactar Administrador
            </Button>
        )
    }

    return (
        <>
            {/* Inject Wompi Script if not present */}
            <script
                src="https://checkout.wompi.co/widget.js"
                async
            ></script>

            <Button
                onClick={handleUpgrade}
                disabled={loading}
                className={`bg-brand-pink hover:bg-brand-pink/90 text-white gap-2 shadow-lg shadow-brand-pink/20 ${className}`}
                variant={variant}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Actualizar a Branding Total
            </Button>
        </>
    )
}
