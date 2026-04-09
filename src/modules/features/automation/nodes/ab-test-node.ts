
import { ContextManager } from '../context-manager';
import { NodeExecutionResult } from '../types';

export interface ABTestNodeData {
    paths?: Array<{ id: string; label: string; percentage: number }>;
}

export class ABTestNode {
    constructor(private contextManager: ContextManager) { }

    execute(data: ABTestNodeData, nodeId: string): NodeExecutionResult {
        // Deterministic Split based on Context ID (e.g. Lead ID)
        // If no specific ID, use Random (fallback)
        const identifier = (this.contextManager.get('lead') as any)?.id ||
            (this.contextManager.get('user') as any)?.id ||
            Math.random().toString();

        const hash = this.simpleHash(String(identifier) + nodeId);
        const normalized = hash % 100; // 0-99

        let cumulative = 0;
        let selectedPathLabel = '';
        let selectedPathId = ''; // We need to return the handle ID (usually match path.id or label)

        // Defaults
        const paths = data.paths || [
            { id: 'a', label: 'Path A', percentage: 50 },
            { id: 'b', label: 'Path B', percentage: 50 }
        ];

        for (const path of paths) {
            cumulative += path.percentage;
            if (normalized < cumulative) {
                selectedPathLabel = path.label;
                selectedPathId = path.id || path.label; // Ideally use ID if stable
                break;
            }
        }

        // Fallback to last path if rounding errors
        if (!selectedPathLabel && paths.length > 0) {
            const last = paths[paths.length - 1];
            selectedPathLabel = last.label;
            selectedPathId = last.id || last.label;
        }

        console.log(`[ABTestNode] ID: ${identifier} -> Hash: ${normalized} -> Path: ${selectedPathLabel}`);

        // Store in context for debugging/analytics logic if needed
        this.contextManager.set('_lastSplitPath', selectedPathLabel);
        this.contextManager.set('_lastSplitPathId', selectedPathId);

        return {
            success: true,
            nextBranchId: selectedPathId // Engine should use this for navigation
        };
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}
