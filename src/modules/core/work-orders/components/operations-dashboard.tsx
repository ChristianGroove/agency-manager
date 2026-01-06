"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar as CalendarIcon, List as ListIcon } from "lucide-react"

import { JobsList } from "./jobs-list"
import { OperationsCalendar } from "./operations-calendar"
import { CreateWorkOrderSheet } from "./universal/create-work-order-sheet"

export function OperationsDashboard() {
    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Operaciones</h2>
                    <p className="text-muted-foreground">
                        Gestiona órdenes de trabajo y calendario operativo.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <CreateWorkOrderSheet>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Orden
                        </Button>
                    </CreateWorkOrderSheet>
                </div>
            </div>

            <Tabs defaultValue="list" className="flex-1 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-gray-100 dark:bg-white/10 p-1">
                        <TabsTrigger value="list" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 dark:text-gray-300 dark:data-[state=active]:text-white">
                            <ListIcon className="mr-2 h-4 w-4" />
                            Lista
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 dark:text-gray-300 dark:data-[state=active]:text-white">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Calendario
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="list" className="flex-1">
                    <Card className="h-full flex flex-col bg-white dark:bg-white/5 dark:border-white/10 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="text-gray-900 dark:text-white">Trabajos Activos</CardTitle>
                            <CardDescription>
                                Lista de órdenes de trabajo en curso y pendientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto">
                            <JobsList viewMode="list" />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="calendar" className="flex-1 h-full">
                    <OperationsCalendar />
                </TabsContent>
            </Tabs>
        </div>
    )
}
