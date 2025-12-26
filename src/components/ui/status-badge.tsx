
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
    resolveDocumentState,
    resolveServiceState,
    resolveCycleState
} from "@/domain/state"

type StatusType = 'service' | 'invoice' | 'cycle' | 'quote'

interface StatusBadgeProps {
    status: string
    type: StatusType
    className?: string
    entity?: any // Optional entity to perform advanced state resolution
}

export function StatusBadge({ status, type, className, entity }: StatusBadgeProps) {

    let label = status
    let colorClass = "bg-gray-100 text-gray-700"

    // 1. INVOICE
    if (type === 'invoice') {
        const docInput = entity || { status }
        const state = resolveDocumentState(docInput)
        label = state.label
        colorClass = state.color
    }
    // 2. SERVICE
    else if (type === 'service') {
        const serviceInput = entity || { status }
        const state = resolveServiceState(serviceInput)
        label = state.label
        colorClass = state.color
    }
    // 3. CYCLE
    else if (type === 'cycle') {
        const cycleInput = entity || { status }
        const state = resolveCycleState(cycleInput)
        label = state.label
        colorClass = state.color
    }
    // 4. FALLBACK / QUOTE 
    else {
        // Simple fallback for now
        if (status === 'draft') {
            label = 'Borrador'
            colorClass = "bg-slate-100 text-slate-600 border-slate-200"
        } else if (status === 'sent' || status === 'active') {
            label = 'Enviada'
            colorClass = "bg-blue-50 text-blue-700 border-blue-200"
        } else if (status === 'accepted') {
            label = 'Aceptada'
            colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200"
        }
    }

    return (
        <Badge
            variant="outline"
            className={cn("px-2 py-0.5 text-xs font-medium border-0", colorClass, className)}
        >
            {label}
        </Badge>
    )
}
