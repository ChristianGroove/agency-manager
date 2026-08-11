"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Link2, Copy, Check, Sparkles, Loader2 } from "lucide-react"
import { createInviteLink } from "@/modules/core/iam/actions/invitation-actions"

interface InviteGeneratorModalProps {
    apps?: Array<{ id: string; name: string }>
    triggerText?: string
    variant?: "default" | "outline" | "secondary"
}

export function InviteGeneratorModal({
    apps = [],
    triggerText = "Generar Invitación de Registro",
    variant = "default"
}: InviteGeneratorModalProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [customCode, setCustomCode] = useState("")
    const [selectedAppId, setSelectedAppId] = useState("")
    const [maxUses, setMaxUses] = useState(1)
    const [recipientEmail, setRecipientEmail] = useState("")

    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const handleGenerate = async () => {
        setIsLoading(true)
        setGeneratedUrl(null)

        try {
            const res = await createInviteLink({
                code: customCode || undefined,
                target_app_id: selectedAppId || undefined,
                recipient_email: recipientEmail || undefined,
                max_uses: Number(maxUses) || 1
            })

            if (res.success && res.data?.invite_url) {
                setGeneratedUrl(res.data.invite_url)
                toast.success("Enlace de invitación generado exitosamente")
            } else {
                toast.error(res.error || "Error generando invitación")
            }
        } catch (e: any) {
            toast.error(e.message || "Error inesperado")
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = () => {
        if (!generatedUrl) return
        navigator.clipboard.writeText(generatedUrl)
        setCopied(true)
        toast.success("Enlace copiado al portapapeles")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} className="gap-2 font-medium">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    {triggerText}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <Link2 className="w-5 h-5 text-indigo-500" />
                        Crear Enlace de Invitación Exclusivo
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                        Genera un enlace de registro autónomo para un cliente o campaña comercial.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Código de Invitación (Opcional)</Label>
                        <Input
                            placeholder="Ej. INV-RESTO-2026 (se auto-genera si se deja vacío)"
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                            className="text-xs uppercase"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Usos Máximos</Label>
                            <Input
                                type="number"
                                min={1}
                                max={1000}
                                value={maxUses}
                                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                className="text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Email Destinatario (Opcional)</Label>
                            <Input
                                type="email"
                                placeholder="cliente@empresa.com"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    {apps.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Pre-seleccionar Motor / App</Label>
                            <select
                                value={selectedAppId}
                                onChange={(e) => setSelectedAppId(e.target.value)}
                                className="w-full h-9 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-xs text-slate-900 dark:text-white"
                            >
                                <option value="">Cualquier Motor (Elección del cliente)</option>
                                {apps.map(app => (
                                    <option key={app.id} value={app.id}>{app.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 transition-all cursor-pointer"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generando Enlace...
                            </>
                        ) : (
                            "Generar Enlace de Invitación"
                        )}
                    </Button>

                    {generatedUrl && (
                        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-2 animate-in fade-in zoom-in duration-300">
                            <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Enlace de Invitación Generado:</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={generatedUrl}
                                    className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-800 text-xs font-mono select-all text-indigo-900 dark:text-indigo-200"
                                />
                                <Button
                                    type="button"
                                    onClick={copyToClipboard}
                                    size="icon"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
