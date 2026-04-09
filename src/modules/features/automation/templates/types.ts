export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: 'marketing' | 'sales' | 'support' | 'analytics' | 'internal';
    thumbnail?: string;
    nodes: Array<{
        id: string;
        type: string;
        data: Record<string, unknown>;
        position: { x: number; y: number };
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        label?: string;
        sourceHandle?: string | null;
        targetHandle?: string | null;
    }>;
    requiredIntegrations: string[];
    estimatedSetupTime: string;
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export type TemplateCategory = WorkflowTemplate['category'];

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: string; color: string }> = {
    marketing: {
        label: 'Marketing Automation',
        icon: '🎯',
        color: 'purple',
    },
    sales: {
        label: 'Sales & CRM',
        icon: '💼',
        color: 'blue',
    },
    support: {
        label: 'Customer Support',
        icon: '🎧',
        color: 'green',
    },
    analytics: {
        label: 'Data & Analytics',
        icon: '📊',
        color: 'orange',
    },
    internal: {
        label: 'Internal Workflows',
        icon: '⚙️',
        color: 'slate',
    },
};
