"use client"

import { useEffect, useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/layout/sidebar"

export function MobileSidebar() {
    const [isMounted, setIsMounted] = useState(false)
    const [currentOrgId, setCurrentOrgId] = useState<string>('')

    useEffect(() => {
        setIsMounted(true)
        // Get current org from cookie
        const cookies = document.cookie.split(';')
        const orgCookie = cookies.find(c => c.trim().startsWith('pixy_org_id='))
        if (orgCookie) {
            setCurrentOrgId(orgCookie.split('=')[1])
        }
    }, [])

    if (!isMounted) {
        return null
    }

    return (
        <Sheet>
            <SheetTrigger className="md:hidden pr-4 hover:opacity-75 transition">
                <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-brand-dark text-white border-r border-white/10 w-72">
                <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                <SidebarContent currentOrgId={currentOrgId} />
            </SheetContent>
        </Sheet>
    )
}
