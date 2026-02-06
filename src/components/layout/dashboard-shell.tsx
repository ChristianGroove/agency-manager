"use client"

// import { useState } from "react"
// import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"

import { BillingAutomator } from "@/modules/core/billing/billing-automator"
import { TenantContextIndicator } from "@/components/organizations/tenant-context-indicator"

import { User } from "@supabase/supabase-js"

import { SidebarProvider, useSidebar } from "./sidebar-provider"

interface DashboardShellProps {
    children: React.ReactNode
    sidebarSlot?: React.ReactNode // New slot for Server Component Sidebar
    // Legacy props for compatibility (optional now)
    user?: User
    currentOrgId?: string | null
    isSuperAdmin?: boolean
    sidebarContext?: any
}

function DashboardContent({ children, sidebarSlot }: { children: React.ReactNode, sidebarSlot: React.ReactNode }) {
    const { isCollapsed } = useSidebar()

    return (
        <>
            {/* Floating Sidebar Slot */}
            <div className="hidden md:block print:hidden">
                {sidebarSlot}
            </div>

            {/* Main Content Area */}
            <main
                className={cn(
                    "transition-all duration-300 ease-in-out min-h-[100dvh] flex flex-col print:pl-0 print:p-0 pl-0",
                    isCollapsed ? "md:pl-[88px]" : "md:pl-[280px]" // sidebar width (w-64=256px) + gap (16px left + 8px gap)
                )}
            >
                {/* Mobile Header logic would go here, utilizing context as well */}

                <div className="flex-1 p-4 md:p-8 print:p-0">
                    {children}
                </div>

                <TenantContextIndicator />
            </main>
        </>
    )
}

export function DashboardShell({ children, sidebarSlot, user, currentOrgId, isSuperAdmin, sidebarContext }: DashboardShellProps) {
    // Note: We're ignoring passed props for Sidebar if sidebarSlot is present, 
    // assuming the slot (Server Component) handles its own data fetching.
    // However, Mobile Sidebar still needs props if it's not server-rendered.
    // For now, let's assume Mobile Sidebar remains Client or we pass the same Slot if viable 
    // (Mobile usually has different layout/state).

    // For this refactor, we wrap content.
    return (
        <SidebarProvider>
            <div className="h-full relative bg-gray-50/50 dark:bg-transparent min-h-screen">
                <BillingAutomator />

                <DashboardContent sidebarSlot={sidebarSlot}>
                    {/* Mobile header rendering logic duplicated or extracted? 
                         Let's keep Mobile Header here for now, passing props.
                         Ideally Mobile Sidebar also uses Context.
                      */}

                    <div className="md:hidden flex items-center p-4 border-b border-gray-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-40">
                        <MobileSidebar
                            user={user!}
                            currentOrgId={currentOrgId!}
                            isSuperAdmin={isSuperAdmin}
                            sidebarContext={sidebarContext}
                        />
                        <span className="font-semibold text-lg bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent ml-2">
                            Agency Manager
                        </span>
                    </div>

                    {children}
                </DashboardContent>
            </div>
        </SidebarProvider>
    )
}
