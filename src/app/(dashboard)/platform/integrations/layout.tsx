import React from "react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Integraciones y Conectores | Pixy",
    description: "Gestiona tus conexiones con servicios externos, VCS, mensajería, IA y más para tu espacio de trabajo Pixy.",
}

interface IntegrationsLayoutProps {
    children: React.ReactNode
}

export default function IntegrationsLayout({ children }: IntegrationsLayoutProps) {
    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex-1">
                {children}
            </div>
        </div>
    )
}
