

"use client"

import { MobileSidebar } from "./mobile-sidebar"
import { NotificationBell } from "./notification-bell"
import { ToolsMarquee } from "@/components/ui/tools-marquee"
import { useEffect, useState } from "react"

export function Header({ currentOrgId }: { currentOrgId: string | null }) {
    const [showMarquee, setShowMarquee] = useState(true)

    useEffect(() => {
        // Initial check
        const stored = localStorage.getItem("ui_settings_tools_marquee")
        if (stored !== null) {
            setShowMarquee(stored === "true")
        }

        // Listen for changes from Settings page
        const handleSettingsChange = () => {
            const updated = localStorage.getItem("ui_settings_tools_marquee")
            if (updated !== null) {
                setShowMarquee(updated === "true")
            }
        }

        window.addEventListener("ui-settings-changed", handleSettingsChange)
        return () => window.removeEventListener("ui-settings-changed", handleSettingsChange)
    }, [])

    return (
        <div className="flex items-center px-4 border-b h-full bg-white/80 backdrop-blur-sm relative z-50">
            <MobileSidebar />

            <div className="flex-1 w-full mx-6 overflow-hidden h-16 relative">
                {showMarquee && <ToolsMarquee />}
            </div>

            <div className="flex items-center gap-x-6 shrink-0 z-20 bg-white/50 px-2 rounded-full backdrop-blur-sm">
                <NotificationBell key={currentOrgId} />
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white cursor-pointer hover:scale-105 transition-transform">
                    A
                </div>
            </div>
        </div>
    )
}
