"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkOrdersList } from "./work-orders-list"
import { CreateWorkOrderSheet } from "./create-work-order-sheet"
import { Briefcase, List, LayoutGrid, Calendar } from "lucide-react"

export function WorkOrdersDashboard() {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const [activeTab, setActiveTab] = useState('orders')

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="shrink-0 space-y-1 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Operaciones</h1>
                        <p className="text-muted-foreground">
                            Gestión centralizada de órdenes de trabajo y tareas.
                        </p>
                    </div>
                    <CreateWorkOrderSheet />
                </div>
            </div>

            {/* Tabs and Content */}
            <Tabs defaultValue="orders" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
                <div className="shrink-0 mb-6">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="orders" className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Órdenes de Trabajo
                            </TabsTrigger>
                            <TabsTrigger value="calendar" className="flex items-center gap-2" disabled>
                                <Calendar className="h-4 w-4" />
                                Calendario (Pronto)
                            </TabsTrigger>
                        </TabsList>

                        {/* View Switcher */}
                        {activeTab === 'orders' && (
                            <div className="flex items-center bg-muted p-1 rounded-md">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-sm transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Vista de Lista"
                                >
                                    <List className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-sm transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Vista de Cards"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Content - Scrollable */}
                <div className="flex-1 overflow-auto">
                    <TabsContent value="orders" className="space-y-4 outline-none mt-0 h-full">
                        <WorkOrdersList viewMode={viewMode} />
                    </TabsContent>

                    <TabsContent value="calendar">
                        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                            Vista de calendario en desarrollo para el sistema universal.
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
