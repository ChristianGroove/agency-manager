"use client"

import { useEffect, useState } from "react"
import { getPayrollPeriods, createPayrollPeriod, processPayrollPeriod } from "../../actions/payroll-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function PayrollPeriods({ onSelectPeriod }: { onSelectPeriod?: (periodId: string) => void }) {
    const [periods, setPeriods] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        loadPeriods()
    }, [])

    const loadPeriods = async () => {
        setIsLoading(true)
        try {
            const data = await getPayrollPeriods()
            setPeriods(data)
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar períodos")
        } finally {
            setIsLoading(false)
        }
    }

    const handleProcess = async (periodId: string) => {
        if (!confirm("¿Procesar nómina para este período? Esto creará liquidaciones para todo el personal.")) return

        setProcessingId(periodId)
        try {
            const result = await processPayrollPeriod(periodId)
            if (result.success) {
                toast.success(`Nómina procesada: ${result.settlementsCount} liquidaciones creadas`)
                loadPeriods()
            } else {
                toast.error(result.error || "Error al procesar nómina")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setProcessingId(null)
        }
    }

    const getStatusBadge = (status: string) => {
        const variants: any = {
            open: { variant: "default", label: "Abierto" },
            closed: { variant: "secondary", label: "Cerrado" },
            processing: { variant: "outline", label: "En Proceso" },
            paid: { variant: "outline", label: "Pagado", className: "bg-green-50 text-green-700" }
        }
        const config = variants[status] || variants.open
        return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
                ))}
            </div>
        )
    }

    if (periods.length === 0) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <h3 className="text-lg font-medium mb-2">No hay períodos de nómina</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Crea el primer período para comenzar a gestionar pagos
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {periods.map((period) => (
                <Card key={period.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold">{period.period_name}</h3>
                                    {getStatusBadge(period.status)}
                                </div>
                                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                    <span>
                                        {format(new Date(period.period_start), "d MMM", { locale: es })} - {format(new Date(period.period_end), "d MMM yyyy", { locale: es })}
                                    </span>
                                    {period.total_hours > 0 && (
                                        <>
                                            <span>•</span>
                                            <span className="font-medium text-foreground">{period.total_hours.toFixed(1)}h</span>
                                            {period.total_amount > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-medium text-foreground">${period.total_amount.toLocaleString()}</span>
                                                </>
                                            )}
                                            {period.staff_count > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{period.staff_count} trabajadores</span>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {period.status === 'open' && (
                                    <Button
                                        onClick={() => handleProcess(period.id)}
                                        disabled={processingId === period.id}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {processingId === period.id ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando...</>
                                        ) : (
                                            <><Play className="h-4 w-4 mr-2" /> Procesar Nómina</>
                                        )}
                                    </Button>
                                )}
                                {(period.status === 'processing' || period.status === 'paid') && onSelectPeriod && (
                                    <Button
                                        variant="outline"
                                        onClick={() => onSelectPeriod(period.id)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" /> Ver Liquidaciones
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
