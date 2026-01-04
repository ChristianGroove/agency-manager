"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Palette, Package, ExternalLink, Activity, Users, Settings } from "lucide-react"

export function AdminShortcuts({ t }: { t: any }) {
    const shortcuts = [
        {
            title: "Gestión de Dominios",
            description: "DNS & Rutas",
            icon: Globe,
            href: "/platform/admin/domains",
            color: "text-indigo-500",
            bg: "bg-indigo-50",
            hover: "hover:border-indigo-200 hover:shadow-indigo-100"
        },
        {
            title: "Marca Global",
            description: "Identidad Visual",
            icon: Palette,
            href: "/platform/admin/branding",
            color: "text-pink-500",
            bg: "bg-pink-50",
            hover: "hover:border-pink-200 hover:shadow-pink-100"
        },
        {
            title: "Planes de Branding",
            description: "Monetización",
            icon: Settings,
            href: "/platform/admin/branding/tiers",
            color: "text-amber-500",
            bg: "bg-amber-50",
            hover: "hover:border-amber-200 hover:shadow-amber-100"
        }
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {shortcuts.map((item, index) => (
                <a key={index} href={item.href} className="block group">
                    <Card className={`h-full border border-transparent shadow-sm bg-white transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md ${item.hover}`}>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-900 leading-none">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                            <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100" />
                        </div>
                    </Card>
                </a>
            ))}
        </div>
    )
}
