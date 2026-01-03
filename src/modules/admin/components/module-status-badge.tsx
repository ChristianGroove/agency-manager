
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, Hammer, XCircle } from "lucide-react"

interface ModuleStatusBadgeProps {
    status: 'active' | 'beta' | 'maintenance' | 'deprecated' | string
}

export function ModuleStatusBadge({ status }: ModuleStatusBadgeProps) {
    const statusMap: Record<string, any> = {
        active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
        beta: { label: 'Beta', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Hammer },
        maintenance: { label: 'Mantenimiento', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
        deprecated: { label: 'Obsoleto', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle }
    }

    const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle }
    const Icon = config.icon

    return (
        <Badge variant="outline" className={`${config.color} gap-1.5`}>
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    )
}
