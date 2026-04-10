"use client"

import { useEffect, useState } from "react"
import { SectionHeader } from "@/components/layout/section-header"
import { LayoutDashboard } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SpaceStatusBadge } from "@/modules/core/organizations/components/dashboard/SpaceStatusBadge"
import { useBranding } from "@/components/providers/branding-provider"
import { useSaaSData } from "@/components/providers/saas-provider"

export function DynamicGreetingHeader() {
    const [greeting, setGreeting] = useState("Dashboard")
    const [subtitle, setSubtitle] = useState("Resumen en tiempo real de tu negocio")

    // Obtener datos instantáneamente del Contexto (Pre-cargados en el Layout)
    const { app: appData, subscription, orgDetails } = useSaaSData()
    const branding = useBranding()

    useEffect(() => {
        let mounted = true

        const setupGreeting = async () => {
            try {
                const currentHour = new Date().getHours()
                let timeGreeting = "Hola"

                if (currentHour >= 5 && currentHour < 12) {
                    timeGreeting = "Buenos días"
                } else if (currentHour >= 12 && currentHour < 19) {
                    timeGreeting = "Buenas tardes"
                } else {
                    timeGreeting = "Buenas noches"
                }

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
            mounted = false
        }
    }, [])

    return (
        <SectionHeader
            title={greeting}
            subtitle={subtitle}
            icon={LayoutDashboard}
            action={
                <SpaceStatusBadge
                    app={appData}
                    subscription={subscription}
                    orgName={orgDetails?.name || ""}
                    brandColor={branding?.colors?.primary}
                />
            }
        />
    )
}
