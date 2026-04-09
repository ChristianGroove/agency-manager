"use client"

import { BookOpen, Sparkles, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateHelpCardProps {
    title: string
    description: string
    articleId?: string
    actionLabel?: string
    onAction?: () => void
    onLearnMore?: (articleId: string) => void
    variant?: "default" | "compact"
    className?: string
}

/**
 * EmptyStateHelpCard - Displays contextual help when a list/view has no data.
 * 
 * @example
 * <EmptyStateHelpCard 
 *   title="No tienes cotizaciones aún"
 *   description="Las cotizaciones te ayudan a cerrar ventas más rápido."
 *   articleId="quote-creation"
 *   actionLabel="Crear Mi Primera Cotización"
 *   onAction={() => router.push('/quotes/new')}
 *   onLearnMore={(id) => openHelpArticle(id)}
 * />
 */
export function EmptyStateHelpCard({
    title,
    description,
    articleId,
    actionLabel,
    onAction,
    onLearnMore,
    variant = "default",
    className
}: EmptyStateHelpCardProps) {
    const isCompact = variant === "compact"

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800",
            "bg-gradient-to-br from-white via-zinc-50/50 to-indigo-50/30",
            "dark:from-zinc-900 dark:via-zinc-900/50 dark:to-indigo-950/20",
            isCompact ? "p-6" : "p-8 md:p-12",
            className
        )}>
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <Sparkles className={cn(isCompact ? "h-32 w-32" : "h-48 w-48")} />
            </div>

            <div className="relative z-10 max-w-lg mx-auto text-center">
                {/* Icon */}
                <div className={cn(
                    "mx-auto rounded-2xl bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6",
                    isCompact ? "h-12 w-12" : "h-16 w-16"
                )}>
                    <BookOpen className={cn(isCompact ? "h-6 w-6" : "h-8 w-8")} />
                </div>

                {/* Title */}
                <h3 className={cn(
                    "font-bold text-zinc-900 dark:text-white mb-3",
                    isCompact ? "text-lg" : "text-xl md:text-2xl"
                )}>
                    {title}
                </h3>

                {/* Description */}
                <p className={cn(
                    "text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed",
                    isCompact ? "text-sm" : "text-base"
                )}>
                    {description}
                </p>

                {/* Actions */}
                <div className={cn(
                    "flex items-center justify-center gap-4",
                    isCompact ? "flex-col sm:flex-row" : "flex-row"
                )}>
                    {actionLabel && onAction && (
                        <button
                            onClick={onAction}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl",
                                "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900",
                                isCompact ? "px-5 py-2.5 text-sm" : "px-6 py-3 text-base"
                            )}
                        >
                            {actionLabel}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}

                    {articleId && onLearnMore && (
                        <button
                            onClick={() => onLearnMore(articleId)}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-xl font-medium transition-all",
                                "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white",
                                "border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600",
                                "bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800",
                                isCompact ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-base"
                            )}
                        >
                            <Sparkles className="h-4 w-4" />
                            Aprender Más
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
