"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Gauge, Zap, Brain, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabaseAdmin } from "@/lib/supabase-admin"

interface RateLimitConfigCardProps {
    organizationId: string
    organizationName: string
    initialConfig?: {
        requests_per_minute?: number
        ai_requests_per_day?: number
    }
    onSave?: () => void
}

/**
 * RateLimitConfigCard
 * 
 * UI component for Super Admins and Resellers to configure
 * rate limits for an organization. Settings are stored in
 * organizations.rate_limit_config (JSONB column).
 */
export function RateLimitConfigCard({
    organizationId,
    organizationName,
    initialConfig,
    onSave
}: RateLimitConfigCardProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [requestsPerMinute, setRequestsPerMinute] = useState(initialConfig?.requests_per_minute || 500)
    const [aiRequestsPerDay, setAiRequestsPerDay] = useState(initialConfig?.ai_requests_per_day || 100)

    // Sync with initial config when it changes
    useEffect(() => {
        if (initialConfig) {
            setRequestsPerMinute(initialConfig.requests_per_minute || 500)
            setAiRequestsPerDay(initialConfig.ai_requests_per_day || 100)
        }
    }, [initialConfig])

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const { error } = await supabaseAdmin
                .from('organizations')
                .update({
                    rate_limit_config: {
                        requests_per_minute: requestsPerMinute,
                        ai_requests_per_day: aiRequestsPerDay
                    }
                })
                .eq('id', organizationId)

            if (error) throw error

            toast.success("Límites actualizados", {
                description: `Configuración guardada para ${organizationName}`
            })
            onSave?.()
        } catch (error: any) {
            console.error("Error saving rate limits:", error)
            toast.error("Error", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    // Presets for quick configuration
    const presets = [
        { name: 'Básico', requests: 100, ai: 25 },
        { name: 'Pro', requests: 500, ai: 100 },
        { name: 'Enterprise', requests: 2000, ai: 500 },
    ]

    return (
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Gauge className="h-5 w-5 text-amber-600" />
                    Control de Tráfico
                </CardTitle>
                <CardDescription>
                    Configura los límites de uso para esta organización
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Quick Presets */}
                <div className="flex gap-2">
                    {presets.map(preset => (
                        <Button
                            key={preset.name}
                            variant="outline"
                            size="sm"
                            className={`text-xs ${requestsPerMinute === preset.requests && aiRequestsPerDay === preset.ai
                                    ? 'border-amber-400 bg-amber-50'
                                    : ''
                                }`}
                            onClick={() => {
                                setRequestsPerMinute(preset.requests)
                                setAiRequestsPerDay(preset.ai)
                            }}
                        >
                            {preset.name}
                        </Button>
                    ))}
                </div>

                {/* Requests Per Minute */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-500" />
                            Requests / Minuto
                        </Label>
                        <span className="text-sm font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {requestsPerMinute}
                        </span>
                    </div>
                    <Slider
                        value={[requestsPerMinute]}
                        onValueChange={([v]) => setRequestsPerMinute(v)}
                        min={50}
                        max={5000}
                        step={50}
                        className="[&_.slider-thumb]:bg-blue-500"
                    />
                    <p className="text-xs text-muted-foreground">
                        Límite de peticiones HTTP por minuto. Recomendado: 500 para uso normal.
                    </p>
                </div>

                {/* AI Requests Per Day */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-500" />
                            AI Requests / Día
                        </Label>
                        <span className="text-sm font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            {aiRequestsPerDay}
                        </span>
                    </div>
                    <Slider
                        value={[aiRequestsPerDay]}
                        onValueChange={([v]) => setAiRequestsPerDay(v)}
                        min={10}
                        max={1000}
                        step={10}
                        className="[&_.slider-thumb]:bg-purple-500"
                    />
                    <p className="text-xs text-muted-foreground">
                        Límite de llamadas a servicios de IA (GPT, análisis) por día.
                    </p>
                </div>

                {/* Save Button */}
                <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar Límites
                </Button>
            </CardContent>
        </Card>
    )
}
