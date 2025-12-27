"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Server, FileText, Settings, LogOut, CreditCard, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"

import { logout } from "@/app/actions/logout"

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
        label: "Contratos",
        icon: Server,
        href: "/hosting",
    },
    {
        label: 'Documentos de Cobro',
        href: '/invoices',
        icon: FileText,
    },
    {
        label: "Cotizaciones",
        icon: FileText,
        href: "/quotes",
    },
    {
        label: "Briefings",
        icon: FileText,
        href: "/briefings",
    },
    {
        label: "Catálogo",
        icon: Briefcase,
        href: "/portfolio",
    },
    {
        label: "Pagos",
        icon: CreditCard,
        href: "/payments",
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
    currentOrgId: string | null;
}

import { OrganizationSwitcher } from "@/components/organizations/organization-switcher"

export function SidebarContent({ isCollapsed = false, currentOrgId }: { isCollapsed?: boolean, currentOrgId: string | null }) {
    const pathname = usePathname()

    return (
        <div className="px-3 py-6 flex-1 flex flex-col h-full">
            <div className={cn("flex items-center mb-10 transition-all duration-300", isCollapsed ? "justify-center px-0" : "px-0")}>
                {isCollapsed ? (
                    <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-lg text-white font-bold text-sm">
                        PX
                    </div>
                ) : (
                    <OrganizationSwitcher key={currentOrgId} />
                )}
            </div>

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
                <button
                    onClick={() => logout()}
                    className={cn(
                        "text-sm group flex p-3 w-full font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-xl transition text-zinc-400",
                        isCollapsed ? "justify-center" : "justify-start"
                    )}
                >
                    <div className="flex items-center">
                        <LogOut className={cn("h-5 w-5 text-zinc-400 group-hover:text-white transition-all", isCollapsed ? "mr-0" : "mr-3")} />
                        {!isCollapsed && <span>Cerrar Sesión</span>}
                    </div>
                </button>
            </div>
        </div >
    )
}



export function Sidebar({ isCollapsed, toggleCollapse, currentOrgId }: SidebarProps) {
    const [isDragging, setIsDragging] = React.useState(false)
    const [dragStartX, setDragStartX] = React.useState(0)
    const dragThreshold = 50 // pixels to drag before triggering collapse/expand

    const handleDragStart = (clientX: number) => {
        setIsDragging(true)
        setDragStartX(clientX)
    }

    const handleDragMove = (clientX: number) => {
        if (!isDragging) return

        const dragDistance = clientX - dragStartX

        // Only trigger if dragged more than threshold
        if (Math.abs(dragDistance) > dragThreshold) {
            if (dragDistance < 0 && !isCollapsed) {
                // Dragged left while expanded -> collapse
                toggleCollapse()
                setIsDragging(false)
            } else if (dragDistance > 0 && isCollapsed) {
                // Dragged right while collapsed -> expand
                toggleCollapse()
                setIsDragging(false)
            }
        }
    }

    const handleDragEnd = () => {
        setIsDragging(false)
    }

    return (
        <div
            className={cn(
                "fixed left-5 top-5 bottom-5 h-auto bg-brand-dark text-white rounded-2xl transition-all duration-300 ease-in-out z-50 flex flex-col shadow-2xl border border-white/5 animate-float-sidebar select-none",
                isCollapsed ? "w-20" : "w-72"
            )}
            onMouseDown={(e) => handleDragStart(e.clientX)}
            onMouseMove={(e) => handleDragMove(e.clientX)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
            onTouchEnd={handleDragEnd}
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

            <SidebarContent isCollapsed={isCollapsed} currentOrgId={currentOrgId} />
        </div>
    )
}
