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
    useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Settings2, Box, Zap, ArrowLeft, Database, Undo2, Redo2, Globe, Mail, MessageSquare, Sparkles, GitBranch, Split, FlaskConical, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

import TriggerNode from '@/modules/core/automation/components/nodes/TriggerNode';
import ActionNode from '@/modules/core/automation/components/nodes/ActionNode';
import CRMNode from '@/modules/core/automation/components/nodes/CRMNode';
import HTTPNode from '@/modules/core/automation/components/nodes/HTTPNode';
import EmailNode from '@/modules/core/automation/components/nodes/EmailNode';
import SMSNode from '@/modules/core/automation/components/nodes/SMSNode';
import ABTestNode from '@/modules/core/automation/components/nodes/ABTestNode';
import AIAgentNode from '@/modules/core/automation/components/nodes/AIAgentNode';
import { PropertiesSheet } from '@/modules/core/automation/components/properties-sheet';
import { TestPanel } from '@/modules/core/automation/components/test-panel';
import { AISuggestionsPanel } from '@/modules/core/automation/components/ai-suggestions-panel';
import { createWorkflowVersion, getWorkflow, saveWorkflow } from '@/modules/core/automation/actions';
import { VersionHistorySheet } from '@/modules/core/automation/components/version-history-sheet';
import { WorkflowSettingsSheet } from '@/modules/core/automation/components/workflow-settings-sheet';
import { WORKFLOW_TEMPLATES } from '@/modules/core/automation/templates';

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    crm: CRMNode,
    http: HTTPNode,
    email: EmailNode,
    sms: SMSNode,
    ab_test: ABTestNode,
    ai_agent: AIAgentNode,
};

