
import { AssistantContext, AssistantAction } from "./types";
import { INTENT_REGISTRY, SystemIntent } from "./intent-registry";

export class PermissionGuard {
    /**
     * Validates if the current context has sufficient permissions to execute the action.
     */
    static check(context: AssistantContext, action: AssistantAction, intentName?: string): { allowed: boolean; reason?: string } {
        // 1. Check Space/Tenant Isolation (Sanity Check)
        if (!context.space_id || !context.tenant_id) {
            return { allowed: false, reason: "Contexto de espacio inválido (Space Integrity Breach)" };
        }

        // 2. Check Space Vertical/Type Logic (Phase 1 Requirement)
        // Ensure the intent is allowed in this type of Space
        if (intentName && INTENT_REGISTRY[intentName]) {
            const def = INTENT_REGISTRY[intentName];
            const vertical = context.vertical || 'agency'; // Default

            // If allow list exists and is not empty, check it.
            if (def.allowed_spaces && def.allowed_spaces.length > 0) {
                if (!def.allowed_spaces.includes(vertical)) {
                    // Check 'general' catch-all
                    if (!def.allowed_spaces.includes('general')) {
                        return {
                            allowed: false,
                            reason: `Esta acción no está disponible para espacios de tipo '${vertical}'.`
                        };
                    }
                }
            }
        }

        // 3. Check Permissions
        // We assume 'context.allowed_actions' contains the permissions/capabilities.
        // e.g. 'can_create_quote'

        const missingPermissions = action.required_permissions.filter(
            perm => !context.allowed_actions.includes(perm)
        );

        if (missingPermissions.length > 0) {
            return {
                allowed: false,
                reason: `Acceso denegado: Te faltan permisos para esta acción (${missingPermissions.join(', ')})`
            };
        }

        return { allowed: true };
    }
}
