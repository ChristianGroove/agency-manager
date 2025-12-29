
'use client'

import { DashboardLayout } from "@/modules/core/dashboard/types"
import { DashboardRegistry } from "@/modules/core/dashboard/registry"
import { CleaningStatsWidget } from "./cleaning-stats-widget"
import { CleaningRevenueWidget } from "./cleaning-revenue-widget"

// 1. Define the unique configuration for the Cleaning Vertical
export const CLEANING_DASHBOARD_CONFIG: DashboardLayout = {
    id: "cleaning_main",
    name: "Panel de Control de Limpieza",
    rows: [
        {
            columns: [
                { widget: "cleaning_stats_summary", span: 4 }
            ]
        },
        {
            columns: [
                { widget: "cleaning_revenue_chart", span: 2 },
                // Placeholder for future widgets
                // { widget: "cleaning_staff_availability", span: 2 }
            ]
        }
    ]
}

// 2. Function to register these widgets (called once/lazy)
export function registerCleaningWidgets() {
    DashboardRegistry.register("cleaning_stats_summary", CleaningStatsWidget)
    DashboardRegistry.register("cleaning_revenue_chart", CleaningRevenueWidget)
}
