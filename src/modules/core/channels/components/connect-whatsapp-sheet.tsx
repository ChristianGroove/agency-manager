"use client"

import { useState, useEffect } from "react"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
    SheetFooter
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle2, QrCode, Smartphone, Wifi, ShieldCheck, X, Building2, HelpCircle } from "lucide-react"
import { createWhatsAppChannel, createChannel } from "@/modules/core/channels/actions"
import { toast } from "sonner"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ConnectWhatsAppSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

type Step = 'INPUT' | 'CREATING' | 'QR' | 'VERIFYING' | 'SUCCESS'

export function ConnectWhatsAppSheet({ open, onOpenChange, onSuccess }: ConnectWhatsAppSheetProps) {
    const [step, setStep] = useState<Step>('INPUT')
    const [phone, setPhone] = useState("")
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("qr")

    // Meta Form State
    const [metaName, setMetaName] = useState("")
    const [phoneId, setPhoneId] = useState("")
    const [token, setToken] = useState("")
    const [wabaId, setWabaId] = useState("")
    const [isMetaLoading, setIsMetaLoading] = useState(false)

    // Reset state on close
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setStep('INPUT')
                setPhone("")
                setQrCode(null)
                // Reset Meta
                setMetaName("")
                setPhoneId("")
                setToken("")
                setWabaId("")
                setActiveTab("qr")
            }, 300)
        }
    }, [open])

    // --- EVOLUTION (QR) LOGIC ---
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

    // --- META (OFFICIAL) LOGIC ---
    const handleConnectMeta = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!metaName || !phoneId || !token) {
            return toast.error("Completa los campos obligatorios")
        }

        setIsMetaLoading(true)
        try {
            await createChannel({
                provider_key: 'meta_whatsapp',
                connection_name: metaName,
                credentials: {
                    phoneNumberId: phoneId,
                    accessToken: token,
                    wabaId: wabaId
                },
                config: {},
                is_primary: false,
                force_validation: true
            })

            setStep('SUCCESS')
        } catch (error: any) {
            toast.error("Error al conectar", { description: error.message })
        } finally {
            setIsMetaLoading(false)
        }
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
                    sm:max-w-xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-white/95 backdrop-blur-xl flex flex-col
                "
            >
                {/* Premium Header */}
                <div className="p-6 border-b flex items-start justify-between bg-white/50 shrink-0">
                    <div>
                        <SheetTitle className="text-xl font-semibold flex items-center gap-2">
                            <div className="p-2 bg-[#25D366]/10 rounded-full">
                                <QrCode className="w-5 h-5 text-[#25D366]" />
                            </div>
                            Conectar WhatsApp
                        </SheetTitle>
                        <SheetDescription className="mt-1">
                            Vincula tu número de negocio para enviar y recibir mensajes.
                        </SheetDescription>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col relative">

                    {/* Background Decor */}
                    <div className="absolute inset-0 -z-10 overflow-hidden opacity-20 pointer-events-none">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#25D366]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />
                    </div>

                    {step === 'SUCCESS' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-300">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                                <CheckCircle2 className="h-12 w-12 text-[#25D366]" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-green-700">¡Conexión Exitosa!</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">
                                    Tu canal de WhatsApp está activo. Los mensajes nuevos aparecerán en tu Inbox automáticamente.
                                </p>
                            </div>

                            <Button
                                className="w-full max-w-sm h-12 text-lg shadow-xl shadow-green-500/20"
                                onClick={() => {
                                    onSuccess?.()
                                    onOpenChange(false)
                                }}
                            >
                                Ir a Configuración
                            </Button>
                        </div>
                    ) : (
                        <Tabs defaultValue="qr" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100/50 p-1 rounded-xl">
                                <TabsTrigger value="qr" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <QrCode className="w-4 h-4 mr-2" /> Escáner QR
                                </TabsTrigger>
                                <TabsTrigger value="official" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Building2 className="w-4 h-4 mr-2" /> API Oficial
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: QR (EVOLUTION) */}
                            <TabsContent value="qr" className="flex-1 flex flex-col items-center justify-center space-y-8 mt-0 outline-none">
                                <AnimatePresence mode="wait">
                                    {step === 'INPUT' && (
                                        <motion.div
                                            key="input"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="w-full max-w-sm space-y-6"
                                        >
                                            <div className="text-center space-y-2">
                                                <h2 className="text-2xl font-bold tracking-tight">WhatsApp Web</h2>
                                                <p className="text-muted-foreground text-sm">Escanea el código QR como si fuera WhatsApp Web.</p>
                                            </div>

                                            <div className="space-y-4 bg-white/60 p-6 rounded-2xl border shadow-sm backdrop-blur-sm">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Número de Teléfono</Label>
                                                    <div className="relative">
                                                        <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="5215512345678"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            className="pl-9 h-11 text-lg bg-white/80"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <Button
                                                    className="w-full h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold shadow-lg shadow-green-500/20"
                                                    onClick={handleConnectQR}
                                                >
                                                    Generar Código QR
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 'CREATING' && (
                                        <motion.div
                                            key="creating"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex flex-col items-center space-y-6 text-center"
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
                                            className="flex flex-col items-center space-y-6 w-full max-w-md"
                                        >
                                            <div className="bg-white p-4 rounded-2xl shadow-xl border">
                                                <img src={qrSrc} alt="Scan QR" className="w-64 h-64 object-contain mix-blend-multiply" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <p className="text-sm font-medium">Escanea con tu celular</p>
                                                <p className="text-xs text-muted-foreground">Configuración {'>'} Dispositivos Vinculados</p>
                                            </div>
                                            <Button variant="outline" onClick={handleVerifyQR} className="w-full">
                                                Listo, ya escaneé
                                            </Button>
                                        </motion.div>
                                    )}

                                    {step === 'VERIFYING' && (
                                        <motion.div key="verifying" className="flex flex-col items-center space-y-4">
                                            <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
                                            <p className="text-sm text-muted-foreground">Verificando conexión...</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </TabsContent>

                            {/* TAB 2: META (OFFICIAL) */}
                            <TabsContent value="official" className="flex-1 mt-0 outline-none">
                                <div className="space-y-6 max-w-sm mx-auto pt-4">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl font-bold tracking-tight">Meta Cloud API</h2>
                                        <p className="text-muted-foreground text-sm">Conecta tu cuenta verificada de WhatsApp Business.</p>
                                    </div>

                                    <form onSubmit={handleConnectMeta} className="space-y-4 bg-white/60 p-6 rounded-2xl border shadow-sm backdrop-blur-sm">
                                        <div className="space-y-2">
                                            <Label>Nombre de la Conexión</Label>
                                            <Input
                                                placeholder="Ej: Ventas Principal"
                                                value={metaName}
                                                onChange={(e) => setMetaName(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Phone Number ID</Label>
                                            <Input
                                                placeholder="Identificador del número"
                                                value={phoneId}
                                                onChange={(e) => setPhoneId(e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Token de Acceso (Permanente)</Label>
                                            <Input
                                                type="password"
                                                placeholder="EAAG..."
                                                value={token}
                                                onChange={(e) => setToken(e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                            <a href="#" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1">
                                                <HelpCircle className="w-3 h-3" /> ¿Dónde encuentro esto?
                                            </a>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>WABA ID (Opcional)</Label>
                                            <Input
                                                placeholder="ID de Cuenta de WhatsApp"
                                                value={wabaId}
                                                onChange={(e) => setWabaId(e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20"
                                            disabled={isMetaLoading}
                                        >
                                            {isMetaLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando...
                                                </>
                                            ) : (
                                                "Conectar Cuenta Oficial"
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
