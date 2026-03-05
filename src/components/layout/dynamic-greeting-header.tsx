"use client"

import { useEffect, useState } from "react"
import { SectionHeader } from "@/components/layout/section-header"
import { LayoutDashboard } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function DynamicGreetingHeader() {
    const [greeting, setGreeting] = useState("Dashboard")
    const [subtitle, setSubtitle] = useState("Resumen en tiempo real de tu negocio")

    useEffect(() => {
        let mounted = true

        const setupGreeting = async () => {
            try {
                // 1. Calcular el saludo exacto basado en la zona horaria del Navegador del usuario
                const currentHour = new Date().getHours()
                let timeGreeting = "Hola"

                if (currentHour >= 5 && currentHour < 12) {
                    timeGreeting = "Buenos días"
                } else if (currentHour >= 12 && currentHour < 19) {
                    timeGreeting = "Buenas tardes"
                } else {
                    timeGreeting = "Buenas noches"
                }

                // 2. Extraer el nombre de perfil desde la sesión hidratada localmente del cliente
                const { data: { session }, error } = await supabase.auth.getSession()

                if (mounted && session?.user && !error) {
                    const meta = session.user.user_metadata
                    const displayName = meta?.first_name || meta?.full_name || meta?.name
                    if (displayName) {
                        setGreeting(`${timeGreeting}, ${displayName}`)
                    } else {
                        setGreeting(`${timeGreeting}`)
                    }
                } else if (mounted) {
                    setGreeting(timeGreeting)
                }

            } catch (error) {
                console.error("Error setting dynamic greeting:", error)
            }
        }

        setupGreeting()

        return () => {
            // Cleanup para prevenir state updates en unmount
            mounted = false
        }
    }, [])

    return (
        <SectionHeader
            title={greeting}
            subtitle={subtitle}
            icon={LayoutDashboard}
        />
    )
}
