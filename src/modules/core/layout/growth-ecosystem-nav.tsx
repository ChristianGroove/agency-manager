"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
    MessageSquare,
    Users,
    GitBranch,
    Target,
    Radio
} from "lucide-react"

const NAV_ITEMS = [
    {
        label: "Contactos",
        href: "/crm/contacts",
        icon: Users,
    },
    {
        label: "Pipeline",
        href: "/crm/pipeline",
        icon: Target,
    },
    {
        label: "Inbox",
        href: "/crm/inbox",
        icon: MessageSquare,
    },
    {
        label: "Broadcasts",
        href: "/crm/broadcasts",
        icon: Radio,
    },
    {
        label: "Automations",
        href: "/crm/automations",
        icon: GitBranch,
    },
]

export function GrowthEcosystemNav() {
    const pathname = usePathname()

    return (
        <nav className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg w-fit border border-border/40">
            {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href)

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="relative"
                    >
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                            isActive
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}>
                            {isActive && (
                                <motion.div
                                    layoutId="crm-nav-active"
                                    className="absolute inset-0 bg-background shadow-sm rounded-md border border-border/50"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    style={{ zIndex: 0 }}
                                />
                            )}
                            <item.icon className={cn(
                                "relative z-10 w-4 h-4",
                                isActive ? "text-primary" : ""
                            )} />
                            <span className="relative z-10">{item.label}</span>
                        </div>
                    </Link>
                )
            })}
        </nav>
    )
}
