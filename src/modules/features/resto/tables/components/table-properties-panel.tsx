import React from 'react'
import { Node } from '@xyflow/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, X, ExternalLink, Tag, Users, Shapes, QrCode } from 'lucide-react'
import QRCode from 'react-qr-code'

interface TablePropertiesPanelProps {
    node: Node
    orgId: string
    orgSlug?: string
    onClose: () => void
    onUpdate: (nodeId: string, data: Record<string, unknown>) => void
    onDelete: (nodeId: string) => void
}

export function TablePropertiesPanel({ node, orgId, orgSlug, onClose, onUpdate, onDelete }: TablePropertiesPanelProps) {
    const isTable = node.type === 'table'
    const isWall = node.type === 'wall'
    const isDecor = node.type === 'decor'

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pixy.do'
    const tokenToUse = orgSlug || orgId
    const qrUrl = `${baseUrl}/portal/${tokenToUse}?table=${node.data.qrToken || node.data.tableIdentifier || node.id}`

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 text-sm w-72 shadow-lg z-30">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-brand-pink" /> Propiedades
                </span>
                <button onClick={onClose} className="p-1 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isTable && (
                    <>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                                Identificador / Nombre Mesa
                            </label>
                            <Input 
                                value={(node.data.tableIdentifier as string) || (node.data.label as string) || ''} 
                                onChange={(e) => {
                                    const val = e.target.value
                                    onUpdate(node.id, { 
                                        ...node.data, 
                                        tableIdentifier: val, 
                                        label: val 
                                    })
                                }}
                                placeholder="Ej: Mesa 1, M-01, VIP-A"
                                className="h-9 text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 font-medium focus-visible:ring-brand-pink"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-zinc-400" /> Capacidad (Personas / Pax)
                            </label>
                            <Input 
                                type="number"
                                min={1}
                                max={50}
                                value={node.data.capacity as number || 4} 
                                onChange={(e) => onUpdate(node.id, { ...node.data, capacity: parseInt(e.target.value) || 1 })}
                                className="h-9 text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                                <Shapes className="w-3.5 h-3.5 text-zinc-400" /> Forma de la Mesa
                            </label>
                            <select 
                                value={node.data.shape as string || 'square'} 
                                onChange={(e) => onUpdate(node.id, { ...node.data, shape: e.target.value })}
                                className="w-full h-9 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1 text-zinc-900 dark:text-zinc-100 font-medium"
                            >
                                <option value="square">Cuadrada</option>
                                <option value="rectangle">Rectangular</option>
                                <option value="circle">Circular</option>
                                <option value="oval">Ovalada</option>
                            </select>
                        </div>
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                                <QrCode className="w-3.5 h-3.5 text-zinc-400" /> QR Autogestión de Mesa
                            </label>
                            <div className="bg-white p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-center relative group shadow-sm">
                                <QRCode 
                                    value={qrUrl}
                                    size={130}
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 shadow-sm transition-all"
                                    onClick={() => window.open(qrUrl, '_blank')}
                                    title="Abrir URL del QR en el navegador"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {isWall && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Color del Muro</label>
                        <Input 
                            type="color"
                            value={node.data.color as string || '#78716c'} 
                            onChange={(e) => onUpdate(node.id, { ...node.data, color: e.target.value })}
                            className="h-9 p-1 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                        />
                    </div>
                )}

                {isDecor && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Etiqueta / Texto Decorativo</label>
                        <Input 
                            value={node.data.label as string || ''} 
                            onChange={(e) => onUpdate(node.id, { ...node.data, label: e.target.value })}
                            className="h-9 text-sm bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 font-medium"
                        />
                    </div>
                )}
                
                <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full flex items-center justify-center gap-2 border-red-200 dark:border-red-900/60 bg-red-50/60 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-bold h-10 transition-all shadow-sm rounded-xl"
                        onClick={() => onDelete(node.id)}
                    >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <span>Eliminar Elemento</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
