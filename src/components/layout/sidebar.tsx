"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
// Removed OrganizationSwitcher, DropdownMenu, Avatar etc.
import { OrgBranding } from "@/components/organizations/org-branding"
import { useActiveModules } from "@/hooks/use-active-modules"
import { MODULE_ROUTES, filterRoutesByModules } from "@/lib/module-config"
import { logout } from "@/modules/core/auth/actions" // We keep logout import just in case, or remove if unused. User wants logout in header.

interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    currentOrgId: string | null;
    isSuperAdmin?: boolean;
}

export function SidebarContent({ isCollapsed = false, currentOrgId, isSuperAdmin = false }: { isCollapsed?: boolean, currentOrgId: string | null, isSuperAdmin?: boolean }) {
    const pathname = usePathname()
    const { modules, isLoading } = useActiveModules()

    // Filter routes based on active modules
    const availableRoutes = filterRoutesByModules(modules)

    return (
        <div className="px-3 py-6 flex-1 flex flex-col h-full">
            {/* Branding Section (replaces OrgSwitcher) */}
            <div className={cn("flex items-center mb-10 transition-all duration-300 min-h-[48px]", isCollapsed ? "justify-center px-0" : "px-2")}>
                {isCollapsed ? (
                    <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-lg text-white font-bold text-sm">
                        PX
                    </div>
                ) : (
                    <OrgBranding orgId={currentOrgId} />
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

            {/* Platform Admin Section - Only for Super Admins */}
            {isSuperAdmin && (
                <div className="px-3 pb-4 border-t border-white/5 pt-4">
                    {!isCollapsed && (
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                            Platform
                        </p>
                    )}
                    <Link href="/platform/admin">
                        <div
                            className={cn(
                                "flex items-center gap-x-3 text-sm font-medium rounded-xl py-3 transition-all duration-200 group bg-purple-500/10 border border-purple-500/20",
                                isCollapsed ? "justify-center px-2" : "px-4",
                                pathname.startsWith('/platform/admin')
                                    ? "bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20"
                                    : "text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
                            )}
                        >
                            <Shield
                                className={cn(
                                    "h-5 w-5 shrink-0 transition-transform duration-200",
                                    pathname.startsWith('/platform/admin') ? "text-purple-300 scale-110" : "text-purple-400 group-hover:text-purple-300 group-hover:scale-105"
                                )}
                            />
                            {!isCollapsed && (
                                <span className={cn(
                                    "transition-all duration-200",
                                    pathname.startsWith('/platform/admin') ? "font-semibold" : ""
                                )}>
                                    SaaS Admin
                                </span>
                            )}
                            {!isCollapsed && pathname.startsWith('/platform/admin') && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                            )}
                        </div>
                    </Link>
                </div>
            )}

            {/* NO FOOTER - User Menu moved to Header */}
        </div >
    )
}

export function Sidebar({ isCollapsed, toggleCollapse, currentOrgId, isSuperAdmin = false }: SidebarProps) {
    const [isDragging, setIsDragging] = React.useState(false)
    const [dragStartX, setDragStartX] = React.useState(0)
    const dragThreshold = 50

    const handleDragStart = (clientX: number) => {
        setIsDragging(true)
        setDragStartX(clientX)
    }

    const handleDragMove = (clientX: number) => {
        if (!isDragging) return
        const dragDistance = clientX - dragStartX
        if (Math.abs(dragDistance) > dragThreshold) {
            if (dragDistance < 0 && !isCollapsed) {
                toggleCollapse()
                setIsDragging(false)
            } else if (dragDistance > 0 && isCollapsed) {
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

            <SidebarContent isCollapsed={isCollapsed} currentOrgId={currentOrgId} isSuperAdmin={isSuperAdmin} />
        </div>
    )
}
