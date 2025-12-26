
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
    normalizeServiceStatus,
    normalizeCycleStatus,
    STATUS_LABELS,
    STATUS_COLORS
} from "@/lib/domain-logic"
// New Domain Import
import { resolveDocumentState } from "@/domain/state/document"
import { resolveServiceState } from "@/lib/state-engine/service"
import { resolveCycleStatus } from "@/lib/state-engine/cycle"

type StatusType = 'service' | 'invoice' | 'cycle' | 'quote'

interface StatusBadgeProps {
    status: string
    type: StatusType
    className?: string
    entity?: any // Optional entity to perform advanced state resolution (e.g., checking due dates)
}

export function StatusBadge({ status, type, className, entity }: StatusBadgeProps) {
    // Default Logic (Service/Cycle still legacy/mixed)
    let label = STATUS_LABELS[status.toLowerCase()] || status
    let colorClass = STATUS_COLORS[status.toLowerCase()] || "bg-gray-100 text-gray-700"

    // INVOICE: Use new Pure Domain
    if (type === 'invoice') {
        // If we have an entity, use the full resolver
        // If not, we construct a partial object with just status
        const docInput = entity || { status }
        const state = resolveDocumentState(docInput)

        return (
            <Badge
                variant="outline"
                className={cn("px-2 py-0.5 text-xs font-medium border-0", state.color, className)}
            >
                {state.label}
            </Badge>
        )
    }

    // OTHER TYPES (Service/Cycle) - Keep existing logic for now
    let normalizedStatus = status.toLowerCase()

    if (type === 'service') {
        if (entity) {
            normalizedStatus = resolveServiceState(entity)
        } else {
            normalizedStatus = normalizeServiceStatus(status)
        }
    } else if (type === 'cycle') {
        if (entity) {
            normalizedStatus = resolveCycleStatus(entity)
        } else {
            normalizedStatus = normalizeCycleStatus(status)
        }
    }

    // Re-calc for non-invoice types
    label = STATUS_LABELS[normalizedStatus] || status
    colorClass = STATUS_COLORS[normalizedStatus] || "bg-gray-100 text-gray-700"

    return (
        <Badge
            variant="outline"
            className={cn("px-2 py-0.5 text-xs font-medium border-0", colorClass, className)}
        >
            {label}
        </Badge>
    )
}
