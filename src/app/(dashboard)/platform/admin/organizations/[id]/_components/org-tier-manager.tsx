"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { updateOrganizationTier } from "@/modules/core/admin/actions"
import { Crown, Check } from "lucide-react"

interface BrandingTier {
    id: string
    name: string
    display_name: string
    price_monthly: number
    features: any
}

interface OrgTierManagerProps {
    organization: any
    tiers: BrandingTier[]
}

export function OrgTierManager({ organization, tiers }: OrgTierManagerProps) {
    const [loading, setLoading] = useState(false)
    const [selectedTier, setSelectedTier] = useState(organization.branding_tier_id || 'basic')

    const currentTier = tiers.find(t => t.id === organization.branding_tier_id) || tiers[0]

    const handleUpdate = async () => {
        if (selectedTier === organization.branding_tier_id) return

        setLoading(true)
        try {
            await updateOrganizationTier(organization.id, selectedTier)
            toast.success("Plan actualizado correctamente")
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar plan")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Crown className="w-4 h-4 text-brand-pink" />
                            Plan de Branding
                        </CardTitle>
                        <CardDescription>
                            Nivel de personalización de marca activo.
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="capitalize">
                        {currentTier?.display_name || 'Desconocido'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                        <Label>Seleccionar Plan</Label>
                        <Select
                            value={selectedTier}
                            onValueChange={setSelectedTier}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar plan..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tiers.map((tier) => (
                                    <SelectItem key={tier.id} value={tier.id}>
                                        <div className="flex items-center justify-between w-full min-w-[200px]">
                                            <span>{tier.display_name}</span>
                                            <span className="text-muted-foreground text-xs ml-2">
                                                ${tier.price_monthly}/mes
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleUpdate}
                        disabled={loading || selectedTier === organization.branding_tier_id}
                    >
                        {loading ? "Actualizando..." : "Guardar Cambio"}
                    </Button>
                </div>

                {/* Feature Preview */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <p className="text-xs text-muted-foreground mb-3">Características del plan seleccionado:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {tiers.find(t => t.id === selectedTier)?.features && Object.entries(tiers.find(t => t.id === selectedTier)?.features || {})
                            .filter(([_, val]) => val === true)
                            .map(([key]) => (
                                <div key={key} className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                    <Check className="w-3 h-3 text-green-600" />
                                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
