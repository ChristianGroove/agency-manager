"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"

import { BillingAutomator } from "@/modules/core/billing/billing-automator"

import { User } from "@supabase/supabase-js"

interface DashboardShellProps {
    children: React.ReactNode
    user: User
    currentOrgId: string | null
    isSuperAdmin?: boolean
    prefetchedModules?: string[]
}

export function DashboardShell({ children, user, currentOrgId, isSuperAdmin = false, prefetchedModules }: DashboardShellProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className="h-full relative bg-gray-50/50 dark:bg-transparent min-h-screen">
            <BillingAutomator />
            {/* Floating Sidebar */}
            <div className="hidden md:block print:hidden">
                <Sidebar
                    isCollapsed={isCollapsed}
                    toggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    currentOrgId={currentOrgId}
                    isSuperAdmin={isSuperAdmin}
                    user={user}
                    prefetchedModules={prefetchedModules}
                />
            </div>

            {/* Main Content Area */}
            <main
                className={cn(
                    "transition-all duration-300 ease-in-out min-h-[100dvh] flex flex-col print:pl-0 print:p-0 pl-0",
                    isCollapsed ? "md:pl-[88px]" : "md:pl-[280px]" // sidebar width (w-64=256px) + gap (16px left + 8px gap)
                )}
            >
                {/* Mobile Header */}
                <div className="md:hidden flex items-center p-4 border-b border-gray-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-40">
                    <MobileSidebar
                        user={user}
                        currentOrgId={currentOrgId}
                        isSuperAdmin={isSuperAdmin}
                        prefetchedModules={prefetchedModules}
                    />
                    <span className="font-semibold text-lg bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent ml-2">
                        Agency Manager
                    </span>
                </div>

                <div className="flex-1 p-4 md:p-8 print:p-0">
                    {children}
                </div>
            </main>
        </div>
    )
}
