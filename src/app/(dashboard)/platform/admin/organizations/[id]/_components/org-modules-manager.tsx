"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOrgModuleOverrides } from "@/modules/core/admin/actions"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Module {
    key: string
    name: string
    category: string
    description: string
}

interface OrgModulesManagerProps {
    orgId: string
    allModules: Module[]
    manualOverrides: string[] | null
}

export function OrgModulesManager({ orgId, allModules, manualOverrides }: OrgModulesManagerProps) {
    // Ensure manualOverrides is an array
    const [selected, setSelected] = useState<string[]>(Array.isArray(manualOverrides) ? manualOverrides : [])
    const [loading, setLoading] = useState(false)

    // Group modules by category
    const grouped = allModules.reduce((acc, mod) => {
        if (!acc[mod.category]) acc[mod.category] = []
        acc[mod.category].push(mod)
        return acc
    }, {} as Record<string, Module[]>)

    const toggleModule = (key: string) => {
        if (selected.includes(key)) {
            setSelected(selected.filter(k => k !== key))
        } else {
            setSelected([...selected, key])
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            await updateOrgModuleOverrides(orgId, selected)
            toast.success("Módulos actualizados correctamente")
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Feature Flags (Overrides)</CardTitle>
                <CardDescription>
                    Activa manualmente módulos para esta organización, ignorando su plan de suscripción actual.
                    <br />
                    <span className="text-amber-600 font-medium">Nota: Estos cambios son permanentes hasta que se desactiven aquí.</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {Object.entries(grouped).map(([category, modules]) => (
                        <div key={category} className="space-y-3">
                            <h3 className="font-semibold capitalize text-sm text-muted-foreground border-b pb-1">
                                {category.replace('_', ' ')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {modules.map((mod) => (
                                    <div key={mod.key} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <Checkbox
                                            id={mod.key}
                                            checked={selected.includes(mod.key)}
                                            onCheckedChange={() => toggleModule(mod.key)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label
                                                htmlFor={mod.key}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {mod.name}
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                {mod.description || mod.key}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
