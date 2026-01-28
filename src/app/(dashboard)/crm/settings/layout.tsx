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

import { SectionHeader } from "@/components/layout/section-header"

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
        <div className="h-full space-y-6">
            {/* Standardized Module Header */}
            <SectionHeader
                title="Configuración CRM"
                subtitle="Administra las preferencias generales de tu sistema de relaciones con clientes."
                icon={Settings}
            />



            {/* Horizontal Navigation Tabs */}
            <div className="flex flex-col space-y-6">
                <div className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-[800px] gap-2 p-1 bg-gray-100/50 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl">
                    {items.map((item) => {
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-white dark:bg-white/10 text-primary dark:text-white shadow-sm"
                                        : "text-muted-foreground hover:bg-gray-200/50 dark:hover:bg-white/5 hover:text-foreground"
                                )}
                            >
                                <item.icon className={cn("h-4 w-4", isActive ? "text-primary dark:text-white" : "text-muted-foreground")} />
                                <span className="truncate">{item.title}</span>
                            </Link>
                        )
                    })}
                </div>

                {/* Content Area */}
                <div className="flex-1 w-full min-h-[500px]">
                    {children}
                </div>
            </div>
        </div>
    )
}
