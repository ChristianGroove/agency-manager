"use client"

import { useState, useEffect } from "react"
import { Check, Circle, Sparkles, X, ChevronRight, Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface OnboardingStep {
    id: string
    title: string
    description: string
    completed: boolean
    action?: () => void
    actionLabel?: string
}

interface OnboardingChecklistProps {
    steps: OnboardingStep[]
    onStepComplete?: (stepId: string) => void
    onDismiss?: () => void
    title?: string
    completedMessage?: string
    className?: string
}

/**
 * OnboardingChecklist - Guides new users through essential setup steps.
 * 
 * @example
 * <OnboardingChecklist
 *   steps={[
 *     { id: 'profile', title: 'Completa tu perfil', completed: true },
 *     { id: 'logo', title: 'Sube tu logo', completed: false, action: () => openBranding() },
 *   ]}
 *   onDismiss={() => setShowChecklist(false)}
 * />
 */
export function OnboardingChecklist({
    steps,
    onStepComplete,
    onDismiss,
    title = "Primeros Pasos",
    completedMessage = "¡Felicidades! Has completado la configuración inicial.",
    className
}: OnboardingChecklistProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const completedCount = steps.filter(s => s.completed).length
    const progress = (completedCount / steps.length) * 100
    const allCompleted = completedCount === steps.length

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden",
                "bg-white dark:bg-zinc-900 shadow-lg",
                className
            )}
        >
            {/* Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        {allCompleted ? <Gift className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">
                            {allCompleted ? "¡Todo Listo!" : title}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {completedCount} de {steps.length} completados
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Progress Ring */}
                    <div className="relative h-8 w-8">
                        <svg className="transform -rotate-90 h-8 w-8">
                            <circle
                                cx="16" cy="16" r="12"
                                fill="none"
                                strokeWidth="3"
                                className="stroke-zinc-200 dark:stroke-zinc-700"
                            />
                            <circle
                                cx="16" cy="16" r="12"
                                fill="none"
                                strokeWidth="3"
                                strokeDasharray={75.4}
                                strokeDashoffset={75.4 - (75.4 * progress / 100)}
                                className="stroke-indigo-500 transition-all duration-500"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                            {Math.round(progress)}%
                        </span>
                    </div>

                    {onDismiss && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Steps List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-zinc-100 dark:border-zinc-800">
                            {allCompleted ? (
                                <div className="p-6 text-center">
                                    <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                        <Check className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{completedMessage}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {steps.map((step, index) => (
                                        <div
                                            key={step.id}
                                            className={cn(
                                                "flex items-center gap-4 p-4 transition-colors",
                                                step.completed ? "bg-zinc-50/50 dark:bg-zinc-800/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <div className={cn(
                                                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                                                step.completed
                                                    ? "bg-emerald-500 text-white"
                                                    : "border-2 border-zinc-300 dark:border-zinc-600"
                                            )}>
                                                {step.completed ? (
                                                    <Check className="h-3.5 w-3.5" />
                                                ) : (
                                                    <span className="text-xs font-medium text-zinc-400">{index + 1}</span>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "font-medium text-sm",
                                                    step.completed
                                                        ? "text-zinc-400 dark:text-zinc-500 line-through"
                                                        : "text-zinc-900 dark:text-white"
                                                )}>
                                                    {step.title}
                                                </p>
                                                {!step.completed && step.description && (
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                        {step.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action */}
                                            {!step.completed && step.action && (
                                                <button
                                                    onClick={step.action}
                                                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                                >
                                                    {step.actionLabel || "Completar"}
                                                    <ChevronRight className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
