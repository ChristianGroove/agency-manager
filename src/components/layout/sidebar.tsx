"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, ChevronDown, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { OrgBranding } from "@/components/organizations/org-branding"
import { useActiveModules } from "@/hooks/use-active-modules"
import { MODULE_ROUTES, filterRoutesByModules, CATEGORY_LABELS, ModuleCategory } from "@/lib/module-config"
import { logout } from "@/modules/core/auth/actions"
import { SidebarFloatingActions } from "./sidebar-floating-actions"
import { SidebarParticles } from "./sidebar-particles"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    currentOrgId: string | null;
    isSuperAdmin?: boolean;
    user?: any
}

function SidebarItem({ icon: Icon, label, href, active, collapsed, isSuperAdminRoute = false }: { icon: any, label: string, href: string, active: boolean, collapsed: boolean, isSuperAdminRoute?: boolean }) {
    const content = (
        <Link href={href}>
            <div
                className={cn(
                    "flex items-center gap-x-3 text-sm font-medium rounded-xl py-2 transition-all duration-200 group",
                    collapsed ? "justify-center px-2" : "px-3",
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
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        active ? "scale-110" : "group-hover:scale-105",
                        isSuperAdminRoute && active ? "text-purple-300" : ""
                    )}
                />
                {!collapsed && (
                    <span className={cn(
                        "transition-all duration-200 truncate text-[13px]",
                        active ? "font-semibold" : ""
                    )}>{label}</span>
                )}
                {!collapsed && active && (
                    <div className={cn("ml-auto w-1.5 h-1.5 rounded-full animate-pulse", isSuperAdminRoute ? "bg-purple-400" : "bg-brand-pink")} />
                )}
            </div>
        </Link>
    )

    if (collapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    {content}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold bg-brand-dark border-white/10 text-white">
                    {label}
                </TooltipContent>
            </Tooltip>
        )
    }

    return content
}

function SidebarSection({
    title,
    children,
    collapsed,
    isExpanded,
    onToggle
}: {
    title: string,
    children: React.ReactNode,
    collapsed: boolean,
    isExpanded: boolean,
    onToggle: () => void
}) {
    if (collapsed) return <div className="space-y-0.5 mb-2">{children}</div>

    return (
        <div className="mb-2">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-400 transition-colors"
            >
                <span>{title}</span>
                <ChevronDown className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    isExpanded ? "" : "-rotate-90"
                )} />
            </button>
            <div className={cn(
                "space-y-0.5 overflow-hidden transition-all duration-200",
                isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}>
                {children}
            </div>
        </div>
    )
}

