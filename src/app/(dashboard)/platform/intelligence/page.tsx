import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Cpu, Coins, Mic, Power } from 'lucide-react';
import { AiAnalyticsService, AiConfigService } from '@/modules/assistant/services';

import { ModelSwitchboard } from './ModelSwitchboard';
import { AdminPlayground } from './AdminPlayground';

export default async function IntelligencePage() {
    // 1. Fetch Real Data with 0 caching (Realtime Dashboard)
    const metrics = await AiAnalyticsService.getOverviewMetrics();
    const globalSettings = await AiConfigService.getEffectiveSettings('system'); // Global settings context

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Sesiones de Voz"
                    value={metrics.activeSessions.toString()}
                    description="Activas ahora"
                    icon={Mic}
                    active={metrics.activeSessions > 0}
                />
                <KpiCard
                    title="Tokens (24h)"
                    value={metrics.tokens24h.toLocaleString()}
                    description="Agente de Texto y Voz"
                    icon={Cpu}
                />
                <KpiCard
                    title="Costo Estimado"
                    value={`$${metrics.cost24h.toFixed(4)}`}
                    description="Texto + Voz"
                    icon={Coins}
                />
                <KpiCard
                    title="Sistema Global"
                    value={globalSettings.is_voice_enabled ? "ONLINE" : "OFFLINE"}
                    description={globalSettings.is_voice_enabled ? "Servicios activos" : "Killswitch activado"}
                    icon={Power}
                    active={globalSettings.is_voice_enabled}
                    colorClass={globalSettings.is_voice_enabled ? "text-green-500" : "text-red-500"}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-3 lg:h-[500px]">
                {/* Main Switchboard (Takes 2 cols) */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <ModelSwitchboard initialSettings={globalSettings} />

                    <Card className="flex-1 flex items-center justify-center border-dashed bg-muted/20">
                        <div className="text-center">
                            <Activity className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground font-medium">Salud del Sistema</p>
                            <p className="text-xs text-muted-foreground mt-2 text-green-600">● All systems normal</p>
                        </div>
                    </Card>
                </div>

                {/* Playground (Takes 2 cols) */}
                <div className="md:col-span-2 h-full">
                    <AdminPlayground />
                </div>
            </div>

            {/* Placeholder for future sections */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="h-[300px] flex items-center justify-center border-dashed bg-muted/20">
                    <div className="text-center">
                        <Activity className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground font-medium">Gráfica de Uso</p>
                        <p className="text-xs text-muted-foreground">Datos históricos próximamente</p>
                    </div>
                </Card>
                <Card className="h-[300px] flex items-center justify-center border-dashed bg-muted/20">
                    <div className="text-center">
                        <Cpu className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground font-medium">Distribución de Modelos</p>
                        <p className="text-xs text-muted-foreground">Voz vs Texto</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function KpiCard({ title, value, description, icon: Icon, active, colorClass }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${colorClass || (active ? 'text-green-500 animate-pulse' : 'text-muted-foreground')}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}
