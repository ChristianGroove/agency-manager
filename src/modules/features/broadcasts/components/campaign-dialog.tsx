'use client'

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/modules/infrastructure/utils/utils'

export { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

/** Campaign dialogs own their title/description; no duplicate generic accessible labels. */
export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(
    ({ className, children, ...props }, ref) => <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content ref={ref} className={cn('fixed left-1/2 top-1/2 z-50 grid max-h-[94dvh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl outline-none sm:p-6', className)} {...props}>
            {children}
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
)
DialogContent.displayName = 'CampaignDialogContent'
