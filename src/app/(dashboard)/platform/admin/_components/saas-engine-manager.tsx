"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AppsList } from "../apps/_components/apps-list"
import { FeatureFlagsManager } from "@/modules/core/admin/components/feature-flags-manager"
import { Boxes, Settings2, Palette, Crown, DollarSign, CreditCard, LayoutGrid, Package, ShieldAlert, Brain } from "lucide-react"
import { GlobalBrandingManager } from "./global-branding-manager"
import { BrandingPlansManager } from "./branding-plans-manager"
import { SettlementsManager } from "./settlements-manager"
import { PaymentSettingsManager } from "./payment-settings-manager"
import { ModulesAddonsManager } from "./modules-addons-manager"
import { PlatformSubscriptionManager } from "./platform-subscription-manager"
import { SaasIntelligence } from "./saas-intelligence"
import type { Module360Data } from "@/modules/core/admin/actions"

interface SaasEngineManagerProps {
    allModules: any[]
    apps: any[]
    dict: any
    modules360: Module360Data[]
    intelligenceData: any
}

export function SaasEngineManager({ allModules, apps, dict, modules360, intelligenceData }: SaasEngineManagerProps) {
    return (
        <Card className="border-none shadow-none bg-transparent">
            {/* Header section removed as it's redundant with tabs */}

            <Tabs defaultValue="spaces" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 h-10 flex flex-wrap h-auto rounded-lg">
                    <TabsTrigger value="spaces" className="gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Spaces
                    </TabsTrigger>
                    <TabsTrigger value="modules" className="gap-2">
                        <Package className="h-4 w-4" />
                        Módulos y Add-ons
                    </TabsTrigger>
                    <TabsTrigger value="branding" className="gap-2">
                        <Palette className="h-4 w-4" />
                        Marca Global
                    </TabsTrigger>
                    <TabsTrigger value="plans" className="gap-2">
                        <Crown className="h-4 w-4" />
                        Planes
                    </TabsTrigger>
                    <TabsTrigger value="revenue" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Revenue
                    </TabsTrigger>
                    <TabsTrigger value="global-flags" className="gap-2">
                        <Settings2 className="h-4 w-4" />
                        Feature Flags
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Pagos
                    </TabsTrigger>
                    <TabsTrigger value="platform-subs" className="gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Plataforma
                    </TabsTrigger>
                    <TabsTrigger value="intelligence" className="gap-2 text-primary font-bold">
                        <Brain className="h-4 w-4" />
                        Intelligence 🚀
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="spaces" className="space-y-4 focus-visible:outline-none">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestión de Spaces</CardTitle>
                            <CardDescription>
                                Diferentes configuraciones y "sabores" del SaaS disponibles para las organizaciones (Agency, Clinic, Real Estate, etc.).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 p-4 rounded-lg mb-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    💡 Los Spaces definen qué módulos base se activan por defecto al crear o migrar una organización.
                                </p>
                            </div>
                            {/* We reuse the existing AppsList but mounted here */}
                            <AppsList initialApps={apps} dict={dict} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="modules" className="focus-visible:outline-none">
                    <ModulesAddonsManager modulesData={modules360} />
                </TabsContent>

                <TabsContent value="branding" className="focus-visible:outline-none">
                    <GlobalBrandingManager />
                </TabsContent>

                <TabsContent value="plans" className="focus-visible:outline-none">
                    <BrandingPlansManager />
                </TabsContent>

                <TabsContent value="revenue" className="focus-visible:outline-none">
                    <SettlementsManager />
                </TabsContent>

                <TabsContent value="global-flags" className="space-y-4 focus-visible:outline-none">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración Global de Features</CardTitle>
                            <CardDescription>
                                Controla la disponibilidad de features a nivel de sistema. (Nota: Esto afecta los valores por defecto).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-12 text-center border-2 border-dashed rounded-lg">
                                <Settings2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium">Configuración Global en Desarrollo</h3>
                                <p className="text-muted-foreground max-w-md mx-auto mt-2">
                                    Actualmente los feature flags se gestionan por organización. La gestión de defaults globales se implementará en la siguiente fase.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments" className="focus-visible:outline-none">
                    <PaymentSettingsManager />
                </TabsContent>

                <TabsContent value="platform-subs" className="focus-visible:outline-none">
                    <PlatformSubscriptionManager />
                </TabsContent>

                <TabsContent value="intelligence" className="focus-visible:outline-none">
                    <SaasIntelligence data={intelligenceData} />
                </TabsContent>
            </Tabs>
        </Card>
    )
}

