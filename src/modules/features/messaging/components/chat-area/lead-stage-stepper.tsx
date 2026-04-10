"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import * as Popover from "@radix-ui/react-popover"
import { useInboxContext } from "../../context/inbox-context"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { cn } from "@/modules/infrastructure/utils/utils"
import { ChevronDown, Check, Loader2 } from "lucide-react"
import { updateLeadStatus } from "@/modules/features/crm/services/logic/leads-actions"
import { toast } from "sonner"

interface LeadStageStepperProps {
    leadId?: string
    leadStatus?: string | null
    onStageChanged?: (newStageId: string) => void
}

export function LeadStageStepper({ leadId, leadStatus, onStageChanged }: LeadStageStepperProps) {
    const { pipelineStages } = useInboxContext()
    const [isOpen, setIsOpen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    // Current stage object - Find by status_key (Standard source of truth)
    const currentStage = useMemo(() => 
        pipelineStages.find(s => s.status_key === leadStatus) || 
        pipelineStages[0], 
    [pipelineStages, leadStatus])

    const handleStageClick = async (stage: any) => {
        if (!leadId || stage.status_key === leadStatus || isUpdating) return

        setIsUpdating(true)
        try {
            const res = await updateLeadStatus(leadId, stage.status_key)
            if (res.success) {
                toast.success(`Lead movido a: ${stage.name}`)
                onStageChanged?.(stage.id)
                setIsOpen(false)
            } else {
                toast.error(res.error || "Error al mover lead")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setIsUpdating(false)
        }
    }

    if (pipelineStages.length === 0) return null

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            {/* 1. Trigger Tag */}
            <Popover.Trigger asChild>
                <button
                    className={cn(
                        "rounded-full shadow-sm border h-7 text-[11px] font-bold px-4 transition-all flex items-center gap-2 outline-none focus-visible:ring-1 focus-visible:ring-brand-pink",
                        isOpen 
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 transform scale-105" 
                            : "bg-white/90 dark:bg-zinc-900/90 text-muted-foreground hover:bg-white dark:hover:bg-zinc-800 backdrop-blur-md border-zinc-200 dark:border-zinc-800"
                    )}
                >
                    <div className={cn("h-2 w-2 rounded-full", currentStage?.color || "bg-zinc-400")} />
                    <span className="uppercase tracking-wider">
                        {currentStage?.name || "Sin Etapa"}
                    </span>
                    <ChevronDown className={cn("h-3 w-3 opacity-50 transition-transform duration-300", isOpen && "rotate-180")} />
                    {isUpdating && <Loader2 className="h-2.5 w-2.5 animate-spin text-brand-pink" />}
                </button>
            </Popover.Trigger>

            {/* 2. Dropdown Panel (Using Radix Portal for absolute reliability) */}
            <Popover.Portal>
                <AnimatePresence>
                    {isOpen && (
                        <Popover.Content
                            forceMount
                            side="bottom"
                            align="center"
                            sideOffset={8}
                            className="z-[9999] outline-none"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                className="min-w-[280px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2 select-none"
                            >
                                <div className="px-2 py-1.5 mb-1">
                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pipeline del Lead</h4>
                                </div>

                                <div className="space-y-1">
                                    {pipelineStages.map((stage, idx) => {
                                        const isCurrent = stage.status_key === leadStatus
                                        return (
                                            <button
                                                key={stage.id}
                                                disabled={isUpdating}
                                                onClick={() => handleStageClick(stage)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-2.5 rounded-xl transition-all relative group overflow-hidden",
                                                    isCurrent 
                                                        ? "bg-zinc-50 dark:bg-zinc-800/50" 
                                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 z-10">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                                                        stage.color || "bg-zinc-200"
                                                    )}>
                                                        <span className="text-[10px] font-bold text-white opacity-80">{idx + 1}</span>
                                                    </div>
                                                    <div className="flex flex-col items-start translate-y-[1px]">
                                                        <span className={cn(
                                                            "text-xs font-semibold leading-none",
                                                            isCurrent ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                                        )}>
                                                            {stage.name}
                                                        </span>
                                                        <span className="text-[9px] text-muted-foreground/50 font-mono mt-1 uppercase tracking-tighter">
                                                            {stage.status_key}
                                                        </span>
                                                    </div>
                                                </div>

                                                {isCurrent && (
                                                    <motion.div layoutId="active-indicator" className="z-10">
                                                        <Check className="h-4 w-4 text-brand-pink" />
                                                    </motion.div>
                                                )}

                                                {/* Subtle gradient hover effect */}
                                                {!isCurrent && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-brand-pink/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        </Popover.Content>
                    )}
                </AnimatePresence>
            </Popover.Portal>
        </Popover.Root>
    )
}
