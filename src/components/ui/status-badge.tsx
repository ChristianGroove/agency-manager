
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
    normalizeInvoiceStatus,
    normalizeServiceStatus,
    normalizeCycleStatus,
    STATUS_LABELS,
    STATUS_COLORS
} from "@/lib/domain-logic"

type StatusType = 'service' | 'invoice' | 'cycle' | 'quote'

interface StatusBadgeProps {
    status: string
    type: StatusType
    className?: string
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
    let normalizedStatus = status.toLowerCase()

    // Normalize based on type
    if (type === 'invoice') {
        normalizedStatus = normalizeInvoiceStatus(status)
    } else if (type === 'service') {
        normalizedStatus = normalizeServiceStatus(status)
    } else if (type === 'cycle') {
        normalizedStatus = normalizeCycleStatus(status)
    }

    const label = STATUS_LABELS[normalizedStatus] || status
    const colorClass = STATUS_COLORS[normalizedStatus] || "bg-gray-100 text-gray-700"

    return (
        <Badge
            variant="outline"
            className={cn("px-2 py-0.5 text-xs font-medium border-0", colorClass, className)}
        >
            {label}
        </Badge>
    )
}
