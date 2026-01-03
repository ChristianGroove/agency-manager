import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
    direction?: 'TB' | 'BT' | 'LR' | 'RL';
    nodeWidth?: number;
    nodeHeight?: number;
    nodesep?: number;
    ranksep?: number;
}

/**
 * Organiza nodos automáticamente usando algoritmo Dagre (Sugiyama layout)
 * @param nodes - Nodos del workflow
 * @param edges - Conexiones del workflow  
 * @param options - Opciones de layout
 * @returns Nodos con posiciones calculadas
 */
export function getLayoutedElements(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions = {}
) {
    const {
        direction = 'TB',
        nodeWidth = 250,
        nodeHeight = 100,
        nodesep = 100,
        ranksep = 150
    } = options;

    // Crear grafo dirigido
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Configurar layout
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep,    // Espacio horizontal entre nodos
        ranksep,    // Espacio vertical entre capas
        marginx: 20,
        marginy: 20
    });

    // Añadir nodos al grafo
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, {
            width: nodeWidth,
            height: nodeHeight
        });
    });

    // Añadir edges al grafo
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calcular layout con algoritmo Dagre
    dagre.layout(dagreGraph);

    // Aplicar posiciones calculadas a los nodos
    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        return {
            ...node,
            position: {
                // Centrar nodo en la posición calculada
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2
            }
        };
    });

    return { nodes: layoutedNodes, edges };
}

/**
 * Calcula el centro del canvas para nodos
 */
export function getCenterPosition(): { x: number; y: number } {
    return {
        x: window.innerWidth / 2 - 125,
        y: window.innerHeight / 2 - 50
    };
}
