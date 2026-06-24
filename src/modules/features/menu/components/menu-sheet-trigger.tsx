"use client"

import React, { useState } from "react"
import { MenuSheet } from "./menu-sheet"
import { RestoMenuItem } from "@/types"

interface MenuSheetTriggerProps {
    orgId: string
    item?: RestoMenuItem
    children: React.ReactNode
}

export function MenuSheetTrigger({ orgId, item, children }: MenuSheetTriggerProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
                {children}
            </div>
            <MenuSheet
                open={open}
                onOpenChange={setOpen}
                itemToEdit={item}
            />
        </>
    )
}
