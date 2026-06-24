import React from 'react'
import { Node } from '@xyflow/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, X, ExternalLink } from 'lucide-react'
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
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 text-sm">
            <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="font-bold">Propiedades</span>
                <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isTable && (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Identificador</label>
                            <Input 
                                value={node.data.tableIdentifier as string || ''} 
                                onChange={(e) => onUpdate(node.id, { ...node.data, tableIdentifier: e.target.value, label: e.target.value })}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Capacidad (Pax)</label>
                            <Input 
                                type="number"
                                value={node.data.capacity as number || 4} 
                                onChange={(e) => onUpdate(node.id, { ...node.data, capacity: parseInt(e.target.value) || 1 })}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Forma</label>
                            <select 
                                value={node.data.shape as string || 'square'} 
                                onChange={(e) => onUpdate(node.id, { ...node.data, shape: e.target.value })}
                                className="w-full h-8 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-1"
                            >
                                <option value="square">Cuadrada</option>
                                <option value="rectangle">Rectangular</option>
                                <option value="circle">Circular</option>
                                <option value="oval">Ovalada</option>
                            </select>
                        </div>
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <label className="text-xs font-semibold text-zinc-500 mb-2 block">QR de la Mesa</label>
                            <div className="bg-white p-4 rounded-lg border border-zinc-200 flex justify-center relative group">
                                <QRCode 
                                    value={qrUrl}
                                    size={120}
                                />
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => window.open(qrUrl, '_blank')}
                                    title="Abrir en el navegador"
                                >
                                    <ExternalLink className="h-3 w-3 text-zinc-600" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {isWall && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500">Color</label>
                        <Input 
                            type="color"
                            value={node.data.color as string || '#78716c'} 
                            onChange={(e) => onUpdate(node.id, { ...node.data, color: e.target.value })}
                            className="h-8 p-1"
                        />
                    </div>
                )}

                {isDecor && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500">Etiqueta / Nombre</label>
                        <Input 
                            value={node.data.label as string || ''} 
                            onChange={(e) => onUpdate(node.id, { ...node.data, label: e.target.value })}
                            className="h-8 text-sm"
                        />
                    </div>
                )}
                
                <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => onDelete(node.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar Elemento
                    </Button>
                </div>
            </div>
        </div>
    )
}
