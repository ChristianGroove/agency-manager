"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, ChevronDown, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { OrgBranding } from "@/components/organizations/org-branding"
import { useActiveModules } from "@/hooks/use-active-modules"
import { MODULE_ROUTES, filterRoutesByModules, CATEGORY_LABELS, CATEGORY_ICONS, ModuleCategory } from "@/lib/module-config"
import { logout } from "@/modules/core/auth/actions"
import { SidebarParticles } from "./sidebar-particles"
import { OrganizationSwitcher } from "@/components/organizations/organization-switcher"
import { OrganizationCard } from "@/components/organizations/organization-card"
import { SidebarFloatingActions } from "./sidebar-floating-actions"
import { useTranslation } from "@/lib/i18n/use-translation"
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
    prefetchedModules?: string[]
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
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 shadow-md shadow-purple-500/10 border border-purple-200 dark:border-purple-500/20"
                            : "bg-gray-100/80 text-gray-900 shadow-sm dark:bg-white/10 dark:text-white dark:shadow-black/20"
                        : isSuperAdminRoute
                            ? "text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-500/10"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
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
    icon: Icon,
    children,
    collapsed,
    isExpanded,
    onToggle
}: {
    title: string,
    icon: any,
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
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider hover:text-gray-700 dark:hover:text-zinc-400 transition-colors group"
            >
                <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400" />
                    {title}
                </span>
                <ChevronDown className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    isExpanded ? "" : "-rotate-90"
                )} />
            </button>
            <div className={cn(
                "space-y-0.5 overflow-hidden transition-all duration-200 ml-3.5 pl-2 border-l border-gray-200 dark:border-zinc-800",
                isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}>
                {children}
            </div>
        </div>
    )
}

export function SidebarContent({ isCollapsed = false, currentOrgId, isSuperAdmin = false, prefetchedModules }: { isCollapsed?: boolean, currentOrgId: string | null, isSuperAdmin?: boolean, prefetchedModules?: string[] }) {
    const pathname = usePathname()
    const { t } = useTranslation()
    // PERF: Use prefetched modules if available, fall back to hook for client-side updates
    const { modules: hookModules, isLoading: hookLoading, organizationType } = useActiveModules()

    // Use prefetched data immediately, no loading state
    const modules = prefetchedModules && prefetchedModules.length > 0 ? prefetchedModules : hookModules
    const isLoading = prefetchedModules && prefetchedModules.length > 0 ? false : hookLoading

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
            label: t('sidebar.reseller_tenants'),
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

            {/* Header Logo */}
            <div className={cn("flex items-center mb-6 pl-2 transition-all duration-300 min-h-[40px]", isCollapsed ? "justify-center px-0" : "")}>
                <OrgBranding orgId={currentOrgId} collapsed={isCollapsed} />
            </div>

            {/* Show loading skeleton while fetching modules */}
            {isLoading ? (
                <div className="space-y-2 mb-auto">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-1">
                            <div className="h-3 w-16 bg-gray-200 dark:bg-white/5 rounded mx-3" />
                            {[...Array(2)].map((_, j) => (
                                <div key={j} className="h-8 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <nav className={cn(
                    "flex-1 overflow-y-auto pr-1 mb-2",
                    isCollapsed ? "no-scrollbar" : "scrollbar-modern"
                )}>
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
                                            label={t(`sidebar.${route.key}` as any)}
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
                                title={t(`sidebar.cat_${category}` as any)}
                                icon={CATEGORY_ICONS[category]}
                                collapsed={isCollapsed}
                                isExpanded={activeCategories.includes(category)}
                                onToggle={() => toggleCategory(category)}
                            >
                                {routes.map(route => (
                                    <SidebarItem
                                        key={route.href}
                                        icon={route.icon}
                                        label={t(`sidebar.${route.key}` as any)}
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


            {/* Organization Footer (Switcher + Logout) */}
            <div className="mt-auto pt-2 border-t border-gray-200 dark:border-white/5">
                <div className={cn("flex items-center transition-all duration-300 min-h-[40px]", isCollapsed ? "justify-center px-0" : "px-0")}>
                    <OrganizationSwitcher
                        trigger={<OrganizationCard orgId={currentOrgId} collapsed={isCollapsed} />}
                    />
                </div>
            </div>
        </div>
    )
}

import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { useTheme } from "next-themes"

export function Sidebar({ isCollapsed, toggleCollapse, currentOrgId, isSuperAdmin = false, user, prefetchedModules }: SidebarProps) {
    const { resolvedTheme } = useTheme()
    // PERF: Removed redundant branding fetch. Use CSS variable or default pink.
    const brandingColor = "242, 5, 226" // brand-pink RGB

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

    const shadowStyle = resolvedTheme === 'dark'
        ? `0 0 40px -5px rgba(${brandingColor}, 0.15), 0 0 15px -5px rgba(${brandingColor}, 0.1)`
        : "0 20px 40px -12px rgba(0,0,0,0.1)"

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "fixed left-4 top-4 bottom-4 h-auto bg-white/95 dark:bg-brand-dark/95 backdrop-blur-xl text-gray-900 dark:text-white rounded-2xl transition-all duration-300 ease-in-out z-50 flex flex-col border border-gray-200 dark:border-white/10 select-none animate-float-sidebar",
                    "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_-5px_rgba(255,255,255,0.15)]",
                    isCollapsed ? "w-16" : "w-64"
                )}
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

                <SidebarContent isCollapsed={isCollapsed} currentOrgId={currentOrgId} isSuperAdmin={isSuperAdmin} prefetchedModules={prefetchedModules} />
            </div>
        </TooltipProvider>
    )
}
