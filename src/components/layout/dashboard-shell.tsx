"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"

import { BillingAutomator } from "@/components/modules/billing/billing-automator"

import { User } from "@supabase/supabase-js"

interface DashboardShellProps {
    children: React.ReactNode
    user: User
    currentOrgId: string | null
    isSuperAdmin?: boolean
}

export function DashboardShell({ children, user, currentOrgId, isSuperAdmin = false }: DashboardShellProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className="h-full relative bg-gray-50/50 min-h-screen">
            <BillingAutomator />
            {/* Floating Sidebar */}
            <div className="hidden md:block print:hidden">
                <Sidebar
                    isCollapsed={isCollapsed}
                    toggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    currentOrgId={currentOrgId}
                    isSuperAdmin={isSuperAdmin}
                />
            </div>

            {/* Main Content Area */}
            <main
                className={cn(
                    "transition-all duration-300 ease-in-out min-h-screen flex flex-col print:pl-0 print:p-0 pl-0",
                    isCollapsed ? "md:pl-[120px]" : "md:pl-[330px]" // 20px margin + width + gap
                )}
            >
                <div className="print:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
                    <Header currentOrgId={currentOrgId} />
                </div>
                <div className="p-6 print:p-0">
                    {children}
                </div>
            </main>
        </div>
    )
}
