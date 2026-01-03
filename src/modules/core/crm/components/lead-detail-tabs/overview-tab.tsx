'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Edit, Save, X, Tag, DollarSign, Calendar, Target } from 'lucide-react'
import type { LeadWithRelations } from '@/types/crm-advanced'
import { updateLead } from '../../crm-advanced-actions'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface LeadOverviewTabProps {
    lead: LeadWithRelations
    onUpdate: () => void
}

export function LeadOverviewTab({ lead, onUpdate }: LeadOverviewTabProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        name: lead.name,
        company_name: lead.company_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        notes: lead.notes || '',
        source: lead.source || '',
        estimated_value: lead.estimated_value || '',
        next_follow_up_at: lead.next_follow_up_at ? format(new Date(lead.next_follow_up_at), 'yyyy-MM-dd') : '',
        tags: lead.tags?.join(', ') || ''
    })
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        try {
            const result = await updateLead(lead.id, {
                name: formData.name,
                company_name: formData.company_name || undefined,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                notes: formData.notes || undefined,
                source: formData.source || undefined,
                estimated_value: formData.estimated_value ? Number(formData.estimated_value) : undefined,
                next_follow_up_at: formData.next_follow_up_at || undefined,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined
            })

            if (result.success) {
                toast.success('Lead actualizado')
                setIsEditing(false)
                onUpdate()
            } else {
                toast.error(result.error || 'Error al actualizar')
            }
        } catch (error) {
            console.error('Error updating lead:', error)
            toast.error('Error al actualizar')
        } finally {
            setSaving(false)
        }
    }

    function handleCancel() {
        setFormData({
            name: lead.name,
            company_name: lead.company_name || '',
            email: lead.email || '',
            phone: lead.phone || '',
            notes: lead.notes || '',
            source: lead.source || '',
            estimated_value: lead.estimated_value || '',
            next_follow_up_at: lead.next_follow_up_at ? format(new Date(lead.next_follow_up_at), 'yyyy-MM-dd') : '',
            tags: lead.tags?.join(', ') || ''
        })
        setIsEditing(false)
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Información del Lead</h3>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button onClick={handleSave} size="sm" disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Guardando...' : 'Guardar'}
                        </Button>
                        <Button onClick={handleCancel} variant="outline" size="sm" disabled={saving}>
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                        </Button>
                    </div>
                )}
            </div>

            {/* Basic Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nombre *</Label>
                            {isEditing ? (
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nombre completo"
                                />
                            ) : (
                                <p className="text-sm font-medium">{lead.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Empresa</Label>
                            {isEditing ? (
                                <Input
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                    placeholder="Nombre de la empresa"
                                />
                            ) : (
                                <p className="text-sm">{lead.company_name || '-'}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Email</Label>
                            {isEditing ? (
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                />
                            ) : (
                                <p className="text-sm">{lead.email || '-'}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Teléfono</Label>
                            {isEditing ? (
                                <Input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+57 300 123 4567"
                                />
                            ) : (
                                <p className="text-sm">{lead.phone || '-'}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notas</Label>
                        {isEditing ? (
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Notas principales sobre este lead..."
                                rows={3}
                            />
                        ) : (
                            <p className="text-sm whitespace-pre-wrap">{lead.notes || '-'}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Lead Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Lead</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Fuente
                            </Label>
                            {isEditing ? (
                                <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar fuente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="website">Sitio Web</SelectItem>
                                        <SelectItem value="referral">Referido</SelectItem>
                                        <SelectItem value="cold_call">Llamada en Frío</SelectItem>
                                        <SelectItem value="social_media">Redes Sociales</SelectItem>
                                        <SelectItem value="organic">Orgánico</SelectItem>
                                        <SelectItem value="paid_ad">Publicidad Pagada</SelectItem>
                                        <SelectItem value="event">Evento</SelectItem>
                                        <SelectItem value="other">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm capitalize">{lead.source || '-'}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Valor Estimado
                            </Label>
                            {isEditing ? (
                                <Input
                                    type="number"
                                    value={formData.estimated_value}
                                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                                    placeholder="0.00"
                                />
                            ) : (
                                <p className="text-sm">
                                    {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Próximo Seguimiento
                            </Label>
                            {isEditing ? (
                                <Input
                                    type="date"
                                    value={formData.next_follow_up_at}
                                    onChange={(e) => setFormData({ ...formData, next_follow_up_at: e.target.value })}
                                />
                            ) : (
                                <p className="text-sm">
                                    {lead.next_follow_up_at ? format(new Date(lead.next_follow_up_at), 'dd/MM/yyyy') : '-'}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Tags
                            </Label>
                            {isEditing ? (
                                <Input
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="vip, enterprise, urgente"
                                />
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {lead.tags && lead.tags.length > 0 ? (
                                        lead.tags.map(tag => (
                                            <Badge key={tag} variant="secondary">{tag}</Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">-</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Score Breakdown */}
            {lead.score !== undefined && lead.score_factors && (
                <Card>
                    <CardHeader>
                        <CardTitle>Desglose del Score</CardTitle>
                        <CardDescription>Factores que contribuyen al score de este lead</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Email</span>
                                <Badge variant={lead.score_factors.hasEmail ? 'default' : 'secondary'}>
                                    {lead.score_factors.hasEmail ? '+10' : '0'}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Teléfono</span>
                                <Badge variant={lead.score_factors.hasPhone ? 'default' : 'secondary'}>
                                    {lead.score_factors.hasPhone ? '+10' : '0'}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Empresa</span>
                                <Badge variant={lead.score_factors.hasCompany ? 'default' : 'secondary'}>
                                    {lead.score_factors.hasCompany ? '+5' : '0'}
                                </Badge>
                            </div>
                            {lead.score_factors.emailDomain === 'business' && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Email Corporativo</span>
                                    <Badge variant="default">+10</Badge>
                                </div>
                            )}
                            {lead.score_factors.pipelineProgress > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Progreso Pipeline</span>
                                    <Badge variant="default">+{lead.score_factors.pipelineProgress}</Badge>
                                </div>
                            )}
                            {lead.score_factors.engagement !== undefined && lead.score_factors.engagement > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Engagement (Actividades)</span>
                                    <Badge variant="default">+{lead.score_factors.engagement}</Badge>
                                </div>
                            )}
                            {lead.score_factors.source && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm capitalize">Fuente: {lead.score_factors.source}</span>
                                    <Badge variant="default">Bonus</Badge>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
