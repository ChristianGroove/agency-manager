"use client"

import { useState } from "react"
import { PayrollPeriods } from "./payroll-periods"
import { SettlementsList } from "./settlements-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Clock } from "lucide-react"
import { NewPeriodModal } from "./new-period-modal"
import { AddWorkLogModal } from "./add-work-log-modal"

export function PayrollDashboard() {
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
    const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false)
    const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                {selectedPeriodId ? (
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedPeriodId(null)}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Períodos
                    </Button>
                ) : (
                    <div>
                        <h2 className="text-2xl font-bold">Nómina</h2>
                        <p className="text-muted-foreground">Gestión de pagos y liquidaciones de personal</p>
                    </div>
                )}

                {!selectedPeriodId && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsWorkLogModalOpen(true)}
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Agregar Horas
                        </Button>
                        <Button
                            onClick={() => setIsNewPeriodModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Período
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            {selectedPeriodId ? (
                <SettlementsList periodId={selectedPeriodId} />
            ) : (
                <PayrollPeriods onSelectPeriod={setSelectedPeriodId} />
            )}

            {/* New Period Modal */}
            <NewPeriodModal
                open={isNewPeriodModalOpen}
                onOpenChange={setIsNewPeriodModalOpen}
            />

            {/* Add Work Log Modal */}
            <AddWorkLogModal
                open={isWorkLogModalOpen}
                onOpenChange={setIsWorkLogModalOpen}
            />
        </div>
    )
}
