'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Activity,
    Server,
    Globe,
    Shield,
    CheckCircle,
    AlertTriangle,
    Database,
    Zap
} from 'lucide-react';

export default function InfraTab() {
    return (
        <div className="space-y-6">
            {/* System Status Overview */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">API Uptime</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">99.99%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                                <p className="text-2xl font-bold">45ms</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Server Health */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        Server Health
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>CPU Usage</span>
                            <span className="font-mono">12%</span>
                        </div>
                        <Progress value={12} className="h-2" />
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>Memory Usage</span>
                            <span className="font-mono">4.2GB / 8GB</span>
                        </div>
                        <Progress value={52} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            {/* Webhook Status */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Webhook Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Meta Webhook</p>
                            <p className="text-xs text-muted-foreground">Receive messages & statuses</p>
                        </div>
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 pt-3">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Events Dropped</p>
                            <p className="text-xs text-muted-foreground">Last 24 hours</p>
                        </div>
                        <span className="font-mono text-sm">0</span>
                    </div>
                </CardContent>
            </Card>

            {/* Security Compliance */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Security & Compliance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Data Encryption (At Rest & Transit)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>GDPR Compliant Data Processing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Audit Logging Enabled</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
