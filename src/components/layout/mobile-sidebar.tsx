"use client"

import { useEffect, useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/layout/sidebar"

export function MobileSidebar() {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
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
                <SidebarContent />
            </SheetContent>
        </Sheet>
    )
}
