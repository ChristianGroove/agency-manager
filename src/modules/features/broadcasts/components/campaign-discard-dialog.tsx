'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export function CampaignDiscardDialog({ open, onCancel, onDiscard, message = 'Tienes cambios sin guardar. Si sales ahora, se conservará la última versión guardada.' }: { open: boolean; onCancel: () => void; onDiscard: () => void; message?: string }) {
    return <AlertDialog open={open} onOpenChange={value => { if (!value) onCancel() }}>
        <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader><AlertDialogTitle>¿Descartar los cambios?</AlertDialogTitle><AlertDialogDescription>{message}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel onClick={onCancel}>Seguir editando</AlertDialogCancel><AlertDialogAction onClick={onDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Descartar cambios</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
}
