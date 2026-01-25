"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { BrandCenter } from "./brand-center"
import { BrandingConfig } from "@/types/branding"
import { useTranslation } from "@/lib/i18n/use-translation"

interface BrandCenterSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    settings: BrandingConfig
    tierFeatures: Record<string, any>
}

export function BrandCenterSheet({ open, onOpenChange, settings, tierFeatures }: BrandCenterSheetProps) {
    const { t } = useTranslation()
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-white/95 backdrop-blur-xl
                "
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>{t('branding.title' as any)}</SheetTitle>
                    <SheetDescription>{t('branding.description' as any)}</SheetDescription>
                </SheetHeader>

                <BrandCenter
                    initialSettings={settings}
                    tierFeatures={tierFeatures}
                    variant="sheet"
                />
            </SheetContent>
        </Sheet>
    )
}

