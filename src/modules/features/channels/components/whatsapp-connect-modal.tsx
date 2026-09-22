"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { MetaEmbeddedSignup } from "./meta-embedded-signup"
import { MessageCircle, BadgeCheck, Smartphone } from "lucide-react"
import { useTranslation } from "@/modules/core/i18n/use-translation"

interface WhatsAppConnectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId?: string | null
}

export function WhatsAppConnectModal({ open, onOpenChange, organizationId }: WhatsAppConnectModalProps) {
    const { t } = useTranslation()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 gap-0 border-none shadow-2xl bg-white dark:bg-zinc-950 overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">

                {/* Clean, Minimal Header */}
                <div className="px-8 pt-8 pb-2">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                            {t('meta.connect_modal.title')}
                        </DialogTitle>
                        <DialogDescription className="text-base text-zinc-500 dark:text-zinc-400 mt-2">
                            {t('meta.connect_modal.description')}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 pt-6">
                    <div className="relative group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 flex flex-col h-full hover:border-[#25D366]/30 hover:shadow-lg hover:shadow-[#25D366]/5 transition-all">
                        <div className="absolute top-4 right-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                                <BadgeCheck className="w-3 h-3" />
                                {t('meta.connect_modal.embedded.recommended')}
                            </span>
                        </div>

                        <div className="mb-5 flex-shrink-0 w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center border border-zinc-100 dark:border-zinc-700">
                            <MessageCircle className="w-7 h-7 text-[#25D366]" />
                        </div>

                        <div className="flex-1 mb-6">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg mb-2">
                                {t('meta.connect_modal.embedded.title')}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                {t('meta.connect_modal.embedded.description')}
                                <span className="block mt-2 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1.5 bg-white dark:bg-zinc-800/50 w-fit px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-800">
                                    <Smartphone className="w-3.5 h-3.5" />
                                    {t('meta.connect_modal.embedded.mobile_compatible')}
                                </span>
                            </p>
                        </div>

                        {/* The Embedded Signup Button is rendered here directly */}
                        <div className="w-full mt-auto">
                            <MetaEmbeddedSignup
                                onSuccess={() => onOpenChange(false)}
                                onError={(error) => console.error('[WhatsAppModal]', error)}
                                organizationId={organizationId}
                            />
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
}
