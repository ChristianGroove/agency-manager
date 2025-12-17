"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Server, FileText, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
    },
    {
        label: "Clientes",
        icon: Users,
        href: "/clients",
    },
    {
        label: "Servicios",
        icon: Server,
        href: "/hosting",
    },
    {
        label: "Facturación",
        icon: FileText,
        href: "/invoices",
    },
    {
        label: "Configuración",
        icon: Settings,
        href: "/settings",
    },
]

interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, toggleCollapse }: SidebarProps) {
    const pathname = usePathname()

    return (
        <div
            className={cn(
                "fixed left-0 top-0 h-[calc(100vh-40px)] m-5 bg-brand-dark text-white rounded-2xl transition-all duration-300 ease-in-out z-50 flex flex-col shadow-2xl animate-float border border-white/5",
                isCollapsed ? "w-20" : "w-72"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleCollapse}
                className="absolute -right-3 top-1/2 -translate-y-1/2 bg-brand-pink rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-50"
            >
                <div className={cn("transition-transform duration-300", isCollapsed ? "rotate-180" : "")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </div>
            </button>

            <div className="px-3 py-6 flex-1 flex flex-col">
                <Link href="/dashboard" className={cn("flex items-center mb-10 transition-all duration-300", isCollapsed ? "justify-center px-0" : "pl-3")}>
                    <div className={cn("relative transition-all duration-300", isCollapsed ? "w-10 h-10" : "w-32 h-10")}>
                        {isCollapsed ? (
                            <img
                                src="/branding/iso.svg"
                                alt="Pixy"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <img
                                src="/branding/logo light.svg"
                                alt="Pixy"
                                className="w-full h-full object-contain object-left"
                            />
                        )}
                    </div>
                </Link>

                <div className="space-y-2 flex-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full font-medium cursor-pointer hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200",
                                pathname === route.href
                                    ? "text-brand-cyan bg-white/5 shadow-[0_0_15px_rgba(0,224,255,0.1)]"
                                    : "text-zinc-400",
                                isCollapsed ? "justify-center" : "justify-start"
                            )}
                        >
                            <div className="flex items-center">
                                <route.icon className={cn("h-5 w-5 transition-colors", pathname === route.href ? "text-brand-cyan" : "text-zinc-400 group-hover:text-white", isCollapsed ? "mr-0" : "mr-3")} />
                                {!isCollapsed && <span>{route.label}</span>}
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5">
                    <button className={cn(
                        "text-sm group flex p-3 w-full font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-xl transition text-zinc-400",
                        isCollapsed ? "justify-center" : "justify-start"
                    )}>
                        <div className="flex items-center">
                            <LogOut className={cn("h-5 w-5 text-red-500 transition-all", isCollapsed ? "mr-0" : "mr-3")} />
                            {!isCollapsed && <span>Cerrar Sesión</span>}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}
