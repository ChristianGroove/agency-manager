import { LucideIcon } from "lucide-react"
import { SplitText } from "@/components/ui/split-text"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
    title: string
    subtitle?: string
    icon?: LucideIcon
    /**
     * Optional custom icon className.
     * Defaults to "text-[var(--brand-pink)]"
     */
    iconClassName?: string
    action?: React.ReactNode
    className?: string
    titleClassName?: string
}

export function SectionHeader({
    title,
    subtitle,
    icon: Icon,
    iconClassName,
    action,
    className,
    titleClassName
}: SectionHeaderProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4", className)}>
            <div>
                <h2 className={cn("font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3", titleClassName || "text-3xl")}>
                    {Icon && <Icon className={cn("h-8 w-8", iconClassName || "text-[var(--brand-pink)]")} />}
                    <SplitText>{title}</SplitText>
                </h2>
                {subtitle && (
                    <p className="text-muted-foreground mt-1">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && (
                <div className="flex-shrink-0">
                    {action}
                </div>
            )}
        </div>
    )
}
