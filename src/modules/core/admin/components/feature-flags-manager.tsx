"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Sparkles, Zap, Brain, Mail, BarChart3 } from "lucide-react"
import { toast } from "sonner"
import {
    FEATURE_REGISTRY,
    getOrganizationFeatureFlags,
    toggleFeatureFlag,
    type FeatureFlag
} from "@/lib/feature-flags"
import { cn } from "@/lib/utils"

interface FeatureFlagsManagerProps {
    organizationId: string
    organizationName?: string
}

// Icon mapping for modules
const MODULE_ICONS: Record<string, any> = {
    crm: Zap,
    invoicing: BarChart3,
    marketing: Mail,
    ai: Brain,
}

const MODULE_COLORS: Record<string, string> = {
    crm: 'bg-blue-100 text-blue-700',
    invoicing: 'bg-green-100 text-green-700',
    marketing: 'bg-purple-100 text-purple-700',
    ai: 'bg-amber-100 text-amber-700',
}

/**
 * FeatureFlagsManager
 * 
 * Admin UI for managing granular feature flags within modules.
 * Allows toggling individual features on/off per organization.
 */
export function FeatureFlagsManager({ organizationId, organizationName }: FeatureFlagsManagerProps) {
    const [flags, setFlags] = useState<FeatureFlag[]>([])
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState<string | null>(null)

    useEffect(() => {
        loadFlags()
    }, [organizationId])

    const loadFlags = async () => {
        setLoading(true)
        try {
            const data = await getOrganizationFeatureFlags(organizationId)
            setFlags(data)
        } catch (error) {
            console.error('Error loading flags:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (moduleKey: string, featureKey: string) => {
        const flagId = `${moduleKey}.${featureKey}`
        setToggling(flagId)

        try {
            const result = await toggleFeatureFlag(moduleKey, featureKey, organizationId)
            if (result.success) {
                toast.success(`Feature ${result.newValue ? 'activada' : 'desactivada'}`)
                await loadFlags()
            } else {
                toast.error(result.error || 'Error al cambiar feature')
            }
        } catch (error) {
            toast.error('Error inesperado')
        } finally {
            setToggling(null)
        }
    }

    // Check if a feature is enabled (from flags array or default)
    const isEnabled = (moduleKey: string, featureKey: string): boolean => {
        const flag = flags.find(f => f.module_key === moduleKey && f.feature_key === featureKey)
        if (flag) return flag.enabled

        // Default from registry
        const registry = FEATURE_REGISTRY[moduleKey]
        const feature = registry?.find(f => f.key === featureKey)
        return feature?.defaultEnabled ?? true
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Feature Flags
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Control granular de funcionalidades {organizationName && `para ${organizationName}`}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadFlags}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refrescar
                </Button>
            </div>

            {/* Modules Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(FEATURE_REGISTRY).map(([moduleKey, features]) => {
                    const Icon = MODULE_ICONS[moduleKey] || Zap
                    const colorClass = MODULE_COLORS[moduleKey] || 'bg-gray-100 text-gray-700'

                    return (
                        <Card key={moduleKey} className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-3 text-base">
                                    <div className={cn("p-2 rounded-lg", colorClass)}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="capitalize">{moduleKey}</span>
                                    <Badge variant="secondary" className="ml-auto">
                                        {features.length} features
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {features.map(feature => {
                                    const flagId = `${moduleKey}.${feature.key}`
                                    const enabled = isEnabled(moduleKey, feature.key)
                                    const isToggling = toggling === flagId

                                    return (
                                        <div
                                            key={feature.key}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-lg border transition-all",
                                                enabled
                                                    ? "bg-white border-gray-200"
                                                    : "bg-gray-50 border-gray-100"
                                            )}
                                        >
                                            <div className="space-y-1">
                                                <p className={cn(
                                                    "font-medium text-sm",
                                                    !enabled && "text-muted-foreground"
                                                )}>
                                                    {feature.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {feature.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isToggling && (
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                )}
                                                <Switch
                                                    checked={enabled}
                                                    onCheckedChange={() => handleToggle(moduleKey, feature.key)}
                                                    disabled={isToggling}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
                Los cambios se aplican inmediatamente. Las features desactivadas no estarán disponibles para los usuarios.
            </p>
        </div>
    )
}
