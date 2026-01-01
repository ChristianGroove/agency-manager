"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, ArrowRight, CheckCircle2 } from "lucide-react"
import { EcosystemHubModal } from "./ecosystem-hub-modal"
import { getMetaConfig } from "@/modules/core/admin/actions"
import { cn } from "@/lib/utils"

interface EcosystemWidgetProps {
    client: any
    services: any[]
}

export function EcosystemWidget({ client, services }: EcosystemWidgetProps) {
    const [open, setOpen] = useState(false)
    const [metaConnected, setMetaConnected] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkConnections()
    }, [])

    const checkConnections = async () => {
        setLoading(true)
        const { config } = await getMetaConfig(client.id)
        if (config?.access_token) {
            setMetaConnected(true)
        }
        setLoading(false)
    }

    const connectedCount = (metaConnected ? 1 : 0)

    return (
        <>
            <Card className="border-none shadow-sm bg-black text-white overflow-hidden relative group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]" onClick={() => setOpen(true)}>
                <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <CardContent className="p-5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Globe className="w-6 h-6 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Conectividad & Alcance</h3>
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                {loading ? "Verificando..." : (
                                    <>
                                        {connectedCount > 0 ? (
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {connectedCount} Plataforma{connectedCount !== 1 ? 's' : ''} activa{connectedCount !== 1 ? 's' : ''}
                                            </span>
                                        ) : "Sin conexiones activas"}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Brand Logos Row */}
                        <div className="flex -space-x-2 mr-4">
                            <LogoPreview brand="meta" active={metaConnected} />
                            <LogoPreview brand="google" active={false} disabled />
                            <LogoPreview brand="tiktok" active={false} disabled />
                        </div>

                        <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm gap-2 pl-4 pr-2">
                            Gestionar
                            <ArrowRight className="w-4 h-4 opacity-70" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <EcosystemHubModal
                client={client}
                services={services}
                open={open}
                onOpenChange={setOpen}
                onUpdate={checkConnections}
            />
        </>
    )
}

function LogoPreview({ brand, active, disabled }: { brand: string, active: boolean, disabled?: boolean }) {
    return (
        <div
            className={cn(
                "w-8 h-8 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center overflow-hidden transition-all",
                active ? "grayscale-0 bg-white" : "grayscale opacity-50",
                disabled && "opacity-20"
            )}
            title={brand}
        >
            <img
                src={`/assets/brands/${brand}.svg`}
                alt={brand}
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
        </div>
    )
}
