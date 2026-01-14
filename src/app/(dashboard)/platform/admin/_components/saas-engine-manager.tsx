"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AppsList } from "../apps/_components/apps-list"
import { FeatureFlagsManager } from "@/modules/core/admin/components/feature-flags-manager"
import { Boxes, Settings2, Palette, Crown, DollarSign, CreditCard } from "lucide-react"
import { GlobalBrandingManager } from "./global-branding-manager"
import { BrandingPlansManager } from "./branding-plans-manager"
import { SettlementsManager } from "./settlements-manager"
import { PaymentSettingsManager } from "./payment-settings-manager"

interface SaasEngineManagerProps {
    allModules: any[]
    apps: any[]
    dict: any
}

export function SaasEngineManager({ allModules, apps, dict }: SaasEngineManagerProps) {
    return (
        <Card className="border-none shadow-none bg-transparent">
            {/* Header section removed as it's redundant with tabs */}

            <Tabs defaultValue="apps" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 h-10 rounded-lg">
                    <TabsTrigger value="apps" className="gap-2">
                        <Boxes className="h-4 w-4" />
                        Apps & Módulos
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
                </TabsList>

                <TabsContent value="apps" className="space-y-4 focus-visible:outline-none">
                    <Card>
                        <CardHeader>
                            <CardTitle>Catálogo de Aplicaciones</CardTitle>
                            <CardDescription>
                                Diferentes "sabores" del SaaS disponibles para las organizaciones (Agency, Clinic, Real Estate, etc.).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 p-4 rounded-lg mb-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    💡 Las aplicaciones definen qué módulos se activan por defecto al crear una nueva organización.
                                </p>
                            </div>
                            {/* We reuse the existing AppsList but mounted here */}
                            <AppsList initialApps={apps} dict={dict} />
                        </CardContent>
                    </Card>
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
            </Tabs>
        </Card>
    )
}

