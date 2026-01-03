/**
 * Cycle Detection Utility for Workflow Graphs
 * Prevents infinite loops in workflow execution
 */

export interface GraphNode {
    id: string;
}

export interface GraphEdge {
    source: string;
    target: string;
}

/**
 * Detects if adding a new edge would create a cycle in the graph
 * Uses Depth-First Search (DFS) algorithm
 */
export function wouldCreateCycle(
    nodes: GraphNode[],
    edges: GraphEdge[],
    newEdge: GraphEdge
): boolean {
    // Create adjacency list including the new edge
    const adjacencyList = new Map<string, string[]>();

    // Initialize adjacency list
    nodes.forEach(node => {
        adjacencyList.set(node.id, []);
    });

    // Add existing edges
    edges.forEach(edge => {
        const neighbors = adjacencyList.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacencyList.set(edge.source, neighbors);
    });

    // Add the proposed new edge
    const newSourceNeighbors = adjacencyList.get(newEdge.source) || [];
    newSourceNeighbors.push(newEdge.target);
    adjacencyList.set(newEdge.source, newSourceNeighbors);

    // Check if graph has cycle using DFS
    return hasCycle(adjacencyList, nodes.map(n => n.id));
}

/**
 * Detects if the current graph has any cycles
 */
export function hasAnyCycle(nodes: GraphNode[], edges: GraphEdge[]): boolean {
    const adjacencyList = new Map<string, string[]>();

    nodes.forEach(node => {
        adjacencyList.set(node.id, []);
    });

    edges.forEach(edge => {
        const neighbors = adjacencyList.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacencyList.set(edge.source, neighbors);
    });

    return hasCycle(adjacencyList, nodes.map(n => n.id));
}

/**
 * DFS-based cycle detection
 * Uses three states: unvisited (0), visiting (1), visited (2)
 */
function hasCycle(adjacencyList: Map<string, string[]>, nodeIds: string[]): boolean {
    const state = new Map<string, number>(); // 0=unvisited, 1=visiting, 2=visited

    // Initialize all nodes as unvisited
    nodeIds.forEach(id => state.set(id, 0));

    // Check each node
    for (const nodeId of nodeIds) {
        if (state.get(nodeId) === 0) {
            if (dfs(nodeId, adjacencyList, state)) {
                return true; // Cycle detected
            }
        }
    }

    return false;
}

/**
 * Depth-First Search helper
 */
function dfs(
    nodeId: string,
    adjacencyList: Map<string, string[]>,
    state: Map<string, number>
): boolean {
    // Mark as visiting
    state.set(nodeId, 1);

    const neighbors = adjacencyList.get(nodeId) || [];

    for (const neighbor of neighbors) {
        const neighborState = state.get(neighbor);

        if (neighborState === 1) {
            // Back edge detected - cycle found!
            return true;
        }

        if (neighborState === 0) {
            if (dfs(neighbor, adjacencyList, state)) {
                return true;
            }
        }
    }

    // Mark as visited
    state.set(nodeId, 2);
    return false;
}

/**
 * Finds all nodes involved in cycles (for highlighting in UI)
 */
export function findNodesInCycles(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const nodesInCycles: Set<string> = new Set();

    // For each node, check if removing it breaks all cycles
    nodes.forEach(node => {
        const nodesWithoutCurrent = nodes.filter(n => n.id !== node.id);
        const edgesWithoutCurrent = edges.filter(
            e => e.source !== node.id && e.target !== node.id
        );

        const hadCycle = hasAnyCycle(nodes, edges);
        const hasCycleWithout = hasAnyCycle(nodesWithoutCurrent, edgesWithoutCurrent);

        if (hadCycle && !hasCycleWithout) {
            nodesInCycles.add(node.id);
        }
    });

    return Array.from(nodesInCycles);
}
