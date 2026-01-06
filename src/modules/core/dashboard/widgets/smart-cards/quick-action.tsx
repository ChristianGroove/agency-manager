
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
    // Extract color base loosely to apply hover states logic or just rely on passed utility classes?
    // Current design relies on specific group-hover combinations. 
    // To make it truly universal we might need to be smarter about colors or accept a "theme" prop.
    // For now, I will use a simple mapping or accept granular classes if needed. 
    // Actually, looking at the code, it uses specific tailwind colors like "group-hover:text-white" which works generally.
    // But the background color (bg-indigo-600) needs to be dynamic. 
    // Let's stick to the current structure for surgical precision.

    // Better approach: Pass the full className for the icon container styling to allow full control.

    return (
        <div onClick={onClick}>
            <motion.div whileHover="hover" initial="rest" className="h-full">
                <Card className="h-full group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 hover:-translate-y-1 rounded-[30px]">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-3 text-gray-700 dark:text-gray-200">
                            {/* The icon container needs dynamic coloring. We accept it as a prop or render prop? 
                                Let's assume the user passes a fully styled icon node for maximum flexibility or we standardise.
                            */}
                            <div className={`p-2.5 rounded-lg transition-colors ${colorClass}`}>
                                <motion.div variants={{ hover: { scale: 1.2, rotate: 10 }, rest: { scale: 1, rotate: 0 } }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                                    <Icon className="h-5 w-5 transform transition-transform" />
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
