
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, AlertTriangle, Lightbulb, ArrowRight, X } from "lucide-react"
import { AnalysisRecommendation } from "@/modules/core/ai/analysis-service"
import { motion, AnimatePresence } from "framer-motion"

interface CopilotWidgetProps {
    recommendations: AnalysisRecommendation[]
    onAction: (rec: AnalysisRecommendation) => void
}

export function CopilotWidget({ recommendations, onAction }: CopilotWidgetProps) {
    const [isVisible, setIsVisible] = useState(true)
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

    // Filter out dismissed recommendations
    const activeRecs = recommendations.filter(rec => !dismissedIds.has(rec.id))

    if (!isVisible || activeRecs.length === 0) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed bottom-6 right-6 z-50 w-full max-w-sm"
            >
                <Card className="border-primary/20 bg-background/95 backdrop-blur-md shadow-2xl relative overflow-hidden">
                    {/* Magical Gradient Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                    <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                            <Sparkles className="h-4 w-4" />
                            Copilot Insights
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mr-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsVisible(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-3 pb-4">
                        {activeRecs.slice(0, 3).map((rec) => (
                            <div
                                key={rec.id}
                                className={`p-3 rounded-lg border text-sm flex gap-3 items-start transition-colors ${rec.type === 'warning'
                                        ? 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-900/50'
                                        : 'bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-900/50'
                                    }`}
                            >
                                <div className={`mt-0.5 shrink-0 ${rec.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                                    }`}>
                                    {rec.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <p className="leading-tight text-foreground/90">{rec.message}</p>
                                    {rec.action_label && (
                                        <button
                                            onClick={() => onAction(rec)}
                                            className="text-xs font-semibold flex items-center gap-1 hover:underline opacity-80 hover:opacity-100 transition-opacity"
                                            style={{ color: rec.type === 'warning' ? '#d97706' : '#2563eb' }}
                                        >
                                            {rec.action_label} <ArrowRight className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 -mt-1 -mr-1 text-muted-foreground/50 hover:text-foreground"
                                    onClick={() => setDismissedIds(prev => new Set(prev).add(rec.id))}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </motion.div>
        </AnimatePresence>
    )
}
