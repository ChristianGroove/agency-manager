'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    ReactFlowProvider,
    useReactFlow,
} from '@xyflow/react';
import { AISuggestion } from '@/modules/core/automation/ai-analyzer';
import { Panel, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Settings2, Box, Zap, ArrowLeft, Database, Undo2, Redo2, Globe, Mail, MessageSquare, Sparkles, GitBranch, Split, FlaskConical, LayoutGrid, MousePointer, Clock, Tag, ArrowRightCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

import TriggerNode from '@/modules/core/automation/components/nodes/TriggerNode';
import ActionNode from '@/modules/core/automation/components/nodes/ActionNode';
import CRMNode from '@/modules/core/automation/components/nodes/CRMNode';
import HTTPNode from '@/modules/core/automation/components/nodes/HTTPNode';
import EmailNode from '@/modules/core/automation/components/nodes/EmailNode';
import { cn } from '@/lib/utils';
import SMSNode from '@/modules/core/automation/components/nodes/SMSNode';
import ABTestNode from '@/modules/core/automation/components/nodes/ABTestNode';
import AIAgentNode from '@/modules/core/automation/components/nodes/AIAgentNode';
import ButtonsNode from '@/modules/core/automation/components/nodes/ButtonsNode';
import WaitInputNode from '@/modules/core/automation/components/nodes/WaitInputNode';
import TagNode from '@/modules/core/automation/components/nodes/TagNode';
import StageNode from '@/modules/core/automation/components/nodes/StageNode';
import { PropertiesSheet } from '@/modules/core/automation/components/properties-sheet';
import { AISuggestionsPanel } from '@/modules/core/automation/components/ai-suggestions-panel';
import { createWorkflowVersion, getWorkflow, saveWorkflow } from '@/modules/core/automation/actions';
import { WorkflowConfigurationSheet } from '@/modules/core/automation/components/workflow-configuration-sheet';
import { WORKFLOW_TEMPLATES } from '@/modules/core/automation/templates';
import { getLayoutedElements } from '@/modules/core/automation/utils/layout-utils';
import { SimulatorOverlay } from '@/modules/core/automation/components/simulator/SimulatorOverlay';

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    crm: CRMNode,
    http: HTTPNode,
    email: EmailNode,
    sms: SMSNode,
    ab_test: ABTestNode,
    ai_agent: AIAgentNode,
    buttons: ButtonsNode,
    wait_input: WaitInputNode,
    tag: TagNode,
    stage: StageNode,
};

