"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, LogOut, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"
// Removed OrganizationSwitcher, DropdownMenu, Avatar etc.
import { OrgBranding } from "@/components/organizations/org-branding"
import { useActiveModules } from "@/hooks/use-active-modules"
import { MODULE_ROUTES, filterRoutesByModules } from "@/lib/module-config"
import { logout } from "@/modules/core/auth/actions"
import { AdminAccessButton } from "./admin-access-button"

interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    currentOrgId: string | null;
    isSuperAdmin?: boolean;
}

function SidebarItem({ icon: Icon, label, href, active, collapsed, isSuperAdminRoute = false }: { icon: any, label: string, href: string, active: boolean, collapsed: boolean, isSuperAdminRoute?: boolean }) {
    return (
        <Link href={href}>
            <div
                className={cn(
                    "flex items-center gap-x-3 text-sm font-medium rounded-xl py-3 transition-all duration-200 group",
                    collapsed ? "justify-center px-2" : "px-4",
                    active
                        ? isSuperAdminRoute
                            ? "bg-purple-500/10 text-purple-300 shadow-md shadow-purple-500/10 border border-purple-500/20"
                            : "bg-white/10 text-white shadow-md shadow-black/20"
                        : isSuperAdminRoute
                            ? "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
            >
                <Icon
                    className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-200",
                        active ? "scale-110" : "group-hover:scale-105",
                        isSuperAdminRoute && active ? "text-purple-300" : ""
                    )}
                />
                {!collapsed && (
                    <span className={cn(
                        "transition-all duration-200",
                        active ? "font-semibold" : ""
                    )}>{label}</span>
                )}
                {!collapsed && active && (
                    <div className={cn("ml-auto w-1.5 h-1.5 rounded-full animate-pulse", isSuperAdminRoute ? "bg-purple-400" : "bg-brand-pink")} />
                )}
            </div>
        </Link>
    )
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
                    {availableRoutes.map((route) => (
                        <SidebarItem
                            key={route.href}
                            icon={route.icon}
                            label={route.label}
                            href={route.href}
                            active={pathname === route.href || pathname?.startsWith(`${route.href}/`) || false}
                            collapsed={isCollapsed}
                        />
                    ))}


                </nav>
            )}
        </div>
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

            {/* Super Admin Buttons (Absolute Positioned at edge) */}
            {isSuperAdmin && (
                <div className="absolute -right-3 bottom-5 z-50 flex flex-col items-end">
                    <AdminAccessButton />
                </div>
            )}

            <SidebarContent isCollapsed={isCollapsed} currentOrgId={currentOrgId} isSuperAdmin={isSuperAdmin} />
        </div>
    )
}
