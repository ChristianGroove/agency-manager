
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                        <div>
                            <Skeleton className="h-8 w-32 mb-2" />
                            <Skeleton className="h-3 w-40" />
                        </div>
                    </Card>
                ))}
            </div>

            {/* Hero Section */}
            <div className="flex gap-8 flex-col lg:flex-row">
                {/* Revenue Hero */}
                <Card className="flex-1 p-8">
                    <div className="space-y-6">
                        <Skeleton className="h-6 w-48" />
                        <div className="flex items-baseline gap-2">
                            <Skeleton className="h-16 w-64" />
                            <Skeleton className="h-6 w-12" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-20 w-full rounded-xl" />
                        </div>
                    </div>
                </Card>

                {/* Social Placeholder */}
                <div className="hidden lg:block">
                    <Skeleton className="h-[300px] w-[350px] rounded-3xl" />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}
