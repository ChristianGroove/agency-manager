"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"

import { BillingAutomator } from "@/components/modules/billing/billing-automator"

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <div className="h-full relative bg-gray-50/50 min-h-screen">
            <BillingAutomator />
            {/* Floating Sidebar */}
            <div className="hidden md:block print:hidden">
                <Sidebar
                    isCollapsed={isCollapsed}
                    toggleCollapse={() => setIsCollapsed(!isCollapsed)}
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
                    <Header />
                </div>
                <div className="p-6 print:p-0">
                    {children}
                </div>
            </main>
        </div>
    )
}
