"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { JobForm } from "../job-form"
import { Plus } from "lucide-react"

import { useTranslation } from "@/lib/i18n/use-translation"

export function CreateWorkOrderSheet({ children }: { children: React.ReactNode }) {
    const { t: originalT } = useTranslation()
    const t = (key: any) => originalT(key)
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>{t('operations.schedule_cleaning')}</SheetTitle>
                    <SheetDescription>
                        {t('operations.schedule_desc')}
                    </SheetDescription>
                </SheetHeader>
                <JobForm
                    onSuccess={() => {
                        setOpen(false)
                        // Optional: trigger refresh if needed, but actions usually revalidatePath
                    }}
                    onCancel={() => setOpen(false)}
                />
            </SheetContent>
        </Sheet>
    )
}
