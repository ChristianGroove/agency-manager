"use client"

import { cn } from "@/lib/utils"
import { Battery, Wifi, Signal } from "lucide-react"

interface MobilePreviewProps {
    children: React.ReactNode
    className?: string
}

export function MobilePreview({ children, className }: MobilePreviewProps) {
    return (
        <div className={cn("relative mx-auto border-gray-900 dark:border-gray-900 bg-gray-900 border-[10px] rounded-[2.5rem] h-[500px] w-[260px] shadow-xl overflow-hidden ring-[1px] ring-white/10 select-none", className)}>

            {/* Camera / Notch Area */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-gray-900 h-[18px] w-[100px] rounded-b-[12px] z-50 flex justify-center items-center pointer-events-none">
                <div className="h-1.5 w-10 bg-gray-800 rounded-full opacity-50"></div>
                <div className="absolute right-[-8px] top-[3px] h-2 w-2 bg-gray-900 rounded-full blur-[1px]"></div>
            </div>

            {/* Status Bar (Fake) */}
            <div className="absolute top-0 w-full h-8 px-5 flex justify-between items-center text-[9px] font-bold text-black z-40 pt-1 pointer-events-none mix-blend-difference invert filter brightness-200">
                <span>9:41</span>
                <div className="flex items-center space-x-1">
                    <Signal className="h-2.5 w-2.5" />
                    <Wifi className="h-2.5 w-2.5" />
                    <Battery className="h-2.5 w-2.5 border-black rounded-[2px]" />
                </div>
            </div>

            {/* Inner Screen */}
            <div className="h-full w-full bg-white dark:bg-zinc-950 overflow-hidden relative rounded-[1.8rem]">
                <div className="absolute inset-x-0 bottom-1 h-1 w-24 bg-black/20 dark:bg-white/20 rounded-full mx-auto z-50 pointer-events-none mix-blend-overlay"></div>

                {/* Scrollable Content Area */}
                <div className="h-full overflow-y-auto scrollbar-hide pt-8 pb-4">
                    <div className="min-h-full">
                        {children}
                    </div>
                </div>
            </div>

            {/* Glare Reflection (Subtle) */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none z-[60]"></div>
        </div>
    )
}
