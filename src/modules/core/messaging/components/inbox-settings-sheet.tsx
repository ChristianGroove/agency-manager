"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, User, Zap, Sparkles } from "lucide-react"
import { AgentWorkloadDashboard } from "./agent-workload-dashboard"
import { AssignmentRulesManager } from "./assignment-rules-manager"
import { Separator } from "@/components/ui/separator"

interface InboxSettingsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function InboxSettingsSheet({ open, onOpenChange }: InboxSettingsSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[800px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <Settings className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 tracking-tight">Configuración del Inbox</SheetTitle>
                                <p className="text-xs text-muted-foreground">Gestiona la disponibilidad y reglas de asignación</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                        <Tabs defaultValue="status" className="h-full flex flex-col">
                            <div className="px-8 pt-6">
                                <TabsList className="bg-gray-100/50 p-1 rounded-xl w-full justify-start max-w-sm">
                                    <TabsTrigger
                                        value="status"
                                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
                                    >
                                        <User className="h-4 w-4 mr-2" />
                                        Estado del Agente
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="rules"
                                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
                                    >
                                        <Zap className="h-4 w-4 mr-2" />
                                        Reglas de Asignación
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <Separator className="mt-6 mb-0" />

                            <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-thin scrollbar-thumb-gray-200">
                                <TabsContent value="status" className="mt-0 space-y-6 max-w-3xl">
                                    <div className="space-y-1 mb-6">
                                        <h3 className="text-lg font-semibold">Tu Disponibilidad</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Controla cómo se te asignan las conversaciones y monitorea la carga del equipo.
                                        </p>
                                    </div>
                                    <AgentWorkloadDashboard />
                                </TabsContent>

                                <TabsContent value="rules" className="mt-0 space-y-6 max-w-3xl">
                                    <div className="space-y-1 mb-6">
                                        <h3 className="text-lg font-semibold">Lógica de Enrutamiento</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Define reglas automáticas para distribuir conversaciones entre los agentes.
                                        </p>
                                    </div>
                                    <AssignmentRulesManager />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
