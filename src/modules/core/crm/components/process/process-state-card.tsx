"use client"

import { useEffect, useState } from "react"
import { getProcessContextAction, transitionProcessAction } from "../../process-engine/actions"
import { ProcessInstance, ProcessState } from "@/types/process-engine"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, CheckCircle2, Circle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ProcessStateCardProps {
    leadId: string
    onUpdate?: () => void
}

export function ProcessStateCard({ leadId, onUpdate }: ProcessStateCardProps) {
    const [loading, setLoading] = useState(true)
    const [context, setContext] = useState<{ instance: ProcessInstance, state: ProcessState } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        loadContext()
    }, [leadId])

    async function loadContext() {
        setLoading(true)
        const res = await getProcessContextAction(leadId)
        if (res.success && res.data) {
            setContext(res.data)
            setError(null)
        } else {
            setContext(null)
            // Silence "No active process" error, just don't show card or show empty state
            if (res.error !== "No active process") {
                setError(res.error || "Failed to load process")
            }
        }
        setLoading(false)
    }

    async function handleTransition(actionKey: string, label: string) {
        if (!context) return

        // Optimistic UI? No, wait for strict engine validation.
        setActionLoading(actionKey)
        const res = await transitionProcessAction(leadId, actionKey)

        if (res.success) {
            toast.success(`Moved to: ${label}`)
            loadContext()
            onUpdate?.()
        } else {
            toast.error(res.error || "Transition failed")
        }
        setActionLoading(null)
    }

    if (loading) {
        return <Skeleton className="w-full h-32 rounded-xl" />
    }

    if (!context) {
        return null // Don't show if no active process (or show "Start Process" button?)
    }

    const { state, instance } = context
    const actions = state.suggested_actions || []

    // If no config actions, show allowed_next_states as generic buttons
    const displayActions = actions.length > 0
        ? actions
        : (state.allowed_next_states || []).map(next => ({
            label: `Move to ${next}`,
            action: next,
            type: 'secondary' as const
        }))

    return (
        <Card className="p-4 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-indigo-100 dark:border-indigo-500/20 shadow-sm relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <Circle className="w-24 h-24 text-indigo-600 fill-current" />
            </div>

            <div className="relative z-10 space-y-4">
                {/* Header: State & Status */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                            Current Step
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {state.name}
                            {instance.locked && <AlertCircle className="w-4 h-4 text-amber-500" />}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                            {state.metadata?.goal || state.description || "No specific goal defined."}
                        </p>
                    </div>
                    <div>
                        <Badge variant="secondary" className={cn(
                            "capitalize",
                            instance.status === 'active' ? "bg-green-100 text-green-700 dark:bg-green-900/30" : "bg-gray-100"
                        )}>
                            {instance.status}
                        </Badge>
                    </div>
                </div>

                {/* Next Actions */}
                {displayActions.length > 0 && (
                    <div className="pt-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Recommended Actions</div>
                        <div className="flex flex-wrap gap-2">
                            {displayActions.map((action, idx) => (
                                <Button
                                    key={idx}
                                    size="sm"
                                    variant={action.type === 'primary' ? 'default' : 'secondary'}
                                    className={cn(
                                        "shadow-sm transition-all",
                                        action.type === 'primary'
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                            : "bg-white hover:bg-gray-50 border border-gray-200 dark:bg-slate-800 dark:border-slate-700"
                                    )}
                                    onClick={() => handleTransition(action.action, action.label)}
                                    disabled={!!actionLoading || instance.locked}
                                >
                                    {actionLoading === action.action ? (
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
