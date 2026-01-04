import React from "react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Integraciones y Canales | CRM",
    description: "Gestiona tus conexiones con servicios externos como WhatsApp, Email y más.",
}

interface IntegrationsLayoutProps {
    children: React.ReactNode
}

export default function IntegrationsLayout({ children }: IntegrationsLayoutProps) {
    return (
        <div className="h-full flex flex-col space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Centro de Conexiones</h2>
                <p className="text-muted-foreground">
                    Conecta y gestiona tus canales de comunicación y servicios externos.
                </p>
            </div>
            <div className="flex-1">
                {children}
            </div>
        </div>
    )
}
