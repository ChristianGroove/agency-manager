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
import { Loader2, Crown, Sparkles, Rocket, TrendingUp, DollarSign, Users, Search } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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
    add_ons: Array<{
        add_on_type: string
        tier_id: string
        price_monthly: number
        status: string
    }>
}

export default function BrandingTiersAdminPage() {
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
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/platform/admin">
                            <Button variant="ghost" size="icon" className="-ml-3 h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Branding Tiers Management</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Manage organization branding subscriptions and monitor revenue
                    </p>
                </div>
            </div>

            {/* Revenue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${revenue?.total_monthly_revenue?.toFixed(2) || "0.00"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            From branding subscriptions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {revenue?.active_subscriptions || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Organizations with paid branding
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
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
                            Free to paid conversion
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tier Catalog */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Available Tiers</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {tiers.map((tier) => (
                        <Card key={tier.id} className={`relative overflow-hidden ${tier.id === 'whitelabel' ? 'border-amber-500/50' : ''}`}>
                            {tier.id === 'whitelabel' && (
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
                                    PREMIUM
                                </div>
                            )}
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{getTierIcon(tier.id)}</span>
                                    <CardTitle>{tier.display_name}</CardTitle>
                                </div>
                                <div className="text-3xl font-bold">
                                    ${tier.price_monthly}
                                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                                </div>
                                <CardDescription className="mt-2">
                                    {tier.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        {tier.features.custom_logo ? '✅' : '❌'} Custom Logo
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tier.features.custom_colors ? '✅' : '❌'} Custom Colors
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tier.features.white_label_emails ? '✅' : '❌'} White-label Emails
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tier.features.custom_domain ? '✅' : '❌'} Custom Domain
                                    </div>
                                    {tier.id === 'whitelabel' && (
                                        <div className="flex items-center gap-2">
                                            ✅ Remove All Pixy Branding
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        {revenue?.by_tier?.[tier.id] || 0} organizations
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Organizations List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Organizations</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search organizations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-64"
                            />
                        </div>
                        <Select value={filterTier} onValueChange={setFilterTier}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter by tier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tiers</SelectItem>
                                <SelectItem value="basic">Basic</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                                <SelectItem value="whitelabel">White Label</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredOrgs.map((org) => (
                        <Card key={org.id}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold">{org.name}</h3>
                                            <Badge className={getTierColor(org.branding_tier_id)}>
                                                {getTierIcon(org.branding_tier_id)} {org.branding_tier?.display_name}
                                            </Badge>
                                            {org.branding_tier_id !== 'basic' && (
                                                <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                                                    ${org.branding_tier?.price_monthly}/mo
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground font-mono">@{org.slug}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={org.branding_tier_id}
                                            onValueChange={(value) => handleUpgradeTier(org.id, value)}
                                            disabled={upgrading === org.id}
                                        >
                                            <SelectTrigger className="w-40">
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
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredOrgs.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No organizations found
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
