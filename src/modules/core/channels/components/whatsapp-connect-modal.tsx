"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { MetaEmbeddedSignup } from "./meta-embedded-signup"
import { MessageCircle, Smartphone, Building2, ArrowRight, Zap, Shield } from "lucide-react"

interface WhatsAppConnectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onOAuthConnect: () => void
}

type ConnectionMethod = null | 'oauth' | 'embedded';

export function WhatsAppConnectModal({ open, onOpenChange, onOAuthConnect }: WhatsAppConnectModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<ConnectionMethod>(null)

    const handleClose = () => {
        setSelectedMethod(null)
        onOpenChange(false)
    }

    const handleOAuth = () => {
        handleClose()
        onOAuthConnect()
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden border-0 shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#25D366] to-[#128C7E] p-6 text-white">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <MessageCircle className="h-6 w-6" />
                            </div>
                            <DialogTitle className="text-xl font-semibold text-white">
                                Conectar WhatsApp
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-white/85 text-sm">
                            Elige cómo deseas vincular tu número de WhatsApp Business a Pixy.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Method selection */}
                {selectedMethod === null && (
                    <div className="p-6 space-y-3">
                        {/* Embedded Signup Option */}
                        <button
                            onClick={() => setSelectedMethod('embedded')}
                            className="w-full group relative flex items-start gap-4 p-4 rounded-xl border-2 border-transparent
                                bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30
                                hover:border-[#1877F2] hover:shadow-md
                                transition-all duration-200 text-left"
                        >
                            <div className="shrink-0 p-2.5 rounded-lg bg-[#1877F2] text-white shadow-sm">
                                <Zap className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-sm">Registro Rápido con Meta</h3>
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#1877F2] text-white">
                                        Recomendado
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Conecta tu número directamente desde aquí sin salir de Pixy.
                                    Ideal si quieres <strong>seguir usando la app móvil de WhatsApp Business</strong> al mismo tiempo.
                                </p>
                                <div className="flex items-center gap-4 mt-2.5">
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        <Smartphone className="h-3.5 w-3.5 text-[#25D366]" />
                                        <span>Compatible con app móvil</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        <Shield className="h-3.5 w-3.5 text-[#1877F2]" />
                                        <span>Configuración automática</span>
                                    </div>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
                        </button>

                        {/* OAuth Option */}
                        <button
                            onClick={handleOAuth}
                            className="w-full group relative flex items-start gap-4 p-4 rounded-xl border-2 border-transparent
                                bg-muted/40 dark:bg-muted/20
                                hover:border-[#25D366] hover:shadow-md
                                transition-all duration-200 text-left"
                        >
                            <div className="shrink-0 p-2.5 rounded-lg bg-[#25D366] text-white shadow-sm">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm mb-1">Conexión Administrada (OAuth)</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Vinculación completa vía inicio de sesión en Facebook.
                                    Ideal para cuentas <strong>gestionadas exclusivamente desde Pixy</strong>.
                                </p>
                                <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-muted-foreground">
                                    <Building2 className="h-3.5 w-3.5 text-[#25D366]" />
                                    <span>Control total desde el dashboard</span>
                                </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
                        </button>
                    </div>
                )}

                {/* Embedded Signup Flow */}
                {selectedMethod === 'embedded' && (
                    <div className="p-6 space-y-4">
                        <button
                            onClick={() => setSelectedMethod(null)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            ← Volver a métodos de conexión
                        </button>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                <Smartphone className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Al conectar con este método, podrás seguir usando la <strong>app móvil de WhatsApp Business</strong> (v2.24.17+)
                                    junto con el inbox de Pixy. Los mensajes se sincronizan automáticamente.
                                </p>
                            </div>

                            <MetaEmbeddedSignup
                                onSuccess={handleClose}
                                onError={(error) => console.error('[WhatsAppModal]', error)}
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
