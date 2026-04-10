'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    ShoppingCart,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2
} from 'lucide-react';

interface ConversionStats {
    leads: number;
    purchases: number;
    revenue: number;
    ad_spend: number;
    cpl: number;
    roi: number;
}

interface CampaignData {
    id: string;
    name: string;
    clicks: number;
    leads: number;
    purchases: number;
    revenue: number;
    roi: number;
}

interface AccountHealth {
    quality_rating: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
    messaging_limit: number;
    messaging_limit_tier: string;
    health_status: 'healthy' | 'warning' | 'critical';
    recommendations: string[];
}

export default function MarketingTab() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ConversionStats | null>(null);
    const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
    const [health, setHealth] = useState<AccountHealth | null>(null);

    useEffect(() => {
        loadMarketingData();
    }, []);

    async function loadMarketingData() {
        setLoading(true);

        try {
            // TODO: Replace with actual API calls
            // const statsRes = await fetch('/api/meta/conversions/stats');
            // const campaignsRes = await fetch('/api/meta/campaigns');
            // const healthRes = await fetch('/api/meta/account/health');

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Demo data from reviewer-mode.ts
            const mockStats: ConversionStats = {
                leads: 45,
                purchases: 12,
                revenue: 3599.88,
                ad_spend: 500,
                cpl: 11.11,
                roi: 619.98
            };

            const mockCampaigns: CampaignData[] = [
                {
                    id: 'demo_campaign_1',
                    name: 'New Year Promotion',
                    clicks: 523,
                    leads: 45,
                    purchases: 12,
                    revenue: 3599.88,
                    roi: 619.98
                }
            ];

            const mockHealth: AccountHealth = {
                quality_rating: 'HIGH',
                messaging_limit: 100000,
                messaging_limit_tier: 'TIER_100K',
                health_status: 'healthy',
                recommendations: []
            };

            setStats(mockStats);
            setCampaigns(mockCampaigns);
            setHealth(mockHealth);
        } catch (error) {
            console.error('Failed to load marketing data:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ROI Dashboard Section */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Return on Investment</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* ROI Card */}
                    <Card className="md:col-span-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                    Marketing ROI
                                </p>
                                <p className="text-5xl font-bold text-green-600 dark:text-green-400">
                                    {stats?.roi.toFixed(1)}%
                                </p>
                                <div className="flex items-center justify-center gap-2 mt-3">
                                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                        +45% vs last month
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    ${stats?.revenue.toFixed(2)} revenue on ${stats?.ad_spend.toFixed(2)} spend
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CPL Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Cost Per Lead
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-3xl font-bold">
                                    ${stats?.cpl.toFixed(2)}
                                </p>
                                <Progress
                                    value={stats ? ((15 - stats.cpl) / 15) * 100 : 0}
                                    className="h-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Target: $15.00 ✓ Below target
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Leads Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Total Leads
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <p className="text-3xl font-bold">{stats?.leads}</p>
                                <p className="text-sm text-muted-foreground">
                                    {stats?.purchases} conversions ({stats ? ((stats.purchases / stats.leads) * 100).toFixed(1) : 0}%)
                                </p>
                                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>+12% this month</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Revenue Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" />
                                Revenue Generated
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                    ${stats?.revenue.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    From {stats?.purchases} purchases
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Avg: ${stats && stats.purchases > 0 ? (stats.revenue / stats.purchases).toFixed(2) : '0.00'} per sale
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Separator />

            {/* Attribution Table */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Campaign Attribution</h3>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead className="text-right">Clicks</TableHead>
                                    <TableHead className="text-right">Leads</TableHead>
                                    <TableHead className="text-right">Purchases</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    <TableHead className="text-right">ROI</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {campaigns.map((campaign) => (
                                    <TableRow key={campaign.id}>
                                        <TableCell className="font-medium">{campaign.name}</TableCell>
                                        <TableCell className="text-right">{campaign.clicks}</TableCell>
                                        <TableCell className="text-right">{campaign.leads}</TableCell>
                                        <TableCell className="text-right">{campaign.purchases}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            ${campaign.revenue.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="default" className="bg-green-600 dark:bg-green-700">
                                                {campaign.roi.toFixed(1)}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {campaigns.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No campaigns yet. Create your first marketing campaign to see attribution data.
                    </p>
                )}
            </div>

            <Separator />

            {/* Account Health Monitor */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Account Health</h3>

                <Card>
                    <CardContent className="pt-6 space-y-6">
                        {/* Quality Rating */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold mb-1">Quality Rating</p>
                                <p className="text-sm text-muted-foreground">
                                    WhatsApp Business Account quality score
                                </p>
                            </div>
                            <Badge
                                variant={
                                    health?.quality_rating === 'HIGH' ? 'default' :
                                        health?.quality_rating === 'MEDIUM' ? 'secondary' :
                                            'destructive'
                                }
                                className={
                                    health?.quality_rating === 'HIGH'
                                        ? 'bg-green-600 dark:bg-green-700 text-lg px-4 py-1'
                                        : health?.quality_rating === 'MEDIUM'
                                            ? 'bg-yellow-600 dark:bg-yellow-700 text-lg px-4 py-1'
                                            : 'text-lg px-4 py-1'
                                }
                            >
                                {health?.quality_rating}
                            </Badge>
                        </div>

                        <Separator />

                        {/* Health Status */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold mb-1">Overall Status</p>
                                <p className="text-sm text-muted-foreground">
                                    Account health assessment
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {health?.health_status === 'healthy' && (
                                    <>
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <span className="font-medium text-green-600 dark:text-green-400">Healthy</span>
                                    </>
                                )}
                                {health?.health_status === 'warning' && (
                                    <>
                                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                        <span className="font-medium text-yellow-600 dark:text-yellow-400">Warning</span>
                                    </>
                                )}
                                {health?.health_status === 'critical' && (
                                    <>
                                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        <span className="font-medium text-red-600 dark:text-red-400">Critical</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Messaging Limit */}
                        <div>
                            <div className="flex justify-between mb-3">
                                <div>
                                    <p className="font-semibold mb-1">Messaging Limit</p>
                                    <p className="text-sm text-muted-foreground">
                                        Daily message capacity
                                    </p>
                                </div>
                                <span className="text-sm font-semibold">
                                    {health?.messaging_limit.toLocaleString()}/day
                                </span>
                            </div>
                            <Progress value={85} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-2">
                                Tier: {health?.messaging_limit_tier.replace('TIER_', '')}
                            </p>
                        </div>

                        {/* Recommendations */}
                        {health && health.recommendations.length > 0 && (
                            <>
                                <Separator />
                                <Alert variant="default" className="border-yellow-200 dark:border-yellow-800">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Recommendations</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                                            {health.recommendations.map((rec, i) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            </>
                        )}

                        {health && health.health_status === 'healthy' && health.recommendations.length === 0 && (
                            <Alert className="border-green-200 dark:border-green-800">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-600 dark:text-green-400">All Systems Operational</AlertTitle>
                                <AlertDescription className="text-green-600/80 dark:text-green-400/80">
                                    Your WhatsApp Business Account is in excellent health. Continue following best practices.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
