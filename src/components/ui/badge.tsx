import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/modules/infrastructure/utils/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "bg-primary/10 text-primary hover:bg-primary/20 border border-transparent",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/80 border border-transparent",
                outline: "text-foreground border border-border",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
