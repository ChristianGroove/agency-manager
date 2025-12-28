"use client"

import { MobileSidebar } from "./mobile-sidebar"
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
import { logout } from "@/app/actions/logout"

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
        <div className="flex items-center px-4 border-b h-full bg-white/80 backdrop-blur-sm relative z-50">
            <MobileSidebar />

            <div className="flex-1 w-full mx-6 overflow-hidden h-16 relative">
                {showMarquee && <ToolsMarquee />}
            </div>

            <div className="flex items-center gap-x-4 shrink-0 z-20 bg-white/50 px-2 rounded-full backdrop-blur-sm">

                {/* Organization Switcher */}
                {currentOrgId && (
                    <div className="hidden md:block">
                        <OrganizationSwitcher />
                    </div>
                )}

                <NotificationBell key={currentOrgId} />

                {/* User Nav */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Avatar className="h-9 w-9 cursor-pointer hover:scale-105 transition-transform border border-white shadow-sm" suppressHydrationWarning>
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || "Usuario"}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Mi Perfil</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Profile Sheet */}
                <ProfileSheet open={isProfileOpen} onOpenChange={setIsProfileOpen} user={user} />
            </div>
        </div>
    )
}
