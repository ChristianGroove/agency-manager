
'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { getWeeklyRevenue } from "../actions/operation-actions"

export function CleaningRevenueWidget() {
    const [data, setData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const res = await getWeeklyRevenue()
            setData(res)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const maxRevenue = Math.max(...data.map(d => d.revenue), 1)

    if (isLoading) {
        return <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
    }

    return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Ingresos (Últimos 7 días)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-2 h-48 mt-4">
                    {data.map((item, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="w-full relative flex items-end justify-center h-full">
                                <div
                                    className="w-full bg-green-100 hover:bg-green-200 transition-all rounded-t-md relative group-hover:shadow-sm"
                                    style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                                >
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity">
                                        ${item.revenue.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{item.dayName}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
