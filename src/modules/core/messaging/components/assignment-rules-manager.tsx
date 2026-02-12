"use client"

import { useState, useEffect } from "react"
import { Plus, GripVertical, Edit, Trash2, Zap, Info } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n/use-translation"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip"
import {
    upsertAssignmentRule,
    deleteAssignmentRule,
    toggleAssignmentRule,
    getAssignmentRules,
    getAgentsWorkload
} from "../assignment-actions"

interface AssignmentRule {
    id: string
    name: string
    description?: string
    priority: number
    is_active: boolean
    strategy: string
    conditions: any
    assign_to?: string[]
}

export function AssignmentRulesManager() {
    const { t } = useTranslation()
    const [rules, setRules] = useState<AssignmentRule[]>([])
    const [agents, setAgents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [rulesRes, agentsRes] = await Promise.all([
                getAssignmentRules(),
                getAgentsWorkload()
            ])

            if (rulesRes.success) setRules(rulesRes.data || [])
            if (agentsRes.success) setAgents(agentsRes.data || [])
        } catch (error) {
            console.error("Failed to load assignment data:", error)
            toast.error(t('crm.inbox.settings.sections.rules.load_error'))
        } finally {
            setLoading(false)
        }
    }

    const loadRules = async () => {
        const result = await getAssignmentRules()
        if (result.success) {
            setRules(result.data || [])
        }
    }

    const handleSaveRule = async (rule: Partial<AssignmentRule>) => {
        const result = await upsertAssignmentRule(rule as any)

        if (result.success) {
            toast.success(t('crm.inbox.settings.sections.rules.save_success'))
            loadRules()
            setShowDialog(false)
            setEditingRule(null)
        } else {
            toast.error(result.error || t('crm.inbox.settings.sections.rules.save_error'))
        }
    }

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm(t('crm.inbox.settings.sections.rules.delete_confirm'))) return

        const result = await deleteAssignmentRule(ruleId)

        if (result.success) {
            toast.success(t('crm.inbox.settings.sections.rules.delete_success'))
            loadRules()
        } else {
            toast.error(result.error || t('crm.inbox.settings.sections.rules.save_error'))
        }
    }

    const handleToggleRule = async (ruleId: string, isActive: boolean) => {
        const result = await toggleAssignmentRule(ruleId, isActive)

        if (result.success) {
            toast.success(isActive ? t('crm.inbox.context.actions.assigned') : t('crm.inbox.context.actions.unassigned'))
            loadRules()
        } else {
            toast.error(result.error || t('crm.inbox.settings.sections.rules.save_error'))
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{t('crm.inbox.context.sections.assignment')}</h2>
                    <p className="text-sm text-muted-foreground">{t('crm.inbox.chat.templates.manage')}</p>
                </div>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingRule(null)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('crm.inbox.chat.templates.new')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRule ? t('crm.inbox.chat.templates.edit') : t('crm.inbox.chat.templates.new')}
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
                            t={t}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rules List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
                ) : rules.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">{t('crm.inbox.chat.quick_replies.empty')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{t('crm.inbox.chat.templates.manage')}</p>
                        <Button onClick={() => setShowDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('crm.inbox.chat.templates.create_new')}
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
                                                    {rule.strategy}
                                                </Badge>
                                                <Badge variant="secondary">
                                                    {t('crm.inbox.chat.templates.color')}: {rule.priority}
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
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}

function RuleEditor({ rule, agents, onSave, onCancel, t }: any) {
    const [name, setName] = useState(rule?.name || '')
    const [description, setDescription] = useState(rule?.description || '')
    const [priority, setPriority] = useState(rule?.priority || 100)
    const [strategy, setStrategy] = useState<any>(rule?.strategy || 'load-balance')
    const [conditions, setConditions] = useState(rule?.conditions || {})
    const [selectedAgents, setSelectedAgents] = useState<string[]>(rule?.assign_to || [])

    const handleSave = () => {
        if (!name.trim()) {
            toast.error(t('crm.inbox.chat.templates.name'))
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
                <Label>{t('crm.inbox.chat.templates.name')}</Label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('crm.inbox.chat.templates.name_placeholder')}
                />
            </div>

            <div className="space-y-2">
                <Label>{t('crm.inbox.chat.templates.manage')}</Label>
                <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label>{t('crm.inbox.chat.templates.configure')}</Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="max-w-xs text-xs space-y-1">
                                        <p><strong>Strategy:</strong> Best effort assignment</p>
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
                            <SelectItem value="load-balance">Load Balance</SelectItem>
                            <SelectItem value="round-robin">Round Robin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>{t('crm.inbox.chat.templates.color')}</Label>
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

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel}>
                    {t('common.cancel')}
                </Button>
                <Button onClick={handleSave}>
                    {t('common.save')}
                </Button>
            </div>
        </div>
    )
}
