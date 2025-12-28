import { getCurrentOrganizationId } from "@/lib/actions/organizations"
import { getFieldOpsAppointments } from "@/app/actions/ops-actions"
import { requireModule } from "@/lib/server-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const metadata = {
    title: "Operaciones de Campo | Field Services",
    description: "Visualiza rutas y asignaciones en tiempo real",
}

export default async function FieldOpsPage() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    await requireModule("module_field_ops")

    const appointments = await getFieldOpsAppointments(orgId)

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            <div className="border-b px-6 py-4 flex justify-between items-center bg-background z-10">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Operaciones de Campo</h2>
                    <p className="text-sm text-muted-foreground">Monitor en tiempo real</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">Hoy</Badge>
                    <span className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
                {/* Timeline / List Sidebar */}
                <div className="border-r bg-muted/5 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-background">
                        <h3 className="font-medium">Citas del Día ({appointments.length})</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {appointments.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">
                                Sin actividad programada para hoy.
                            </div>
                        ) : (
                            appointments.map((apt: any) => (
                                <Card key={apt.id} className="overflow-hidden">
                                    <div className={`h-1 w-full ${apt.staff?.color ? '' : 'bg-gray-200'}`} style={{ backgroundColor: apt.staff?.color }} />
                                    <CardHeader className="p-3 pb-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-semibold text-sm line-clamp-1">{apt.client?.name}</span>
                                            <Badge variant={apt.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                                                {apt.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
                                        <div className="flex gap-2">
                                            <span>Start: {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {apt.address_text && (
                                            <div className="line-clamp-2">📍 {apt.address_text}</div>
                                        )}
                                        {apt.staff && (
                                            <div className="flex items-center gap-1 mt-2 text-foreground font-medium">
                                                👤 {apt.staff.member?.full_name}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Map Area */}
                <div className="md:col-span-2 bg-slate-50 relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=40.714728,-73.998672&zoom=12&size=800x600&maptype=roadmap&key=YOUR_API_KEY_HERE')] bg-cover opacity-10 grayscale"></div>

                    <div className="z-10 bg-background/90 backdrop-blur border p-8 rounded-lg text-center max-w-md shadow-lg">
                        <div className="mb-4 text-4xl">🗺️</div>
                        <h3 className="text-lg font-semibold mb-2">Integración de Mapa</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Para ver la ubicación en tiempo real de las citas y el personal,
                            configura tu clave de API de Google Maps o Mapbox en los ajustes.
                        </p>
                        <div className="text-xs text-muted-foreground border-t pt-4">
                            Mostrando {appointments.filter((a: any) => a.gps_coordinates).length} citas con ubicación Geoespacial.
                        </div>
                    </div>

                    {/* Mock Pins for effect if appointments exist */}
                    {appointments.map((apt: any, i) => apt.gps_coordinates && (
                        <div key={apt.id} className="absolute w-4 h-4 rounded-full border-2 border-white shadow-sm"
                            style={{
                                backgroundColor: apt.staff?.color || 'red',
                                top: `${50 + (Math.random() * 40 - 20)}%`, // Random fake position mostly center
                                left: `${50 + (Math.random() * 40 - 20)}%`
                            }}
                            title={apt.client?.name}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
