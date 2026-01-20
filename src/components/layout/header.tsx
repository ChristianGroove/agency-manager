"use client"

// import { MobileSidebar } from "./mobile-sidebar"
import { NotificationBell } from "./notification-bell"
import { ToolsMarquee } from "@/components/ui/tools-marquee"
import { useEffect, useState } from "react"
import { OrganizationSwitcher } from "@/components/organizations/organization-switcher"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Settings } from "lucide-react"
import { ProfileSheet } from "@/components/account/profile-sheet"
import { createBrowserClient } from "@supabase/ssr"
import { logout } from "@/modules/core/auth/actions"

export function Header({ currentOrgId }: { currentOrgId: string | null }) {
    const [showMarquee, setShowMarquee] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

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

    // Fetch User for Avatar
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()
    }, [])

    const handleLogout = async () => {
        await logout()
    }

    const initials = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
        : user?.email?.slice(0, 2).toUpperCase() || "U"

    return (
        <div className="flex items-center px-4 border-b h-full bg-white/80 dark:bg-transparent dark:border-white/10 backdrop-blur-sm relative z-50 transition-colors duration-300">
            {/* MobileSidebar removed - moved to DashboardShell */}

            <div className="flex-1 w-full mx-6 overflow-hidden h-16 relative">
                {showMarquee && <ToolsMarquee />}
            </div>

            <div className="flex items-center gap-x-4 shrink-0 z-20 bg-white/50 dark:bg-transparent px-2 rounded-full backdrop-blur-sm">

                {/* Organization Switcher */}
                {currentOrgId && (
                    <div className="hidden md:block">
                        <OrganizationSwitcher />
                    </div>
                )}

                <NotificationBell key={currentOrgId} />

                {/* User Nav - Direct Profile Access */}
                <div onClick={() => setIsProfileOpen(true)} className="cursor-pointer group">
                    {/* Tooltip or simple hover effect could be added here if needed */}
                    <Avatar className="h-9 w-9 border border-white shadow-sm group-hover:scale-105 transition-transform group-active:scale-95" suppressHydrationWarning>
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Profile Sheet */}
                <ProfileSheet open={isProfileOpen} onOpenChange={setIsProfileOpen} user={user} />
            </div>
        </div>
    )
}
