"use client"

import { useState } from "react"
import { HelpCircle, X, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface ContextualTooltipProps {
    content: string
    articleId?: string
    onLearnMore?: (articleId: string) => void
    position?: "top" | "bottom" | "left" | "right"
    className?: string
    children?: React.ReactNode
}

/**
 * ContextualTooltip - Inline help icon that shows a tooltip with contextual information.
 * 
 * @example
 * <div className="flex items-center gap-2">
 *   <Label>Nombre del Pipeline</Label>
 *   <ContextualTooltip 
 *     content="El nombre interno del pipeline. Solo tú y tu equipo lo verán."
 *     articleId="crm-pipeline"
 *   />
 * </div>
 */
export function ContextualTooltip({
    content,
    articleId,
    onLearnMore,
    position = "top",
    className,
    children
}: ContextualTooltipProps) {
    const [isOpen, setIsOpen] = useState(false)

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2"
    }

    const arrowClasses = {
        top: "top-full left-1/2 -translate-x-1/2 border-t-zinc-800 dark:border-t-zinc-100 border-l-transparent border-r-transparent border-b-transparent",
        bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-zinc-800 dark:border-b-zinc-100 border-l-transparent border-r-transparent border-t-transparent",
        left: "left-full top-1/2 -translate-y-1/2 border-l-zinc-800 dark:border-l-zinc-100 border-t-transparent border-b-transparent border-r-transparent",
        right: "right-full top-1/2 -translate-y-1/2 border-r-zinc-800 dark:border-r-zinc-100 border-t-transparent border-b-transparent border-l-transparent"
    }

    return (
        <div className={cn("relative inline-flex", className)}>
            {children || (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => setIsOpen(false)}
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <HelpCircle className="h-4 w-4" />
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            "absolute z-50 w-64 p-4 rounded-xl shadow-xl",
                            "bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900",
                            positionClasses[position]
                        )}
                    >
                        {/* Arrow */}
                        <div className={cn(
                            "absolute w-0 h-0 border-4",
                            arrowClasses[position]
                        )} />

                        {/* Content */}
                        <p className="text-sm leading-relaxed">
                            {content}
                        </p>

                        {/* Learn More Link */}
                        {articleId && onLearnMore && (
                            <button
                                onClick={() => {
                                    onLearnMore(articleId)
                                    setIsOpen(false)
                                }}
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 dark:text-indigo-600 hover:text-indigo-200 dark:hover:text-indigo-700 transition-colors"
                            >
                                Saber más
                                <ExternalLink className="h-3 w-3" />
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/**
 * InlineTooltip - A simpler version that wraps any element with tooltip behavior.
 */
export function InlineTooltip({
    content,
    children,
    className
}: {
    content: string
    children: React.ReactNode
    className?: string
}) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div
            className={cn("relative inline-flex", className)}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {children}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs whitespace-nowrap shadow-lg z-50"
                    >
                        {content}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-t-zinc-800 dark:border-t-zinc-100 border-l-transparent border-r-transparent border-b-transparent" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
