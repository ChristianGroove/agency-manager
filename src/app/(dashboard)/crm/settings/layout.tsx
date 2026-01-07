"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
    GitBranch,
    MessageCircle,
    MessageSquare,
    FileText
} from "lucide-react"

interface SettingsLayoutProps {
    children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname()

    const items = [
        {
            title: "Pipelines",
            href: "/crm/settings",
            icon: GitBranch,
        },
        {
            title: "Channels",
            href: "/crm/settings/channels",
            icon: MessageSquare,
        },
        {
            title: "Message Templates",
            href: "/crm/settings/templates",
            icon: FileText,
        },
    ]

    return (
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 p-8">
            <aside className="-mx-4 lg:w-1/5">
                <div className="mb-4 px-4 text-lg font-medium">CRM Settings</div>
                <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                    {items.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                buttonVariants({ variant: "ghost" }),
                                pathname === item.href
                                    ? "bg-muted hover:bg-muted"
                                    : "hover:bg-transparent hover:underline",
                                "justify-start"
                            )}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.title}
                        </Link>
                    ))}
                </nav>
            </aside>
            <div className="flex-1 lg:max-w-4xl">{children}</div>
        </div>
    )
}