function WorkflowEditorContent({ id }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    // State with proper types
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [testPanelOpen, setTestPanelOpen] = useState(false);
    const [aiPanelOpen, setAIPanelOpen] = useState(false);
    const [historySheetOpen, setHistorySheetOpen] = useState(false);
    const [workflowName, setWorkflowName] = useState('New Workflow');
    const [workflowDescription, setWorkflowDescription] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Undo/Redo history
    const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

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
        (suggestion: { type: string; data: Record<string, unknown> }) => {
            const newNode: Node = {
                id: `${suggestion.type}-${Date.now()}`,
                type: suggestion.type,
                position: { x: 250, y: nodes.length * 100 + 50 },
                data: suggestion.data,
            };
            setNodes((nds) => [...nds, newNode]);
            saveToHistory();
        },
        [nodes.length, setNodes, saveToHistory]
    );

    // Auto-Layout function using dagre algorithm
    const handleAutoLayout = useCallback(() => {
        if (nodes.length === 0) {
            toast.info('No hay nodos para organizar');
            return;
        }

        // Simple vertical layout algorithm
        const nodeSpacingY = 150;
        const nodeSpacingX = 250;

        // Find trigger nodes (roots)
        const triggerNodes = nodes.filter(n => n.type === 'trigger');
        const otherNodes = nodes.filter(n => n.type !== 'trigger');

        // Position trigger nodes at top
        const newNodes = [...nodes];
        triggerNodes.forEach((trigger, i) => {
            const nodeIndex = newNodes.findIndex(n => n.id === trigger.id);
            if (nodeIndex !== -1) {
                newNodes[nodeIndex] = {
                    ...newNodes[nodeIndex],
                    position: { x: i * nodeSpacingX + 100, y: 50 }
                };
            }
        });

        // Position other nodes below
        otherNodes.forEach((node, i) => {
            const nodeIndex = newNodes.findIndex(n => n.id === node.id);
            if (nodeIndex !== -1) {
                const row = Math.floor(i / 3) + 1;
                const col = i % 3;
                newNodes[nodeIndex] = {
                    ...newNodes[nodeIndex],
                    position: { x: col * nodeSpacingX + 100, y: row * nodeSpacingY + 50 }
                };
            }
        });

        setNodes(newNodes);
        saveToHistory();
        toast.success('Nodos organizados automáticamente');
    }, [nodes, setNodes, saveToHistory]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 md:left-[330px] top-[65px] flex flex-col bg-slate-100 dark:bg-slate-950 z-0">
            {/* Version History Sheet */}
            <VersionHistorySheet
                workflowId={id}
                isOpen={historySheetOpen}
                onClose={() => setHistorySheetOpen(false)}
                onVersionRestored={onVersionRestored}
            />

            {/* Floating Toolbar (Top Center) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-lg rounded-full px-6 py-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => router.push('/crm/automations')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                <Input
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="w-48 bg-transparent border-none font-semibold text-center"
                />

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                <Button size="icon" variant="ghost" className="rounded-full" onClick={handleUndo} disabled={historyIndex <= 0}>
                    <Undo2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="rounded-full" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                    <Redo2 className="h-4 w-4" />
                </Button>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setIsSettingsOpen(true)}>
                    <Settings2 className="h-4 w-4" />
                </Button>

                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setHistorySheetOpen(true)} title="Version History">
                    <GitBranch className="h-4 w-4" />
                </Button>

                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setTestPanelOpen(true)} title="Test Workflow">
                    <FlaskConical className="h-4 w-4" />
                </Button>

                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setAIPanelOpen(true)} title="AI Suggestions">
                    <Sparkles className="h-4 w-4" />
                </Button>

                <Button size="icon" variant="ghost" className="rounded-full" onClick={handleAutoLayout} title="Auto-Organizar (Layout Automático)">
                    <LayoutGrid className="h-4 w-4" />
                </Button>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                <Button size="sm" variant="outline" className="rounded-full" onClick={handleSaveVersion} title="Create Version Snapshot">
                    <Save className="h-3.5 w-3.5 mr-2" />
                    Snapshot
                </Button>

                <Button size="sm" className="rounded-full bg-black text-white hover:bg-slate-800" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                </Button>
            </div>

            {/* Floating Palette (Left) */}
            <div className="absolute top-1/2 left-6 -translate-y-1/2 z-10 flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-full border shadow-2xl flex flex-col gap-3 items-center">
                    <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm cursor-grab hover:scale-110 transition-transform" draggable onDragStart={(e) => onDragStart(e, 'trigger')} title="Trigger Node">
                        <Zap size={20} className="text-amber-500" />
                    </div>
                    <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm cursor-grab hover:scale-110 transition-transform" draggable onDragStart={(e) => onDragStart(e, 'action')} title="Action Node">
                        <Box size={20} className="text-blue-500" />
                    </div>
                    <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm cursor-grab hover:scale-110 transition-transform" draggable onDragStart={(e) => onDragStart(e, 'crm')} title="CRM Node">
                        <Database size={20} className="text-indigo-500" />
                    </div>
                    <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm cursor-grab hover:scale-110 transition-transform" draggable onDragStart={(e) => onDragStart(e, 'http')} title="HTTP Node">
                        <Globe size={20} className="text-cyan-500" />
                    </div>
                    <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm cursor-grab hover:scale-110 transition-transform" draggable onDragStart={(e) => onDragStart(e, 'email')} title="Email Node">
                        <Mail size={20} className="text-purple-500" />
                    </div>
                    <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm cursor-grab hover:scale-110 transition-transform" draggable onDragStart={(e) => onDragStart(e, 'sms')} title="SMS Node">
                        <MessageSquare size={20} className="text-green-500" />
                    </div>
                    <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm cursor-grab hover:scale-110 transition-transform" draggable onDragStart={(e) => onDragStart(e, 'ab_test')} title="A/B Test Node">
                        <Split size={20} className="text-orange-500" />
                    </div>
                    <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm cursor-grab hover:scale-110 transition-transform" draggable onDragStart={(e) => onDragStart(e, 'ai_agent')} title="AI Agent Node">
                        <Sparkles size={20} className="text-purple-600" />
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div ref={reactFlowWrapper} className="flex-1 w-full h-full" onDrop={onDrop} onDragOver={onDragOver}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodesDelete={onNodesDelete}
                    deleteKeyCode={['Backspace', 'Delete']}
                    nodeTypes={nodeTypes}
                    onNodeClick={onNodeClick}
                    fitView
                    className="bg-slate-50 dark:bg-slate-950"
                >
                    <Controls
                        position="bottom-left"
                        orientation="horizontal"
                        className="!m-4 !bg-white/95 dark:!bg-slate-900/95 !border !border-slate-200 dark:!border-slate-800 !rounded-full !shadow-xl"
                        style={{ bottom: 16, left: 80 }}
                    />
                    <MiniMap
                        className="!bg-white/95 dark:!bg-slate-900/95 !border !border-slate-200 dark:!border-slate-800/50 !rounded-xl !shadow-lg"
                        style={{ bottom: 16, right: 16 }}
                        nodeStrokeWidth={3}
                        zoomable
                        pannable
                    />
                    <Background color="#94a3b8" gap={20} size={1} variant={BackgroundVariant.Dots} />

                    {nodes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-center max-w-sm">
                                <Zap className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                                <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Start your workflow</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Drag a <strong>Trigger</strong> from the left palette to begin.
                                </p>
                            </div>
                        </div>
                    )}
                </ReactFlow>
            </div>

            {/* AI Suggestions Panel */}
            <AISuggestionsPanel
                open={aiPanelOpen}
                onOpenChange={setAIPanelOpen}
                nodes={nodes as any[]}
                edges={edges as any[]}
                onAddNode={handleAddAISuggestion as any}
            />

            {/* Test Panel */}
            <TestPanel
                open={testPanelOpen}
                onOpenChange={setTestPanelOpen}
                workflowDefinition={{
                    nodes: nodes.map((n) => ({ ...n, data: n.data as Record<string, unknown> })) as any,
                    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
                }}
            />

            {/* Settings Sheet */}
            <WorkflowSettingsSheet
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                name={workflowName}
                description={workflowDescription}
                active={isActive}
                onUpdate={(name: string, description: string, active: boolean) => {
                    setWorkflowName(name);
                    setWorkflowDescription(description);
                    setIsActive(active);
                }}
            />

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
