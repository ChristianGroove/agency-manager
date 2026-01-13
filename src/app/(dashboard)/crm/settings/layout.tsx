"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    GitBranch,
    MessageCircle,
    FileText,
    Settings,
    Layout
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface SettingsLayoutProps {
    children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname()

    // Definition of tabs
    const items = [
        {
            title: "Canales",
            href: "/crm/settings/channels",
            icon: MessageCircle,
            description: "WhatsApp y más"
        },
        {
            title: "Pipelines",
            href: "/crm/settings/pipeline",
            icon: GitBranch,
            description: "Etapas de venta"
        },
        {
            title: "Plantillas (Meta)",
            href: "/crm/settings/templates",
            icon: FileText,
            description: "Mensajes predefinidos"
        },
        {
            title: "Plantillas de Industria",
            href: "/crm/settings/pipeline-templates",
            icon: Layout,
            description: "Modelos de Pipeline"
        },
    ]

    return (
        <div className="space-y-6 pt-2 pb-16">
            {/* Standard Module Header */}
            <div className="space-y-0.5 px-6 pt-6">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary" /> Configuración CRM
                </h2>
                <p className="text-muted-foreground">
                    Administra las preferencias generales de tu sistema de relaciones con clientes.
                </p>
            </div>

            <Separator />

            {/* Horizontal Navigation Tabs */}
            <div className="flex flex-col space-y-8 px-6">
                <div className="flex items-center space-x-1 border-b overflow-x-auto pb-px">
                    {items.map((item) => {
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap",
                                    isActive
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                <div>
                                    <span>{item.title}</span>
                                    {/* Optional: Show description only on desktop/large screens if needed, but keeping it clean for tabs is better */}
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 lg:max-w-7xl mx-auto w-full min-h-[500px]">
                    {children}
                </div>
            </div>
        </div>
    )
}
