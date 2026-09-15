
"use client"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"

export interface QuickActionProps {
    title: string
    icon: any
    colorClass: string // e.g. "text-brand-cyan", "bg-brand-cyan/10"
    onClick?: () => void
}

export function QuickAction({ title, icon: Icon, colorClass, onClick }: QuickActionProps) {
    return (
        <div onClick={onClick}>
            <motion.div whileHover="hover" initial="rest" className="h-full">
                <Card className="glass-card h-full group hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1">
                    <CardHeader className="px-4 py-3">
                        <CardTitle className="text-sm flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
                            <div className={`p-2 rounded-lg transition-colors ${colorClass}`}>
                                <motion.div variants={{ hover: { scale: 1.2, rotate: 10 }, rest: { scale: 1, rotate: 0 } }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                                    <Icon className="h-4 w-4 transform transition-transform" />
                                </motion.div>
                            </div>
                            <span className="group-hover:text-primary dark:group-hover:text-white transition-colors">{title}</span>
                        </CardTitle>
                    </CardHeader>
                </Card>
            </motion.div>
        </div>
    )
}
