
import { ContextManager } from '../context-manager';

export interface ConditionNodeData {
    logic?: 'ALL' | 'ANY';
    conditions?: Array<{
        variable: string;
        operator: string;
        value: string;
    }>;
    // Legacy support
    variable?: string;
    operator?: string;
    value?: string;
}

export class ConditionNode {
    constructor(private contextManager: ContextManager) { }

    execute(data: ConditionNodeData): boolean {
        const conditions = data.conditions || [{
            variable: data.variable || '',
            operator: data.operator || 'equals',
            value: data.value || ''
        }];

        const logic = data.logic || 'ALL';

        const results = conditions.map(cond => {
            const resolvedVar = this.contextManager.resolve(`{{${cond.variable}}}`);
            let result = false;

            // Normalize values for comparison
            // Check if both are numbers
            const isNum = !isNaN(Number(resolvedVar)) && !isNaN(Number(cond.value)) && resolvedVar !== '' && cond.value !== '';

            switch (cond.operator) {
                case '==':
                case 'equals': result = resolvedVar == cond.value; break; // Loose equality for flexibility
                case '!=':
                case 'not_equals': result = resolvedVar != cond.value; break;

                case '>':
                case 'greater_than': result = isNum ? Number(resolvedVar) > Number(cond.value) : String(resolvedVar) > String(cond.value); break;

                case '<':
                case 'less_than': result = isNum ? Number(resolvedVar) < Number(cond.value) : String(resolvedVar) < String(cond.value); break;

                case '>=':
                case 'greater_equal': result = isNum ? Number(resolvedVar) >= Number(cond.value) : String(resolvedVar) >= String(cond.value); break;

                case '<=':
                case 'less_equal': result = isNum ? Number(resolvedVar) <= Number(cond.value) : String(resolvedVar) <= String(cond.value); break;

                case 'contains': result = String(resolvedVar).toLowerCase().includes(String(cond.value).toLowerCase()); break;

                case 'starts_with': result = String(resolvedVar).toLowerCase().startsWith(String(cond.value).toLowerCase()); break;

                case 'ends_with': result = String(resolvedVar).toLowerCase().endsWith(String(cond.value).toLowerCase()); break;

                case 'is_set': result = resolvedVar !== '' && resolvedVar !== null && resolvedVar !== undefined; break;
                case 'is_empty': result = resolvedVar === '' || resolvedVar === null || resolvedVar === undefined; break;

                default: result = false;
            }

            console.log(`[ConditionNode] ${cond.variable} ('${resolvedVar}') ${cond.operator} '${cond.value}' = ${result}`);
            return result;
        });

        const finalResult = logic === 'ALL' ? results.every(r => r) : results.some(r => r);
        console.log(`[ConditionNode] Final result (${logic}): ${finalResult}`);

        return finalResult;
    }
}
