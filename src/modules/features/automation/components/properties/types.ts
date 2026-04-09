import { Node } from '@xyflow/react';

export interface BasePropertyProps {
    node: Node;
    formData: Record<string, any>;
    errors: Record<string, string>;
    onChange: (key: string, value: unknown) => void;
}

export interface CRMPropertyProps extends BasePropertyProps {
    stages: any[];
    availableTags: any[];
}
