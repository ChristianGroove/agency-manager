"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { JobForm } from "./job-form"

import { useTranslation } from "@/lib/i18n/use-translation"

export interface NewJobModalProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function NewJobModal({ open: externalOpen, onOpenChange: externalOnOpenChange, trigger }: NewJobModalProps) {
    const { t: originalT } = useTranslation()
    const t = (key: any) => originalT(key)
    const [internalOpen, setInternalOpen] = useState(false)

    const isControlled = externalOpen !== undefined
    const open = isControlled ? externalOpen : internalOpen
    const onOpenChange = isControlled ? externalOnOpenChange : setInternalOpen

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger ? (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            ) : (
                !isControlled && (
                    <DialogTrigger asChild>
                        <Button>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {t('operations.new_job')}
                        </Button>
                    </DialogTrigger>
                )
            )}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('operations.schedule_cleaning')}</DialogTitle>
                    <DialogDescription>
                        {t('operations.schedule_desc')}
                    </DialogDescription>
                </DialogHeader>

                <JobForm
                    onSuccess={() => {
                        onOpenChange && onOpenChange(false)
                        window.location.reload()
                    }}
                    onCancel={() => onOpenChange && onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
