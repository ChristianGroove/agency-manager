"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Brain, Cpu, TrendingUp, Users } from "lucide-react"

interface SaasIntelligenceProps {
    data: {
        engineStats: Record<string, number>
        topTenants: Array<{ id: string, name: string, quantity: number }>
        totalTokens: number
    }
}

export function SaasIntelligence({ data }: SaasIntelligenceProps) {
    const maxTenantUsage = data.topTenants[0]?.quantity || 1;
    const maxEngineUsage = Math.max(...Object.values(data.engineStats), 1);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens (7d)</CardTitle>
                        <Cpu className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalTokens.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Consumo IA agregado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Motores Activos</CardTitle>
                        <Brain className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Object.keys(data.engineStats).length}</div>
                        <p className="text-xs text-muted-foreground">SaaS Engines reportando uso</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costo Estimado</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${((data.totalTokens / 1000000) * 0.20).toFixed(4)}</div>
                        <p className="text-xs text-muted-foreground">Basado en promedio ponderado</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Consumo por Motor</CardTitle>
                        <CardDescription>Distribución de carga entre los motores del SaaS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(data.engineStats).map(([engine, quantity]) => (
                                <div key={engine} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium capitalize">{engine} Engine</span>
                                        <span className="text-muted-foreground">{quantity.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-500" 
                                            style={{ width: `${(quantity / maxEngineUsage) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {Object.keys(data.engineStats).length === 0 && (
                                <p className="text-center text-muted-foreground py-8">Sin datos de uso recientes.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Organizations (AI)</CardTitle>
                        <CardDescription>Tenants con mayor consumo de Inteligencia Artificial.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.topTenants.map((tenant) => (
                                <div key={tenant.id} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium">{tenant.name}</span>
                                        <span className="text-muted-foreground">{tenant.quantity.toLocaleString()} tokens</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500 transition-all duration-500" 
                                            style={{ width: `${(tenant.quantity / maxTenantUsage) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {data.topTenants.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">Sin datos de tenants recientes.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