export function SidebarContent({ isCollapsed = false, currentOrgId, isSuperAdmin = false }: { isCollapsed?: boolean, currentOrgId: string | null, isSuperAdmin?: boolean }) {
    const pathname = usePathname()
    const { modules, isLoading, organizationType } = useActiveModules()

    // Track which categories are expanded - default to core and crm
    const [activeCategories, setActiveCategories] = useState<string[]>(['core', 'crm'])

    // Initial state might need to be derived from Module Config but strictly user requested 2 max.
    // 'core' is always expanded usually but let's treat it as a category.

    const toggleCategory = (category: string) => {
        setActiveCategories(prev => {
            const isCurrentlyActive = prev.includes(category)

            if (isCurrentlyActive) {
                // If closing, just remove it
                return prev.filter(c => c !== category)
            } else {
                // If opening, check limit
                if (prev.length >= 2) {
                    // Remove the first one (oldest) and add new one
                    const [, ...rest] = prev
                    return [...rest, category]
                }
                // Otherwise just add
                return [...prev, category]
            }
        })
    }

    // Filter routes based on active modules
    const availableRoutes = filterRoutesByModules(modules)

    // INJECT RESELLER ROUTES
    if (organizationType === 'reseller' || organizationType === 'platform') {
        const resellerRoute = {
            key: 'reseller_tenants',
            label: 'Organizaciones',
            href: '/platform/organizations',
            icon: Users,
            category: 'core' as ModuleCategory,
            isCore: true
        }

        // Prevent duplicate if already exists (shouldn't happen with filterRoutesByModules, but safe check)
        if (!availableRoutes.find(r => r.key === 'reseller_tenants')) {
            availableRoutes.splice(1, 0, resellerRoute) // Insert after Dashboard
        }
    }

    // Group routes by category
    const groupedRoutes = availableRoutes.reduce((acc, route) => {
        const category = route.category || 'core'
        if (!acc[category]) acc[category] = []
        acc[category].push(route)
        return acc
    }, {} as Record<string, typeof availableRoutes>)

    // Order of categories
    const categoryOrder: ModuleCategory[] = ['core', 'crm', 'operations', 'finance', 'config']

    return (
        <div className="px-4 py-6 flex-1 flex flex-col h-full overflow-hidden relative z-10">
            {/* Branding Section - Compact */}
            <div className={cn("flex items-center mb-6 transition-all duration-300 min-h-[40px]", isCollapsed ? "justify-center px-0" : "px-3")}>
                <OrgBranding orgId={currentOrgId} collapsed={isCollapsed} />
            </div>

            {/* Show loading skeleton while fetching modules */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-1">
                            <div className="h-3 w-16 bg-white/5 rounded mx-3" />
                            {[...Array(2)].map((_, j) => (
                                <div key={j} className="h-8 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <nav className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {categoryOrder.map(category => {
                        const routes = groupedRoutes[category]
                        if (!routes || routes.length === 0) return null

                        // Core modules don't need a section title
                        if (category === 'core') {
                            return (
                                <div key={category} className="space-y-0.5 mb-2">
                                    {routes.map(route => (
                                        <SidebarItem
                                            key={route.href}
                                            icon={route.icon}
                                            label={route.label}
                                            href={route.href}
                                            active={pathname === route.href || pathname?.startsWith(`${route.href}/`) || false}
                                            collapsed={isCollapsed}
                                        />
                                    ))}
                                </div>
                            )
                        }

                        return (
                            <SidebarSection
                                key={category}
                                title={CATEGORY_LABELS[category]}
                                collapsed={isCollapsed}
                                isExpanded={activeCategories.includes(category)}
                                onToggle={() => toggleCategory(category)}
                            >
                                {routes.map(route => (
                                    <SidebarItem
                                        key={route.href}
                                        icon={route.icon}
                                        label={route.label}
                                        href={route.href}
                                        active={pathname === route.href || pathname?.startsWith(`${route.href}/`) || false}
                                        collapsed={isCollapsed}
                                    />
                                ))}
                            </SidebarSection>
                        )
                    })}
                </nav>
            )}

            {/* Logout Footer - Compact */}
            <div className="mt-auto pt-2 border-t border-white/5">
                <button
                    onClick={() => logout()}
                    className={cn(
                        "w-full flex items-center gap-x-3 text-sm font-medium rounded-xl py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 group",
                        isCollapsed ? "justify-center px-0" : "px-3"
                    )}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="text-[13px]">Cerrar Sesión</span>}
                </button>
            </div>
        </div>
    )
}

export function Sidebar({ isCollapsed, toggleCollapse, currentOrgId, isSuperAdmin = false, user }: SidebarProps) {
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
        <TooltipProvider>
            <div
                className={cn(
                    "fixed left-4 top-4 bottom-4 h-auto bg-brand-dark/95 backdrop-blur-xl text-white rounded-2xl transition-all duration-300 ease-in-out z-50 flex flex-col shadow-2xl border border-white/10 select-none animate-float-sidebar",
                    isCollapsed ? "w-16" : "w-64"
                )}
                style={{
                    boxShadow: "0 20px 40px -12px rgba(0,0,0,0.5)"
                }}
                onMouseDown={(e) => handleDragStart(e.clientX)}
                onMouseMove={(e) => handleDragMove(e.clientX)}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                onTouchEnd={handleDragEnd}
            >
                <SidebarParticles orgId={currentOrgId} />

                {/* Toggle Button */}
                <button
                    onClick={toggleCollapse}
                    className="absolute -right-3 top-8 bg-brand-pink rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-50 border border-white/10"
                >
                    <div className={cn("transition-transform duration-300 text-white", isCollapsed ? "rotate-180" : "")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </div>
                </button>

                {/* Floating Actions (General + Admin) */}
                <div className="absolute -right-3 bottom-5 z-50 flex flex-col items-end">
                    <SidebarFloatingActions
                        isSuperAdmin={isSuperAdmin}
                        user={user}
                        currentOrgId={currentOrgId}
                    />
                </div>

                <SidebarContent isCollapsed={isCollapsed} currentOrgId={currentOrgId} isSuperAdmin={isSuperAdmin} />
            </div>
        </TooltipProvider>
    )
}
