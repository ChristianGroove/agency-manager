"use client"

import { useEffect, useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/layout/sidebar"

import { usePathname } from "next/navigation"
import { User } from "@supabase/supabase-js"

interface MobileSidebarProps {
    currentOrgId: string | null
    isSuperAdmin?: boolean
    user?: User
    prefetchedModules?: string[]
}

import { useTranslation } from "@/lib/i18n/use-translation"

export function MobileSidebar({ currentOrgId, isSuperAdmin, user, prefetchedModules }: MobileSidebarProps) {
    const { t } = useTranslation()
    const [isMounted, setIsMounted] = useState(false)
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    // Auto-close on route change
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return null
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button className="md:hidden pr-4 hover:opacity-100 transition-opacity active:scale-95 duration-200 outline-none">
                    <div className="p-2 rounded-xl bg-white/5 border border-black/5 dark:border-white/10 shadow-sm backdrop-blur-md">
                        <Menu className="w-5 h-5 text-gray-700 dark:text-white" />
                    </div>
                </button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="p-0 border-r border-gray-200 dark:border-white/10 w-[280px] bg-white/90 dark:bg-brand-dark/95 backdrop-blur-xl shadow-2xl transition-all duration-500 ease-out"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-brand-pink/5 via-transparent to-transparent pointer-events-none opacity-50 dark:opacity-100" />
                <SheetTitle className="sr-only">{t('sidebar.mobile_menu_title')}</SheetTitle>
                <SidebarContent
                    currentOrgId={currentOrgId}
                    isSuperAdmin={isSuperAdmin}
                    prefetchedModules={prefetchedModules}
                />
            </SheetContent>
        </Sheet>
    )
}
