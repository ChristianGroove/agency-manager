"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Plus, Trash2, Edit, GripVertical, Zap, Info } from "lucide-react"
import { upsertAssignmentRule, deleteAssignmentRule, toggleAssignmentRule } from "../assignment-actions"
import { toast } from "sonner"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface AssignmentRule {
    id: string
    name: string
    description?: string
    priority: number
    is_active: boolean
    conditions: any
    strategy: 'round-robin' | 'load-balance' | 'skills-based' | 'specific-agent'
    assign_to?: string[]
}

export function AssignmentRulesManager() {
    const [rules, setRules] = useState<AssignmentRule[]>([])
    const [agents, setAgents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null)
    const [showDialog, setShowDialog] = useState(false)

    useEffect(() => {
        loadRules()
        loadAgents()
    }, [])

    const loadRules = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('assignment_rules')
            .select('*')
            .order('priority', { ascending: true })

        if (!error && data) {
            setRules(data)
        }
        setLoading(false)
    }

    const loadAgents = async () => {
        const { data } = await supabase
            .from('agent_availability')
            .select(`
                agent_id,
                users:agent_id (
                    email,
                    raw_user_meta_data
                )
            `)

        if (data) {
            setAgents(data)
        }
    }

    const handleSaveRule = async (rule: Partial<AssignmentRule>) => {
        const result = await upsertAssignmentRule(rule as any)

        if (result.success) {
            toast.success('Regla guardada correctamente')
            loadRules()
            setShowDialog(false)
            setEditingRule(null)
        } else {
            toast.error(result.error || 'Error al guardar regla')
        }
    }

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta regla?')) return

        const result = await deleteAssignmentRule(ruleId)

        if (result.success) {
            toast.success('Regla eliminada')
            loadRules()
        } else {
            toast.error(result.error || 'Error al eliminar regla')
        }
    }

    const handleToggleRule = async (ruleId: string, isActive: boolean) => {
        const result = await toggleAssignmentRule(ruleId, isActive)

        if (result.success) {
            toast.success(isActive ? 'Regla activada' : 'Regla desactivada')
            loadRules()
        } else {
            toast.error(result.error || 'Error al cambiar estado de regla')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Reglas de Asignación</h2>
                    <p className="text-sm text-muted-foreground">
                        Configura el enrutamiento automático de conversaciones
                    </p>
                </div>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingRule(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Regla
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRule ? 'Editar Regla' : 'Crear Regla de Asignación'}
                            </DialogTitle>
                        </DialogHeader>
                        <RuleEditor
                            rule={editingRule}
                            agents={agents}
                            onSave={handleSaveRule}
                            onCancel={() => {
                                setShowDialog(false)
                                setEditingRule(null)
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rules List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Cargando reglas...</div>
                ) : rules.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Sin Reglas de Asignación</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Crea tu primera regla para automatizar el reparto de chats
                        </p>
                        <Button onClick={() => setShowDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Primera Regla
                        </Button>
                    </Card>
                ) : (
                    rules.map((rule, index) => (
                        <Card key={rule.id} className={`p-4 ${!rule.is_active && 'opacity-60'}`}>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 pt-1">
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{rule.name}</h3>
                                                <Badge variant="outline" className="capitalize">
                                                    {rule.strategy.replace('-', ' ')}
                                                </Badge>
                                                <Badge variant="secondary">
                                                    Prioridad: {rule.priority}
                                                </Badge>
                                            </div>
                                            {rule.description && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {rule.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={rule.is_active}
                                                onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingRule(rule)
                                                    setShowDialog(true)
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteRule(rule.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Conditions Summary */}
                                    {Object.keys(rule.conditions).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {rule.conditions.channel && (
                                                <Badge variant="outline">
                                                    Canal: {rule.conditions.channel.join(', ')}
                                                </Badge>
                                            )}
                                            {rule.conditions.tags && rule.conditions.tags.length > 0 && (
                                                <Badge variant="outline">
                                                    Etiquetas: {rule.conditions.tags.join(', ')}
                                                </Badge>
                                            )}
                                            {rule.conditions.priority && (
                                                <Badge variant="outline">
                                                    Prioridad: {rule.conditions.priority.join(', ')}
                                                </Badge>
                                            )}
                                            {rule.conditions.businessHours && (
                                                <Badge variant="outline">Horario Laboral</Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}

// Rule Editor Component
function RuleEditor({
    rule,
    agents,
    onSave,
    onCancel
}: {
    rule: AssignmentRule | null
    agents: any[]
    onSave: (rule: Partial<AssignmentRule>) => void
    onCancel: () => void
}) {
    const [name, setName] = useState(rule?.name || '')
    const [description, setDescription] = useState(rule?.description || '')
    const [priority, setPriority] = useState(rule?.priority || 100)
    const [strategy, setStrategy] = useState<AssignmentRule['strategy']>(rule?.strategy || 'load-balance')
    const [conditions, setConditions] = useState(rule?.conditions || {})
    const [selectedAgents, setSelectedAgents] = useState<string[]>(rule?.assign_to || [])

    const handleSave = () => {
        if (!name.trim()) {
            toast.error('Nombre de regla requerido')
            return
        }

        onSave({
            ...(rule?.id && { id: rule.id }),
            name,
            description,
            priority,
            strategy,
            conditions,
            assign_to: selectedAgents.length > 0 ? selectedAgents : undefined
        })
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Nombre de la Regla *</Label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Clientes VIP a Agentes Senior"
                />
            </div>

            <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción opcional"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label>Estrategia</Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="max-w-xs text-xs space-y-1">
                                        <p><strong>Load Balance:</strong> Asigna al agente con menos chats activos.</p>
                                        <p><strong>Round Robin:</strong> Asigna secuencialmente por turnos.</p>
                                        <p><strong>Specific Agent:</strong> Asigna a personas concretas.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <Select value={strategy} onValueChange={(v: any) => setStrategy(v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="load-balance">Load Balance (Equilibrio de Carga)</SelectItem>
                            <SelectItem value="round-robin">Round Robin (Turnos)</SelectItem>
                            <SelectItem value="skills-based">Skills Based (Habilidades)</SelectItem>
                            <SelectItem value="specific-agent">Specific Agent (Específico)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Prioridad (menor = más urgente)</Label>
                    <Slider
                        value={[priority]}
                        onValueChange={(v) => setPriority(v[0])}
                        min={1}
                        max={999}
                        step={1}
                    />
                    <div className="text-xs text-muted-foreground text-right">{priority}</div>
                </div>
            </div>

            <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Condiciones (Cuándo aplicar)</h4>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={conditions.businessHours || false}
                            onCheckedChange={(checked) =>
                                setConditions({ ...conditions, businessHours: checked })
                            }
                        />
                        <Label>Solo en Horario Laboral (9 AM - 5 PM)</Label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button onClick={handleSave}>
                    Guardar Regla
                </Button>
            </div>
        </div>
    )
}
