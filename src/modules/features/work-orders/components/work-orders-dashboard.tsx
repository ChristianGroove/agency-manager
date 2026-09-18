
"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServiceList } from "./services/service-list"
import { StaffList } from "./staff/staff-list"
import { JobsList } from "./jobs-list"
import { OperationsCalendar } from "./operations-calendar"
// import { OperationsDashboard } from "./operations-dashboard"
import { PayrollStaffGrid } from "./payroll/payroll-staff-grid"
import { NewJobModal } from "./new-job-modal"
import { Sparkles, Users, Calendar, List, Columns, DollarSign } from "lucide-react"
import { SectionHeader } from "@/components/layout/section-header"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Dynamic Dashboard Imports REMOVED
// import { DashboardEngine } from "@/modules/core/dashboard/engine"
// import { CLEANING_DASHBOARD_CONFIG, registerCleaningWidgets } from "../widgets"

// Initialize widgets REMOVED
// registerCleaningWidgets()

export function WorkOrdersDashboard() {
    const [operationsView, setOperationsView] = useState<'list' | 'grid' | 'calendar'>('list')
    const [servicesView, setServicesView] = useState<'list' | 'grid'>('list')
    const [staffView, setStaffView] = useState<'list' | 'grid'>('list')
    const [payrollView, setPayrollView] = useState<'list' | 'grid'>('list')
    const [activeTab, setActiveTab] = useState('operations')

    const currentView = activeTab === 'operations' ? operationsView :
        activeTab === 'services' ? servicesView :
            activeTab === 'staff' ? staffView : payrollView

    const setCurrentView = (view: 'list' | 'grid' | 'calendar') => {
        if (activeTab === 'operations') setOperationsView(view as 'list' | 'grid' | 'calendar')
        else if (activeTab === 'services') setServicesView(view as 'list' | 'grid')
        else if (activeTab === 'staff') setStaffView(view as 'list' | 'grid')
        else if (activeTab === 'payroll') setPayrollView(view as 'list' | 'grid')
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            {/* Standardized Header */}
            <div className="shrink-0 space-y-1 mb-6">
                <SectionHeader
                    title="Vertical de Limpieza"
                    subtitle="Gestiona operaciones, personal y nómina desde un solo lugar."
                    icon={Sparkles}
                    action={<NewJobModal />}
                />
            </div>

            {/* Tabs and Content */}
            <Tabs defaultValue="operations" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
                <div className="shrink-0 mb-6">
                    <div className="flex items-center justify-between">
                        <TabsList className="grid w-full max-w-[800px] grid-cols-4">
                            <TabsTrigger value="operations" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Operaciones
                            </TabsTrigger>
                            <TabsTrigger value="services" className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Servicios
                            </TabsTrigger>
                            <TabsTrigger value="staff" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Personal
                            </TabsTrigger>
                            <TabsTrigger value="payroll" className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Nómina
                            </TabsTrigger>
                        </TabsList>

                        {/* View Switcher */}
                        <TooltipProvider delayDuration={150}>
                            <div className="flex items-center bg-muted/60 dark:bg-white/5 p-1 rounded-xl border border-border/50">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setCurrentView('list')}
                                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${currentView === 'list' ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                                            aria-label="Vista de Lista"
                                        >
                                            <List className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <span>Vista de Lista</span>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => setCurrentView('grid')}
                                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${currentView === 'grid' ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                                            aria-label="Vista de Cards"
                                        >
                                            <Columns className="h-4 w-4 rotate-90" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <span>Vista de Tarjetas</span>
                                    </TooltipContent>
                                </Tooltip>

                                {activeTab === 'operations' && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => setCurrentView('calendar')}
                                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${currentView === 'calendar' ? 'bg-white dark:bg-zinc-800 text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                                                aria-label="Vista de Calendario"
                                            >
                                                <Calendar className="h-4 w-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <span>Vista de Calendario</span>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Tab Content - Scrollable */}
                <div className="flex-1 overflow-auto">
                    <TabsContent value="operations" className="space-y-4 outline-none mt-0">
                        {/* Only Operations Views - No Dashboard Engine */}
                        <div className="mt-0">
                            {operationsView === 'list' ? <JobsList viewMode="list" /> :
                                operationsView === 'grid' ? <JobsList viewMode="grid" /> :
                                    <OperationsCalendar />}
                        </div>
                    </TabsContent>

                    <TabsContent value="services" className="space-y-4 outline-none mt-0">
                        <ServiceList viewMode={servicesView} />
                    </TabsContent>

                    <TabsContent value="staff" className="space-y-4 outline-none mt-0">
                        <StaffList viewMode={staffView} />
                    </TabsContent>

                    <TabsContent value="payroll" className="space-y-4 outline-none mt-0">
                        <PayrollStaffGrid viewMode={payrollView} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
