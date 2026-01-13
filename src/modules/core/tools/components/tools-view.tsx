"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, Mail, ExternalLink } from "lucide-react"
import { BrandingConfig } from "@/types/branding"
import { EmailSignatureGenerator } from "@/modules/core/branding/components/email-signature-generator"

interface ToolsViewProps {
    initialSettings: BrandingConfig
}

export function ToolsView({ initialSettings }: ToolsViewProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-brand-pink" />
                        Herramientas
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Utilidades prácticas generadas automáticamente para tu agencia.
                    </p>
                </div>
            </div>

            {/* Tools Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* Email Signature Tool */}
                <Card className="relative transition-all hover:shadow-md hover:border-brand-pink/50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Firma de Correo</CardTitle>
                                <Badge variant="secondary" className="text-[10px] mt-1">
                                    Productividad
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <CardDescription className="line-clamp-2 min-h-[40px]">
                            Genera firmas HTML estandarizadas para tu equipo usando la identidad de tu marca.
                        </CardDescription>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <EmailSignatureGenerator
                            settings={initialSettings}
                            trigger={
                                <Button className="w-full gap-2 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-white dark:border-zinc-800 dark:hover:bg-zinc-800">
                                    <ExternalLink className="h-4 w-4" />
                                    Abrir Generador
                                </Button>
                            }
                        />
                    </CardFooter>
                </Card>

                {/* Coming Soon Placeholders */}
                <Card className="relative opacity-60 bg-gray-50 dark:bg-zinc-900/50 border-dashed">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Sparkles className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                                <CardTitle className="text-base text-gray-500">Próximamente</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Más herramientas de productividad en desarrollo...
                        </CardDescription>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