function WorkflowEditorContent({ id }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

    // State with proper types
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
    const [configSheetOpen, setConfigSheetOpen] = useState(false);
    const [configTab, setConfigTab] = useState("settings");
    const [aiPanelOpen, setAIPanelOpen] = useState(false);
    const [workflowName, setWorkflowName] = useState('New Workflow');
    const [workflowDescription, setWorkflowDescription] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Undo/Redo history
    const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [simulatorOpen, setSimulatorOpen] = useState(false);

    // Load workflow
    useEffect(() => {
        const loadWorkflow = async () => {
            if (id === 'new') {
                setIsLoading(false);
                return;
            }
            try {
                const workflow = await getWorkflow(id);
                if (workflow) {
                    setWorkflowName(workflow.name);
                    setWorkflowDescription(workflow.description || '');
                    setIsActive(workflow.is_active || false);
                    if (workflow.definition) {
                        const def = workflow.definition as { nodes?: Node[]; edges?: Edge[] };
                        if (def.nodes) setNodes(def.nodes);
                        if (def.edges) setEdges(def.edges);
                    }
                }
            } catch (error) {
                console.error('Failed to load workflow:', error);
                toast.error('Failed to load workflow');
            } finally {
                setIsLoading(false);
            }
        };
        loadWorkflow();
    }, [id, setNodes, setEdges, searchParams]);

    // Load template from query param
    useEffect(() => {
        const templateId = searchParams.get('template');
        if (templateId && nodes.length === 0) {
            const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
            if (template) {
                // Clone template nodes with new IDs
                const clonedNodes = template.nodes.map(node => ({
                    ...node,
                    id: `${node.id}-${Date.now()}`,
                })) as Node[];

                // Map old IDs to new IDs
                const idMap: Record<string, string> = {};
                template.nodes.forEach((node, idx) => {
                    idMap[node.id] = clonedNodes[idx].id;
                });

                // Clone edges with mapped IDs
                const clonedEdges = template.edges.map(edge => ({
                    ...edge,
                    id: `${edge.id}-${Date.now()}`,
                    source: idMap[edge.source] || edge.source,
                    target: idMap[edge.target] || edge.target,
                })) as Edge[];

                setNodes(clonedNodes);
                setEdges(clonedEdges);
                setWorkflowName(template.name);
                setWorkflowDescription(template.description);
                toast.success(`Template "${template.name}" cargado`);
            }
        }
    }, [searchParams, nodes.length, setNodes, setEdges]);

    // Save to history for undo/redo
    const saveToHistory = useCallback(() => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ nodes: [...nodes], edges: [...edges] });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [nodes, edges, history, historyIndex]);

    // Cycle detection using DFS
    const wouldCreateCycle = useCallback((source: string, target: string, currentEdges: Edge[]): boolean => {
        // Build adjacency list from current edges plus the proposed new edge
        const adjacencyList = new Map<string, string[]>();

        // Add existing edges
        currentEdges.forEach(edge => {
            const sources = adjacencyList.get(edge.source) || [];
            sources.push(edge.target);
            adjacencyList.set(edge.source, sources);
        });

        // Add the proposed new edge
        const sourcesFromNew = adjacencyList.get(source) || [];
        sourcesFromNew.push(target);
        adjacencyList.set(source, sourcesFromNew);

        // DFS to detect cycle - check if we can reach 'source' starting from 'target'
        const visited = new Set<string>();
        const stack: string[] = [target];

        while (stack.length > 0) {
            const current = stack.pop()!;

            if (current === source) {
                return true; // Found a cycle
            }

            if (visited.has(current)) {
                continue;
            }
            visited.add(current);

            const neighbors = adjacencyList.get(current) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }

        return false;
    }, []);

    // Handle connections with cycle detection
    const onConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) return;

            // Check if this connection would create a cycle
            if (wouldCreateCycle(connection.source, connection.target, edges)) {
                toast.error('Conexión no permitida', {
                    description: 'Esta conexión crearía un ciclo infinito en el workflow.',
                    icon: '🔄',
                });
                return;
            }

            setEdges((eds) => addEdge(connection, eds));
            saveToHistory();
        },
        [setEdges, saveToHistory, edges, wouldCreateCycle]
    );

    // Handle node click
    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        setIsPropertiesOpen(true);
    }, []);

    // Handle node delete
    const onNodesDelete = useCallback(
        (deletedNodes: Node[]) => {
            setEdges((eds) =>
                eds.filter(
                    (e) =>
                        !deletedNodes.some((n) => n.id === e.source || n.id === e.target)
                )
            );
            saveToHistory();
        },
        [setEdges, saveToHistory]
    );

    // Drag and drop handlers
    const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: { label: type.charAt(0).toUpperCase() + type.slice(1) },
            };

            setNodes((nds) => [...nds, newNode]);
            saveToHistory();
        },
        [screenToFlowPosition, setNodes, saveToHistory]
    );

    // Undo/Redo
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setNodes(prevState.nodes);
            setEdges(prevState.edges);
            setHistoryIndex(historyIndex - 1);
        }
    }, [history, historyIndex, setNodes, setEdges]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
            setHistoryIndex(historyIndex + 1);
        }
    }, [history, historyIndex, setNodes, setEdges]);

    // Validate workflow before saving
    const validateWorkflow = useCallback((): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // Check if workflow has a name
        if (!workflowName || workflowName.trim() === '') {
            errors.push('El workflow necesita un nombre');
        }

        // Check if workflow has at least one trigger
        const triggers = nodes.filter(n => n.type === 'trigger');
        if (triggers.length === 0) {
            errors.push('El workflow necesita al menos un trigger para iniciar');
        }

        // Check if workflow has any action nodes
        const actionNodes = nodes.filter(n => n.type !== 'trigger');
        if (actionNodes.length === 0) {
            errors.push('El workflow necesita al menos una acción');
        }

        // Check for disconnected nodes (nodes without any connections)
        const connectedNodeIds = new Set([
            ...edges.map(e => e.source),
            ...edges.map(e => e.target)
        ]);
        const disconnectedNodes = nodes.filter(n => !connectedNodeIds.has(n.id) && nodes.length > 1);
        if (disconnectedNodes.length > 0) {
            errors.push(`Hay ${disconnectedNodes.length} nodo(s) sin conectar`);
        }

        // Check for nodes without labels
        const unlabeledNodes = nodes.filter(n => !n.data?.label || (n.data.label as string).trim() === '');
        if (unlabeledNodes.length > 0) {
            errors.push(`Hay ${unlabeledNodes.length} nodo(s) sin nombre configurado`);
        }

        // Check for cycles in the graph
        const hasCycle = (): boolean => {
            const adjacencyList = new Map<string, string[]>();
            edges.forEach(edge => {
                const sources = adjacencyList.get(edge.source) || [];
                sources.push(edge.target);
                adjacencyList.set(edge.source, sources);
            });

            const visited = new Set<string>();
            const recursionStack = new Set<string>();

            const dfs = (nodeId: string): boolean => {
                visited.add(nodeId);
                recursionStack.add(nodeId);

                const neighbors = adjacencyList.get(nodeId) || [];
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        if (dfs(neighbor)) return true;
                    } else if (recursionStack.has(neighbor)) {
                        return true; // Back edge found = cycle
                    }
                }

                recursionStack.delete(nodeId);
                return false;
            };

            for (const node of nodes) {
                if (!visited.has(node.id)) {
                    if (dfs(node.id)) return true;
                }
            }
            return false;
        };

        if (hasCycle()) {
            errors.push('El workflow contiene un ciclo - esto puede causar ejecuciones infinitas');
        }

        return { valid: errors.length === 0, errors };
    }, [workflowName, nodes, edges]);

    // Save workflow
    const handleSave = useCallback(async () => {
        // Validate workflow first
        const validation = validateWorkflow();
        if (!validation.valid) {
            toast.error('No se puede guardar el workflow', {
                description: validation.errors.join(' • '),
            });
            return;
        }

        const loadingToast = toast.loading('Guardando workflow...');
        try {
            await saveWorkflow(id, workflowName, workflowDescription, { nodes: nodes as any, edges: edges as any }, isActive);
            toast.dismiss(loadingToast);
            toast.success('Workflow guardado correctamente');
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('Error al guardar el workflow');
        }
    }, [id, workflowName, workflowDescription, isActive, nodes, edges, validateWorkflow]);

    // Save version snapshot
    const handleSaveVersion = useCallback(async () => {
        const loadingToast = toast.loading('Creating version snapshot...');
        try {
            await createWorkflowVersion(id);
            toast.dismiss(loadingToast);
            toast.success('Version saved successfully!');
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('Failed to create version');
        }
    }, [id]);

    // Version restored callback
    const onVersionRestored = useCallback(() => {
        window.location.reload();
    }, []);

    // Add AI suggestion handler
    const handleAddAISuggestion = useCallback(
        (suggestion: AISuggestion) => {
            const newNode: Node = {
                id: `${suggestion.nodeType}-${Date.now()}`,
                type: suggestion.nodeType,
                position: { x: 250, y: nodes.length * 100 + 50 },
                data: suggestion.suggestedConfig || {},
            };
            setNodes((nds) => [...nds, newNode]);
            // Also create an edge from the last node if exists
            if (nodes.length > 0) {
                const lastNode = nodes[nodes.length - 1];
                const newEdge: Edge = {
                    id: `e-${lastNode.id}-${newNode.id}`,
                    source: lastNode.id,
                    target: newNode.id,
                    type: 'smoothstep'
                };
                setEdges((eds) => [...eds, newEdge]);
            }
        },
        [nodes, setNodes, setEdges]
    );

    // Auto-Layout function using dagre algorithm
    const handleAutoLayout = useCallback(() => {
        if (nodes.length === 0) {
            toast.info('No hay nodos para organizar');
            return;
        }

        try {
            const layouted = getLayoutedElements(nodes, edges, { direction: 'TB' });
            setNodes([...layouted.nodes]);
            setEdges([...layouted.edges]);
            saveToHistory();
            toast.success('Nodos organizados automáticamente');
        } catch (error) {
            console.error('Layout error:', error);
            toast.error('Error al organizar nodos');
        }
    }, [nodes, edges, setNodes, setEdges, saveToHistory]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="dnd-flow relative w-full h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm my-2 mr-2">

            {/* ReactFlow Canvas Area */}
            <div className="flex-1 w-full h-full relative cursor-default" style={{ cursor: 'default' }}>
                <div ref={reactFlowWrapper} className="w-full h-full">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onNodesDelete={onNodesDelete}
                        onInit={setReactFlowInstance}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        nodeTypes={nodeTypes}
                        fitView
                        proOptions={{ hideAttribution: true }}
                        className="bg-slate-50 dark:bg-slate-950"
                    >
                        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                        <Panel position="bottom-right" className="flex flex-col items-center gap-4 !pointer-events-auto !m-6 !p-0">
                            <MiniMap
                                zoomable
                                pannable
                                className="!relative !w-[240px] !h-[160px] !m-0 !block shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                                nodeColor={(node) => {
                                    switch (node.type) {
                                        case 'trigger': return '#0891b2';
                                        case 'action': return '#2563eb';
                                        case 'condition': return '#9333ea';
                                        case 'email': return '#ca8a04';
                                        case 'sms': return '#db2777';
                                        case 'wait': return '#475569';
                                        case 'crm': return '#ea580c';
                                        case 'http': return '#16a34a';
                                        case 'ab_test': return '#dc2626';
                                        case 'ai_agent': return '#7c3aed';
                                        default: return '#94a3b8';
                                    }
                                }}
                                maskColor="rgba(0, 0, 0, 0.1)"
                                style={{ width: 240, height: 160 }}
                            />
                            <Controls
                                orientation="horizontal"
                                showInteractive={false}
                                className="!static !m-0 !p-1 !flex !gap-1 border border-slate-200 dark:border-slate-800 shadow-sm rounded-full bg-white dark:bg-slate-800 ring-1 ring-slate-100 dark:ring-slate-700 scale-75 origin-top"
                            />
                        </Panel>

                        {/* Node Sidebar */}
                        <Panel position="top-left" className="ml-2 !top-1/2 !-translate-y-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg max-h-[80vh] overflow-y-auto w-28 no-scrollbar flex flex-col justify-center">
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Trigger</h3>
                                    <div className="space-y-1.5">
                                        <div
                                            draggable
                                            onDragStart={(event) => onDragStart(event, 'trigger')}
                                            className="flex items-center p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 cursor-grab transition-all group bg-white dark:bg-slate-800"
                                        >
                                            <Zap className="h-4 w-4 text-cyan-600 mr-1.5 group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-medium">Trigger</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Acciones</h3>
                                    <div className="space-y-1.5">
                                        <div draggable onDragStart={(e) => onDragStart(e, 'action')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-blue-500 hover:bg-blue-50 cursor-grab transition-all">
                                            <Box className="h-4 w-4 text-blue-600 mr-1.5" />
                                            <span className="text-xs font-medium">Acción</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'crm')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-orange-500 hover:bg-orange-50 cursor-grab transition-all">
                                            <Database className="h-4 w-4 text-orange-600 mr-1.5" />
                                            <span className="text-xs font-medium">CRM</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'http')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-green-500 hover:bg-green-50 cursor-grab transition-all">
                                            <Globe className="h-4 w-4 text-green-600 mr-1.5" />
                                            <span className="text-xs font-medium">HTTP</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'condition')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-purple-500 hover:bg-purple-50 cursor-grab transition-all">
                                            <GitBranch className="h-4 w-4 text-purple-600 mr-1.5" />
                                            <span className="text-xs font-medium">Condición</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'email')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-yellow-500 hover:bg-yellow-50 cursor-grab transition-all">
                                            <Mail className="h-4 w-4 text-yellow-600 mr-1.5" />
                                            <span className="text-xs font-medium">Email</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'sms')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-pink-500 hover:bg-pink-50 cursor-grab transition-all">
                                            <MessageSquare className="h-4 w-4 text-pink-600 mr-1.5" />
                                            <span className="text-xs font-medium">SMS</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'wait')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-slate-500 hover:bg-slate-50 cursor-grab transition-all">
                                            <Clock className="h-4 w-4 text-slate-600 mr-1.5" />
                                            <span className="text-xs font-medium">Espera</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Lógica</h3>
                                    <div className="space-y-1.5">
                                        <div draggable onDragStart={(e) => onDragStart(e, 'ab_test')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-red-500 hover:bg-red-50 cursor-grab transition-all">
                                            <Split className="h-4 w-4 text-red-600 mr-1.5" />
                                            <span className="text-xs font-medium">A/B Test</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'ai_agent')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-violet-500 hover:bg-violet-50 cursor-grab transition-all">
                                            <Sparkles className="h-4 w-4 text-violet-600 mr-1.5" />
                                            <span className="text-xs font-medium">Agente AI</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'tag')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-teal-500 hover:bg-teal-50 cursor-grab transition-all">
                                            <Tag className="h-4 w-4 text-teal-600 mr-1.5" />
                                            <span className="text-xs font-medium">Etiqueta</span>
                                        </div>
                                        <div draggable onDragStart={(e) => onDragStart(e, 'stage')} className="flex items-center p-1.5 rounded-lg border border-slate-100 bg-white dark:bg-slate-800 hover:border-rose-500 hover:bg-rose-50 cursor-grab transition-all">
                                            <ArrowRightCircle className="h-4 w-4 text-rose-600 mr-1.5" />
                                            <span className="text-xs font-medium">Etapa</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>
            </div>

            {/* Overlays */}
            <SimulatorOverlay
                open={simulatorOpen}
                onClose={() => setSimulatorOpen(false)}
                nodes={nodes}
                edges={edges}
            />

            <AISuggestionsPanel
                open={aiPanelOpen}
                onOpenChange={setAIPanelOpen}
                nodes={nodes.map((n) => ({ ...n, type: n.type || 'custom', data: n.data as Record<string, unknown> }))}
                edges={edges.map((e) => ({ ...e, label: typeof e.label === 'string' ? e.label : undefined }))}
                onAddNode={handleAddAISuggestion}
            />

            {/* Configuration Sheet (Unified) */}
            <WorkflowConfigurationSheet
                isOpen={configSheetOpen}
                onClose={() => setConfigSheetOpen(false)}
                defaultTab={configTab}
                // Settings
                initialName={workflowName}
                initialDescription={workflowDescription}
                initialIsActive={isActive}
                initialChannelId={(nodes.find(n => n.type === 'trigger')?.data?.channel as string) || undefined}
                onChannelChange={(channelId) => {
                    setNodes((nds) => nds.map((node) => {
                        if (node.type === 'trigger') {
                            return {
                                ...node,
                                data: { ...node.data, channel: channelId }
                            };
                        }
                        return node;
                    }));
                }}
                onSaveSettings={async (name, description, active) => {
                    setWorkflowName(name);
                    setWorkflowDescription(description);
                    setIsActive(active);
                }}

                // History
                workflowId={id}
                onVersionRestored={onVersionRestored}
                // Test
                workflowDefinition={{
                    nodes: nodes.map((n) => ({ ...n, type: n.type || 'custom', data: n.data as Record<string, unknown> })),
                    edges: edges.map((e) => ({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        sourceHandle: e.sourceHandle,
                        targetHandle: e.targetHandle,
                        label: typeof e.label === 'string' ? e.label : undefined
                    })),
                }}
            />

            {/* Floating Toolbar (Unified Single Pill) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center pointer-events-none w-full max-w-5xl">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 pointer-events-auto h-14">

                    {/* Left: Nav & Name */}
                    <div className="flex items-center gap-2 mr-2">
                        <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={() => router.push('/crm/automations')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                        <Input
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            className="w-48 bg-transparent border-none font-semibold h-8 focus-visible:ring-0 px-2"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Center: Tools & Actions */}
                    <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={handleUndo} disabled={historyIndex <= 0}>
                            <Undo2 className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                            <Redo2 className="h-4 w-4 text-slate-500" />
                        </Button>

                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                        {/* Unified Config Tools */}
                        <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={() => { setConfigTab("settings"); setConfigSheetOpen(true); }} title="Configuración">
                            <Settings2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </Button>


                        <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={() => setAIPanelOpen(true)} title="AI Suggestions">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                        </Button>

                        <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={handleAutoLayout} title="Auto-Organizar">
                            <LayoutGrid className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </Button>

                        <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={handleSaveVersion} title="Crear Snapshot">
                            <Save className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </Button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                    {/* Right: Primary Actions */}
                    <div className="flex items-center gap-3">
                        <Button
                            size="sm"
                            className={cn(
                                "rounded-full px-4 font-medium transition-all shadow-sm hover:shadow-md",
                                simulatorOpen
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                            )}
                            onClick={() => setSimulatorOpen(prev => !prev)}
                        >
                            <Smartphone className="h-4 w-4 mr-2" />
                            {simulatorOpen ? 'Ocultar' : 'Simular'}
                        </Button>

                        <Button size="sm" className="rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-md px-6 font-medium" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar
                        </Button>
                    </div>

                </div>
            </div>

            {/* Properties Sheet */}
            <PropertiesSheet
                node={selectedNode}
                isOpen={isPropertiesOpen}
                onClose={() => setIsPropertiesOpen(false)}
                onUpdate={(nodeId: string, data: Record<string, unknown>) => {
                    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data } : n)));
                    saveToHistory();
                }}
                onDelete={() => {
                    if (selectedNode) {
                        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
                        setIsPropertiesOpen(false);
                        saveToHistory();
                    }
                }}
                onDuplicate={() => {
                    if (selectedNode) {
                        const newNode = {
                            ...selectedNode,
                            id: `${selectedNode.type}-${Date.now()}`,
                            position: {
                                x: selectedNode.position.x + 50,
                                y: selectedNode.position.y + 50,
                            },
                        };
                        setNodes((nds) => [...nds, newNode]);
                        saveToHistory();
                    }
                }}
            />
        </div>
    );
}

export default function WorkflowEditorPage() {
    const params = useParams();
    const id = params?.id as string || 'new';

    return (
        <ReactFlowProvider>
            <WorkflowEditorContent id={id} />
        </ReactFlowProvider>
    );
}
