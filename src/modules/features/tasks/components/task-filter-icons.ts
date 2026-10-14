/**
 * Iconografía compartida para los filtros Spotlight del módulo de tareas
 * y sus portales (colaborador, soporte paralelo, canal de soporte, pacing).
 */
import {
    Ban,
    CheckCircle2,
    CircleDashed,
    Headset,
    Inbox,
    Layers,
    Loader,
    ScanSearch,
    Zap,
} from "lucide-react"

export const TASK_FILTER_ICONS = {
    all: Layers,
    backlog: Inbox,
    active: Zap,
    todo: CircleDashed,
    in_progress: Loader,
    in_review: ScanSearch,
    blocked: Ban,
    done: CheckCircle2,
    // Soporte
    received: Inbox,
    attending: Headset,
    resolved: CheckCircle2,
} as const
