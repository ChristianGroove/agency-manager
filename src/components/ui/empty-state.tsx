
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    title: string
    description: string
    icon?: LucideIcon
    action?: React.ReactNode
    className?: string
}

export function EmptyState({
    title,
    description,
    icon: Icon,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50",
                className
            )}
        >
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                {Icon && (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-10 w-10 text-muted-foreground" />
                    </div>
                )}
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    {description}
                </p>
                {action && action}
            </div>
        </div>
    )
}
