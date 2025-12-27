"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Server, FileText, Settings, LogOut, CreditCard, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"

import { logout } from "@/app/actions/logout"

import { OrganizationSwitcher } from "@/components/organizations/organization-switcher"
import { useActiveModules } from "@/hooks/use-active-modules"
import { MODULE_ROUTES, filterRoutesByModules } from "@/lib/module-config"

interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    currentOrgId: string | null;
}

export function SidebarContent({ isCollapsed = false, currentOrgId }: { isCollapsed?: boolean, currentOrgId: string | null }) {
    const pathname = usePathname()
    const { modules, isLoading } = useActiveModules()

    // Filter routes based on active modules
    const availableRoutes = filterRoutesByModules(modules)

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

            {/* Show loading skeleton while fetching modules */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <nav className="space-y-2 flex-1">
                    {availableRoutes.map((route) => {
                        const Icon = route.icon
                        const isActive = pathname === route.href || pathname.startsWith(`${route.href}/`)

                        return (
                            <Link key={route.href} href={route.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-x-3 text-sm font-medium rounded-xl py-3 transition-all duration-200 group",
                                        isCollapsed ? "justify-center px-2" : "px-4",
                                        isActive
                                            ? "bg-white/10 text-white shadow-lg shadow-indigo-500/20"
                                            : "text-gray-300 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "h-5 w-5 shrink-0 transition-transform duration-200",
                                            isActive ? "text-white scale-110" : "text-gray-400 group-hover:text-white group-hover:scale-105"
                                        )}
                                    />
                                    {!isCollapsed && (
                                        <span className={cn(
                                            "transition-all duration-200",
                                            isActive ? "font-semibold" : ""
                                        )}>
                                            {route.label}
                                        </span>
                                    )}
                                    {!isCollapsed && isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </nav>
            )}
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
