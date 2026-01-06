"use client"

import React from "react"
import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

export function DroppableStage({ id, children }: { id: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id,
    })

    return (
        <div ref={setNodeRef} className={cn("flex-1 flex flex-col min-h-0 max-h-full transition-colors", isOver && "bg-slate-50/50 dark:bg-slate-900/20")}>
            {children}
        </div>
    )
}
