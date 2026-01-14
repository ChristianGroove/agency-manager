"use client"

import { useState, useEffect } from "react"
import {
    getBrandingTiers,
    getAllOrganizationsBrandingStatus,
    getBrandingRevenueMetrics,
    upgradeBrandingTier
} from "@/modules/core/branding/tier-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, TrendingUp, DollarSign, Users, Search } from "lucide-react"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

interface BrandingTier {
    id: string
    display_name: string
    price_monthly: number
    description: string
    features: Record<string, any>
}

interface OrgBrandingStatus {
    id: string
    name: string
    slug: string
    branding_tier_id: string
    branding_tier: {
        display_name: string
        price_monthly: number
    }
}

export function BrandingPlansManager() {
    const [loading, setLoading] = useState(true)
    const [tiers, setTiers] = useState<BrandingTier[]>([])
    const [organizations, setOrganizations] = useState<OrgBrandingStatus[]>([])
    const [revenue, setRevenue] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterTier, setFilterTier] = useState<string>("all")
    const [upgrading, setUpgrading] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [tiersData, orgsData, revenueData] = await Promise.all([
                getBrandingTiers(),
                getAllOrganizationsBrandingStatus(),
                getBrandingRevenueMetrics()
            ])

            setTiers(tiersData)
            setOrganizations(orgsData as any)
            setRevenue(revenueData)
        } catch (error) {
            console.error(error)
            toast.error("Error loading data")
        } finally {
            setLoading(false)
        }
    }

    const handleUpgradeTier = async (orgId: string, newTierId: string) => {
        setUpgrading(orgId)
        try {
            const response = await upgradeBrandingTier({
                organization_id: orgId,
                new_tier_id: newTierId
            })

            if (response.success) {
                toast.success(`Branding tier updated successfully`)
                loadData()
            } else {
                toast.error(response.error || "Failed to upgrade tier")
            }
        } catch (error) {
            toast.error("Error upgrading tier")
        } finally {
            setUpgrading(null)
        }
    }

    const getTierIcon = (tierId: string) => {
        switch (tierId) {
            case 'basic': return '🆓'
            case 'custom': return '💎'
            case 'whitelabel': return '🏆'
            default: return '📦'
        }
    }

    const getTierColor = (tierId: string) => {
        switch (tierId) {
            case 'basic': return 'bg-gray-500/10 text-gray-700 border-gray-500/30'
            case 'custom': return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30'
            case 'whitelabel': return 'bg-amber-500/10 text-amber-700 border-amber-500/30'
            default: return 'bg-gray-500/10 text-gray-700'
        }
    }

    const filteredOrgs = organizations.filter(org => {
        const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesTier = filterTier === "all" || org.branding_tier_id === filterTier

        return matchesSearch && matchesTier
    })

    if (loading) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">Planes de Branding</h2>
                    <p className="text-sm text-muted-foreground">
                        Gestiona suscripciones, niveles y monetización de marca.
                    </p>
                </div>
            </div>

            {/* Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Mensual</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${revenue?.total_monthly_revenue?.toFixed(2) || "0.00"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Por branding
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {revenue?.active_subscriptions || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Organizaciones de pago
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversión</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {organizations.length > 0
                                ? ((revenue?.active_subscriptions || 0) / organizations.length * 100).toFixed(1)
                                : "0"
                            }%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Free vs Paid
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tier Catalog */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-sm font-semibold text-muted-foreground">Catálogo de Niveles</h2>
                    <ScrollArea className="h-[500px]">
                        <div className="space-y-4 pr-4">
                            {tiers.map((tier) => (
                                <Card key={tier.id} className={`relative overflow-hidden ${tier.id === 'whitelabel' ? 'border-amber-500/50' : ''}`}>
                                    {tier.id === 'whitelabel' && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white px-2 py-0.5 text-[10px] font-bold rounded-bl">
                                            PREMIUM
                                        </div>
                                    )}
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl">{getTierIcon(tier.id)}</span>
                                            <CardTitle className="text-base">{tier.display_name}</CardTitle>
                                        </div>
                                        <div className="text-2xl font-bold">
                                            ${tier.price_monthly}
                                            <span className="text-xs font-normal text-muted-foreground ml-1">/mo</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <div className="space-y-1.5 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                {tier.features.custom_logo ? '✅' : '❌'} Custom Logo
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {tier.features.custom_colors ? '✅' : '❌'} Custom Colors
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {tier.features.custom_domain ? '✅' : '❌'} Custom Domain
                                            </div>
                                            {tier.id === 'whitelabel' && (
                                                <div className="flex items-center gap-2 font-medium text-amber-600">
                                                    ✅ White-label Total
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Organizations List */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground">Asignación por Organización</h2>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 w-48 h-8 text-xs"
                                />
                            </div>
                            <Select value={filterTier} onValueChange={setFilterTier}>
                                <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue placeholder="Nivel" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                    <SelectItem value="whitelabel">White Label</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <ScrollArea className="h-[500px] rounded-lg border bg-card/50">
                        <div className="p-4 space-y-2">
                            {filteredOrgs.map((org) => (
                                <div key={org.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium truncate">{org.name}</span>
                                            <Badge variant="secondary" className={`text-[10px] h-5 ${getTierColor(org.branding_tier_id)}`}>
                                                {org.branding_tier?.display_name}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono truncate">@{org.slug}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={org.branding_tier_id}
                                            onValueChange={(value) => handleUpgradeTier(org.id, value)}
                                            disabled={upgrading === org.id}
                                        >
                                            <SelectTrigger className="w-32 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {tiers.map((tier) => (
                                                    <SelectItem key={tier.id} value={tier.id}>
                                                        {getTierIcon(tier.id)} {tier.display_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {upgrading === org.id && (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredOrgs.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    No se encontraron organizaciones
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </Card>
    )
}
