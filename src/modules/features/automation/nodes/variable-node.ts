
import { ContextManager } from '../context-manager';
import { NodeExecutionResult } from '../types';

export interface VariableNodeData {
    actionType: 'set' | 'math';
    targetVar: string;
    // Set
    value?: string | number;
    // Math
    operand1?: string | number;
    operation?: 'add' | 'sub' | 'mult' | 'div';
    operand2?: string | number;
}

export class VariableNode {
    constructor(private contextManager: ContextManager) { }

    execute(data: VariableNodeData): NodeExecutionResult {
        const { actionType, targetVar } = data;

        if (!targetVar) {
            return { success: false, error: 'Target variable name required' };
        }

        try {
            if (actionType === 'set') {
                const rawValue = data.value;
                // If string, resolve it. If number, use as is.
                let value = rawValue;
                if (typeof rawValue === 'string') {
                    value = this.contextManager.resolve(rawValue);
                }

                this.contextManager.set(targetVar, value);
                console.log(`[VariableNode] Set ${targetVar} = ${value}`);
            }
            else if (actionType === 'math') {
                const op1 = this.resolveNumber(data.operand1);
                const op2 = this.resolveNumber(data.operand2);

                let result = 0;
                switch (data.operation) {
                    case 'add': result = op1 + op2; break;
                    case 'sub': result = op1 - op2; break;
                    case 'mult': result = op1 * op2; break;
                    case 'div': result = op2 !== 0 ? op1 / op2 : 0; break;
                    default: throw new Error(`Unknown math operation: ${data.operation}`);
                }

                this.contextManager.set(targetVar, result);
                console.log(`[VariableNode] Math ${op1} ${data.operation} ${op2} = ${result} -> ${targetVar}`);
            }

            return { success: true };
        } catch (error: any) {
            console.error(`[VariableNode] Error:`, error);
            return { success: false, error: error.message };
        }
    }

    private resolveNumber(val: string | number | undefined): number {
        if (typeof val === 'number') return val;
        if (!val) return 0;

        // If it looks like a variable {{var}}, resolve it
        const resolved = this.contextManager.resolve(String(val));
        const num = parseFloat(resolved);
        return isNaN(num) ? 0 : num;
    }
}
