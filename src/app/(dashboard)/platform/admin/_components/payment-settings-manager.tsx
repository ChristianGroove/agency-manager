"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    CreditCard,
    DollarSign,
    Settings2,
    CheckCircle2,
    XCircle,
    Loader2,
    RefreshCw,
    Shield,
    Zap,
    AlertTriangle
} from "lucide-react"
import {
    getPaymentGateways,
    togglePaymentGateway,
    setGatewayLiveMode,
    updateGatewayPublicKey,
    updatePlatformFees,
    testStripeConnection,
    PaymentGatewayConfig
} from "@/modules/core/payments/gateway-actions"
import { cn } from "@/lib/utils"

const GATEWAY_ICONS: Record<string, any> = {
    stripe: CreditCard,
    mercadopago: DollarSign,
    paypal: CreditCard,
    wompi: Zap
}

const GATEWAY_COLORS: Record<string, string> = {
    stripe: "bg-purple-500",
    mercadopago: "bg-blue-400",
    paypal: "bg-blue-600",
    wompi: "bg-green-500"
}

export function PaymentSettingsManager() {
    const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [testing, setTesting] = useState<string | null>(null)
    const [saving, setSaving] = useState<string | null>(null)

    // Form states per gateway
    const [publicKeys, setPublicKeys] = useState<Record<string, string>>({})
    const [fees, setFees] = useState<Record<string, { percent: number; fixed: number }>>({})

    useEffect(() => {
        loadGateways()
    }, [])

    const loadGateways = async () => {
        setLoading(true)
        const data = await getPaymentGateways()
        setGateways(data)

        // Initialize form states
        const keys: Record<string, string> = {}
        const feeData: Record<string, { percent: number; fixed: number }> = {}
        data.forEach(g => {
            keys[g.gateway_name] = g.public_key || ''
            feeData[g.gateway_name] = {
                percent: g.platform_fee_percent,
                fixed: g.platform_fee_fixed_cents
            }
        })
        setPublicKeys(keys)
        setFees(feeData)

        setLoading(false)
    }

    const handleToggle = async (gateway: string, enabled: boolean) => {
        setSaving(gateway)
        await togglePaymentGateway(gateway, enabled)
        await loadGateways()
        setSaving(null)
    }

    const handleLiveMode = async (gateway: string, isLive: boolean) => {
        setSaving(gateway)
        await setGatewayLiveMode(gateway, isLive)
        await loadGateways()
        setSaving(null)
    }

    const handleSavePublicKey = async (gateway: string) => {
        setSaving(gateway)
        await updateGatewayPublicKey(gateway, publicKeys[gateway])
        await loadGateways()
        setSaving(null)
    }

    const handleSaveFees = async (gateway: string) => {
        setSaving(gateway)
        await updatePlatformFees(
            gateway,
            fees[gateway].percent,
            fees[gateway].fixed
        )
        await loadGateways()
        setSaving(null)
    }

    const handleTest = async (gateway: string) => {
        setTesting(gateway)
        if (gateway === 'stripe') {
            const result = await testStripeConnection()
            alert(result.message)
        }
        await loadGateways()
        setTesting(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-purple-500" />
                        Configuración de Pagos
                    </h2>
                    <p className="text-muted-foreground">
                        Gestiona las pasarelas de pago de la plataforma
                    </p>
                </div>
                <Button variant="outline" onClick={loadGateways}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recargar
                </Button>
            </div>

            {/* Warning */}
            <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                            <p className="font-medium text-yellow-600">Importante</p>
                            <p className="text-sm text-muted-foreground">
                                Las claves secretas (Secret Keys) deben configurarse en las
                                <strong> variables de entorno de Vercel</strong>, no aquí.
                                Solo las claves públicas (Publishable Keys) se guardan en la base de datos.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Gateway Cards */}
            <div className="grid gap-6">
                {gateways.map((gateway) => {
                    const Icon = GATEWAY_ICONS[gateway.gateway_name] || CreditCard
                    const colorClass = GATEWAY_COLORS[gateway.gateway_name] || "bg-gray-500"

                    return (
                        <Card
                            key={gateway.gateway_name}
                            className={cn(
                                "relative overflow-hidden transition-all",
                                gateway.is_enabled && "ring-2 ring-primary/20"
                            )}
                        >
                            {/* Color stripe */}
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1", colorClass)} />

                            <CardHeader className="pl-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg", colorClass, "text-white")}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{gateway.display_name}</CardTitle>
                                            <div className="flex items-center gap-2 mt-1">
                                                {gateway.supports_connect && (
                                                    <Badge variant="outline" className="text-xs">Connect</Badge>
                                                )}
                                                {gateway.supports_subscriptions && (
                                                    <Badge variant="outline" className="text-xs">Suscripciones</Badge>
                                                )}
                                                {gateway.supports_invoicing && (
                                                    <Badge variant="outline" className="text-xs">Facturas</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Test Status */}
                                        {gateway.last_tested_at && (
                                            <div className="flex items-center gap-1.5 text-sm">
                                                {gateway.test_result === 'success' ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                )}
                                                <span className="text-muted-foreground">
                                                    {new Date(gateway.last_tested_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Live Mode Badge */}
                                        <Badge variant={gateway.is_live_mode ? "default" : "secondary"}>
                                            {gateway.is_live_mode ? "LIVE" : "TEST"}
                                        </Badge>

                                        {/* Enable Toggle */}
                                        <Switch
                                            checked={gateway.is_enabled}
                                            onCheckedChange={(checked) => handleToggle(gateway.gateway_name, checked)}
                                            disabled={saving === gateway.gateway_name}
                                        />
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pl-6 space-y-6">
                                <Tabs defaultValue="keys" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="keys">Claves</TabsTrigger>
                                        <TabsTrigger value="fees">Comisiones</TabsTrigger>
                                        <TabsTrigger value="settings">Ajustes</TabsTrigger>
                                    </TabsList>

                                    {/* Keys Tab */}
                                    <TabsContent value="keys" className="space-y-4 pt-4">
                                        <div className="grid gap-4">
                                            <div>
                                                <Label>Clave Pública (Publishable Key)</Label>
                                                <div className="flex gap-2 mt-1.5">
                                                    <Input
                                                        value={publicKeys[gateway.gateway_name] || ''}
                                                        onChange={(e) => setPublicKeys({
                                                            ...publicKeys,
                                                            [gateway.gateway_name]: e.target.value
                                                        })}
                                                        placeholder="pk_live_... o pk_test_..."
                                                        className="font-mono text-sm"
                                                    />
                                                    <Button
                                                        onClick={() => handleSavePublicKey(gateway.gateway_name)}
                                                        disabled={saving === gateway.gateway_name}
                                                    >
                                                        {saving === gateway.gateway_name ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            "Guardar"
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div>
                                                <Label>Clave Secreta (Secret Key)</Label>
                                                <div className="flex items-center gap-2 mt-1.5 p-3 bg-muted rounded-md">
                                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground font-mono">
                                                        {gateway.secret_key_ref || 'No configurado'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        (Variable de entorno en Vercel)
                                                    </span>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                onClick={() => handleTest(gateway.gateway_name)}
                                                disabled={testing === gateway.gateway_name}
                                            >
                                                {testing === gateway.gateway_name ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                )}
                                                Probar Conexión
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    {/* Fees Tab */}
                                    <TabsContent value="fees" className="space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Comisión Porcentual (%)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={fees[gateway.gateway_name]?.percent || 0}
                                                    onChange={(e) => setFees({
                                                        ...fees,
                                                        [gateway.gateway_name]: {
                                                            ...fees[gateway.gateway_name],
                                                            percent: parseFloat(e.target.value) || 0
                                                        }
                                                    })}
                                                    className="mt-1.5"
                                                />
                                            </div>
                                            <div>
                                                <Label>Comisión Fija (centavos)</Label>
                                                <Input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    value={fees[gateway.gateway_name]?.fixed || 0}
                                                    onChange={(e) => setFees({
                                                        ...fees,
                                                        [gateway.gateway_name]: {
                                                            ...fees[gateway.gateway_name],
                                                            fixed: parseInt(e.target.value) || 0
                                                        }
                                                    })}
                                                    className="mt-1.5"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleSaveFees(gateway.gateway_name)}
                                            disabled={saving === gateway.gateway_name}
                                        >
                                            {saving === gateway.gateway_name ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : null}
                                            Guardar Comisiones
                                        </Button>
                                    </TabsContent>

                                    {/* Settings Tab */}
                                    <TabsContent value="settings" className="space-y-4 pt-4">
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <p className="font-medium">Modo Producción</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Cambiar a modo LIVE para procesar pagos reales
                                                </p>
                                            </div>
                                            <Switch
                                                checked={gateway.is_live_mode}
                                                onCheckedChange={(checked) => handleLiveMode(gateway.gateway_name, checked)}
                                                disabled={saving === gateway.gateway_name}
                                            />
                                        </div>

                                        <div className="p-4 border rounded-lg">
                                            <p className="font-medium mb-2">Configuración Adicional</p>
                                            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                                {JSON.stringify(gateway.config, null, 2)}
                                            </pre>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
