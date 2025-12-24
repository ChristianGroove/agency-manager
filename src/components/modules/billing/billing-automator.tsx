"use client"

import { useEffect, useRef } from "react"
import { checkAndGenerateCycles } from "@/lib/billing-automation"
import { toast } from "sonner"

export function BillingAutomator() {
    const hasRun = useRef(false)

    useEffect(() => {
        if (hasRun.current) return
        hasRun.current = true

        const runCheck = async () => {
            console.log("Running Billing Automation Check...")
            let totalProcessed = 0
            let keepChecking = true
            let loopCount = 0

            while (keepChecking && loopCount < 12) { // Cap at 12 loops (e.g. 1 year of months) to prevent infinite loops
                const result = await checkAndGenerateCycles()

                if (result.success && result.count && result.count > 0) {
                    totalProcessed += result.count
                    loopCount++
                    // Continue loop to catch the next layer
                } else {
                    keepChecking = false
                    if (result.error) {
                        console.error("Billing Automation Error:", result.error)
                        toast.error("Error en Automatización de Facturación", {
                            description: `Detalle: ${result.error.message || JSON.stringify(result.error)}`
                        })
                    }
                }
            }

            if (totalProcessed > 0) {
                toast.success(`Automatización de Facturación`, {
                    description: `Se han generado ${totalProcessed} facturas de ciclos completados (Histórico actualizado).`
                })
            }
        }

        // Delay slightly to not block initial render
        const timer = setTimeout(runCheck, 2000)

        return () => clearTimeout(timer)
    }, [])

    return null // Invisible component
}
