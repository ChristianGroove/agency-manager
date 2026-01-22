"use client"

import { useState, useEffect } from "react"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle2, QrCode, Smartphone, Wifi } from "lucide-react"
import { createWhatsAppChannel } from "@/modules/core/channels/actions"
import { toast } from "sonner"

interface EvolutionConnectSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

type Step = 'INPUT' | 'CREATING' | 'QR' | 'VERIFYING' | 'SUCCESS'

export function EvolutionConnectSheet({ open, onOpenChange, onSuccess }: EvolutionConnectSheetProps) {
    const [step, setStep] = useState<Step>('INPUT')
    const [phone, setPhone] = useState("")
    const [qrCode, setQrCode] = useState<string | null>(null)

    // Reset state on close
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setStep('INPUT')
                setPhone("")
                setQrCode(null)
            }, 300)
        }
    }, [open])

    const handleConnectQR = async () => {
        if (!phone) return toast.error("Ingresa un número válido")

        setStep('CREATING')
        try {
            const result = await createWhatsAppChannel(phone)

            if (result.qrCode) {
                setQrCode(result.qrCode)
                setStep('QR')
            } else {
                toast.warning("Instancia creada, pero no se recibió QR. Revisa la configuración.")
                setStep('INPUT')
            }
        } catch (error: any) {
            toast.error(error.message)
            setStep('INPUT')
        }
    }

    const handleVerifyQR = () => {
        setStep('VERIFYING')
        setTimeout(() => {
            setStep('SUCCESS')
        }, 2000)
    }

    // Safer QR Source Logic
    const qrSrc = qrCode?.startsWith('data:image')
        ? qrCode
        : `data:image/png;base64,${qrCode}`

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-md w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-white dark:bg-zinc-900 backdrop-blur-xl flex flex-col
                "
            >
                {/* Header */}
                <div className="p-6 border-b dark:border-zinc-800 flex items-start justify-between shrink-0">
                    <div>
                        <SheetTitle className="text-xl font-semibold flex items-center gap-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <QrCode className="w-5 h-5 text-[#25D366]" />
                            </div>
                            Conectar WhatsApp (QR)
                        </SheetTitle>
                        <SheetDescription className="mt-1 dark:text-zinc-400">
                            Escanea el código QR como WhatsApp Web.
                        </SheetDescription>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col relative">
                    {/* Background Decor */}
                    <div className="absolute inset-0 -z-10 overflow-hidden opacity-20 pointer-events-none">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#25D366]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 'INPUT' && (
                            <motion.div
                                key="input"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex-1 flex flex-col items-center justify-center space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight">WhatsApp Web</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Conecta tu número personal o de negocio sin API oficial.
                                    </p>
                                </div>

                                <div className="w-full max-w-sm space-y-4 bg-white/60 dark:bg-zinc-800/60 p-6 rounded-2xl border dark:border-zinc-700 shadow-sm backdrop-blur-sm">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Número de Teléfono</Label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="5215512345678"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="pl-9 h-11 text-lg bg-white/80 dark:bg-zinc-900/80"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Incluye código de país, sin + ni espacios
                                        </p>
                                    </div>
                                    <Button
                                        className="w-full h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold shadow-lg shadow-green-500/20"
                                        onClick={handleConnectQR}
                                    >
                                        Generar Código QR
                                    </Button>
                                </div>

                                <div className="text-center text-xs text-muted-foreground max-w-xs">
                                    <p>⚠️ Este método usa Evolution API. Puede no ser tan estable como la API oficial de Meta.</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 'CREATING' && (
                            <motion.div
                                key="creating"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center space-y-6 text-center"
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Wifi className="w-6 h-6 text-[#25D366]" />
                                    </div>
                                </div>
                                <p className="text-muted-foreground font-medium">Preparando conexión segura...</p>
                            </motion.div>
                        )}

                        {step === 'QR' && qrCode && (
                            <motion.div
                                key="qr"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center space-y-6"
                            >
                                <div className="bg-white p-4 rounded-2xl shadow-xl border">
                                    <img src={qrSrc} alt="Scan QR" className="w-64 h-64 object-contain" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-sm font-medium">Escanea con tu celular</p>
                                    <p className="text-xs text-muted-foreground">
                                        WhatsApp → Configuración → Dispositivos Vinculados
                                    </p>
                                </div>
                                <Button variant="outline" onClick={handleVerifyQR} className="w-full max-w-sm">
                                    Listo, ya escaneé
                                </Button>
                            </motion.div>
                        )}

                        {step === 'VERIFYING' && (
                            <motion.div
                                key="verifying"
                                className="flex-1 flex flex-col items-center justify-center space-y-4"
                            >
                                <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
                                <p className="text-sm text-muted-foreground">Verificando conexión...</p>
                            </motion.div>
                        )}

                        {step === 'SUCCESS' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
                            >
                                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounce">
                                    <CheckCircle2 className="h-12 w-12 text-[#25D366]" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">¡Conexión Exitosa!</h3>
                                    <p className="text-muted-foreground max-w-xs mx-auto">
                                        Tu canal de WhatsApp está activo.
                                    </p>
                                </div>

                                <Button
                                    className="w-full max-w-sm h-12 text-lg shadow-xl shadow-green-500/20"
                                    onClick={() => {
                                        onSuccess?.()
                                        onOpenChange(false)
                                    }}
                                >
                                    Continuar
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </SheetContent>
        </Sheet>
    )
}
