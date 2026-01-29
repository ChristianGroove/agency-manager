import { AssistantContext } from "./types";
import { getIntentDefinition } from "./intent-registry";

export type ValidationResult = {
    valid: boolean;
    reason?: string;
    risk_level?: 'low' | 'medium' | 'high';
};

export class IntentValidator {

    static validate(intentId: string, context: AssistantContext): ValidationResult {
        const def = getIntentDefinition(intentId);

        // 1. Existence Check
        if (!def) {
            return { valid: false, reason: `Intención '${intentId}' no registrada en el sistema.` };
        }

        // 2. Space Check
        if (!def.allowed_spaces.includes(context.vertical || 'general')) {
            // Fallback for simplistic 'agency' matching if vertical not strictly set in context
            if (def.allowed_spaces.includes('agency') && context.space_id === 'agency') {
                // Pass
            } else {
                return { valid: false, reason: `Intención no permitida en el espacio actual (${context.vertical || context.space_id}).` };
            }
        }

        // 3. Role Check (Basic string matching for MVP)
        // If user role is 'owner' or 'super_admin', usually allow all.
        const userRole = context.role;
        if (!def.allowed_roles.includes(userRole) && userRole !== 'owner') {
            return { valid: false, reason: `Tu rol (${userRole}) no tiene permiso para ejecutar '${def.name}'.` };
        }

        return {
            valid: true,
            risk_level: def.risk_level
        };
    }
}
