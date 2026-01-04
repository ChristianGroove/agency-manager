"use client"

import React, { useCallback, useEffect, useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    Panel
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

import AppStoreNode, { AppNodeData } from './app-store-node'
import { getStoreModules, getActiveOrganizationModules, toggleModule, SystemModule } from '../actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, ShoppingCart, Info, LayoutTemplate } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const nodeTypes = {
    appNode: AppStoreNode as any
}

const CATEGORY_ORDER = ['config', 'core', 'operations', 'finance', 'automation']

export function AppStoreCanvas() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<AppNodeData>>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
    const [isLoading, setIsLoading] = useState(true)
    const [systemModules, setSystemModules] = useState<SystemModule[]>([])
    const [activeModules, setActiveModules] = useState<string[]>([])
    const [cartTotal, setCartTotal] = useState(0)

    // Initial Data Fetch
    useEffect(() => {
        loadStoreData()
    }, [])

    const loadStoreData = async () => {
        setIsLoading(true)
        try {
            const [storeModules, activeMods] = await Promise.all([
                getStoreModules(),
                getActiveOrganizationModules()
            ])
            setSystemModules(storeModules)
            const activeKeys = activeMods.filter(m => m.is_active).map(m => m.module_key)
            setActiveModules(activeKeys)

            buildGraph(storeModules, activeKeys)
        } catch (error) {
            console.error(error)
            toast.error("Error cargando la App Store")
        } finally {
            setIsLoading(false)
        }
    }

    // Structured Auto-Layout
    const getLayoutedElements = (nodes: Node<AppNodeData>[], edges: Edge[]) => {
        const dagreGraph = new dagre.graphlib.Graph()
        dagreGraph.setDefaultEdgeLabel(() => ({}))

        // TB = Top to Bottom direction
        dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 60 })

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: 320, height: 200 }) // Card dimensions + gap
        })

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target)
        })

        dagre.layout(dagreGraph)

        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id)

            // Adjust position slightly based on category rank if needed,
            // but usually dagre handles topology best. 
            // We just center it nicely.

            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - 160,
                    y: nodeWithPosition.y - 100,
                },
            }
        })

        return { nodes: layoutedNodes, edges }
    }

    // Build React Flow Graph
    const buildGraph = (modules: SystemModule[], activeKeys: string[]) => {
        const newNodes: Node<AppNodeData>[] = []
        const newEdges: Edge[] = []
        let currentTotal = 0

        modules.forEach(mod => {
            const isActive = activeKeys.includes(mod.key) || mod.is_core
            const isLocked = !checkDependencies(mod, activeKeys)

            if (isActive) currentTotal += mod.price

            newNodes.push({
                id: mod.key,
                type: 'appNode',
                // Initial 0,0 - logic will fix it
                position: { x: 0, y: 0 },
                data: {
                    key: mod.key,
                    label: mod.name,
                    description: mod.description,
                    price: mod.price,
                    currency: mod.currency,
                    category: mod.category,
                    isActive,
                    isLocked,
                    iconName: mod.icon_name,
                    onToggle: handleToggleModule
                },
                className: !isActive ? '' : 'z-10'
            })

            // Create Edges for dependencies
            mod.dependencies.forEach(depKey => {
                newEdges.push({
                    id: `${depKey}-${mod.key}`,
                    source: depKey,
                    target: mod.key,
                    animated: true,
                    style: { stroke: isActive ? '#22c55e' : '#e4e4e7', strokeWidth: 2 },
                    type: 'default'
                })
            })
        })

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges)

        setNodes(layoutedNodes)
        setEdges(layoutedEdges)
        setCartTotal(currentTotal)
    }

    // Check if dependencies are met
    const checkDependencies = (mod: SystemModule, currentActive: string[]) => {
        if (!mod.dependencies || mod.dependencies.length === 0) return true
        return mod.dependencies.every(dep => currentActive.includes(dep) || systemModules.find(m => m.key === dep)?.is_core)
    }

    const handleToggleModule = useCallback(async (key: string) => {
        const mod = systemModules.find(m => m.key === key)
        if (!mod) return

        const isCurrentlyActive = activeModules.includes(key)
        const nextActive = isCurrentlyActive
            ? activeModules.filter(k => k !== key)
            : [...activeModules, key]

        setActiveModules(nextActive)
        buildGraph(systemModules, nextActive)

        const result = await toggleModule(key, !isCurrentlyActive)

        if (!result.success) {
            toast.error("Error al actualizar módulo")
            setActiveModules(activeModules)
            buildGraph(systemModules, activeModules)
        } else {
            toast.success(isCurrentlyActive ? "Módulo desactivado" : "Módulo activado con éxito")
        }
    }, [systemModules, activeModules])

    if (isLoading) {
        return (
            <div className="h-[600px] flex items-center justify-center bg-zinc-50 rounded-xl border border-zinc-200">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-140px)] w-full bg-slate-50 relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                className="bg-slate-50"
                minZoom={0.5}
                maxZoom={1.5}
            >
                <Background color="#cbd5e1" gap={20} size={1} />

                {/* Visual Swimlane Labels */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                    {/* These positions align with the Dagre RankSep of 100 + Node Height of 200 approx */}
                    <div className="absolute top-[50px] left-10 text-6xl font-black text-slate-200 uppercase tracking-widest opacity-40">Core</div>
                    <div className="absolute top-[350px] left-10 text-6xl font-black text-blue-50 uppercase tracking-widest opacity-60">Operaciones</div>
                    <div className="absolute top-[650px] left-10 text-6xl font-black text-emerald-50 uppercase tracking-widest opacity-60">Finanzas</div>
                    <div className="absolute top-[950px] left-10 text-6xl font-black text-purple-50 uppercase tracking-widest opacity-60">Automatización</div>
                </div>

                <Controls />

                {/* Floating Cart Panel */}
                <Panel position="top-right" className="bg-white p-6 rounded-xl shadow-xl border border-zinc-100 max-w-sm w-80">
                    <div className="flex items-center gap-3 mb-4 text-zinc-800">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <ShoppingCart className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="font-bold text-lg">Tu Plan Actual</h3>
                    </div>

                    <div className="space-y-3 mb-6">
                        {systemModules.filter(m => activeModules.includes(m.key) && m.price > 0).map(m => (
                            <div key={m.key} className="flex justify-between text-sm">
                                <span className="text-zinc-600">{m.name}</span>
                                <span className="font-medium font-mono">${m.price}</span>
                            </div>
                        ))}
                        {activeModules.length === 0 && (
                            <p className="text-sm text-zinc-400 italic">No tienes módulos premium activos.</p>
                        )}
                    </div>

                    <div className="border-t pt-4 flex justify-between items-center mb-4">
                        <span className="font-bold text-zinc-900">Total Mensual</span>
                        <div className="flex flex-col items-end">
                            <span className="text-2xl font-bold text-indigo-600">${cartTotal.toFixed(2)}</span>
                            <span className="text-xs text-zinc-400">USD / mes</span>
                        </div>
                    </div>

                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-200">
                        Gestionar Suscripción
                    </Button>
                </Panel>

                <Panel position="top-center" className="bg-white/80 backdrop-blur px-4 py-2 rounded-full border shadow-sm text-xs text-zinc-500 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4" />
                    Vista de Árbol (Auto-organizada por dependencias)
                </Panel>
            </ReactFlow>
        </div>
    )
}
