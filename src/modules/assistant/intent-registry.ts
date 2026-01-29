import { IntentDefinition } from "./types";

/**
 * 🔒 PIXY GOVERNANCE REGISTRY
 * Only intents defined here can be proposed or executed.
 */

export const SYSTEM_INTENTS = {
    CREATE_BRIEF: 'create_brief',
    CREATE_QUOTE: 'create_quote',
    CREATE_CLIENT: 'create_client',
    SEND_PAYMENT_REMINDER: 'send_payment_reminder',
    LIST_PENDING_PAYMENTS: 'list_pending_payments',
    CREATE_CLIENT_NOTE: 'create_client_note',
    PAUSE_FLOW: 'pause_flow',
    ACTIVATE_FLOW: 'activate_flow',
    RUN_FLOW_ONCE: 'run_flow_once',
    LIST_ACTIVE_FLOWS: 'list_active_flows',
    CREATE_FLOW_FROM_TEMPLATE: 'create_flow_from_template',
    LIST_PENDING_ACTIONS: 'list_pending_actions'
} as const;

export const INTENT_REGISTRY: Record<string, IntentDefinition> = {

    // 1. CREATE BRIEF (High Risk - Content Creation)
    [SYSTEM_INTENTS.CREATE_BRIEF]: {
        id: SYSTEM_INTENTS.CREATE_BRIEF,
        name: "Crear Briefing",
        description: "Crear un nuevo briefing estructurado para un cliente.",

        risk_level: 'high',
        scope: 'agency',
        allowed_roles: ['owner', 'admin', 'editor'],
        module: 'crm',

        required_parameters: ['client_id', 'project_name'],
        allowed_spaces: ['agency'],
        linked_action: 'create_brief',
        requires_confirmation: true
    },

    // 2. SEND PAYMENT REMINDER (Medium Risk - External Comm)
    [SYSTEM_INTENTS.SEND_PAYMENT_REMINDER]: {
        id: SYSTEM_INTENTS.SEND_PAYMENT_REMINDER,
        name: "Enviar Recordatorio de Pago",
        description: "Enviar notificación de cobro a un cliente.",

        risk_level: 'medium',
        scope: 'agency',
        allowed_roles: ['owner', 'admin'],
        module: 'billing',

        required_parameters: ['invoice_id'],
        allowed_spaces: ['agency'],
        linked_action: 'send_payment_reminder',
        requires_confirmation: true
    },

    // 3. LIST PENDING PAYMENTS (Read Only - Low Risk)
    [SYSTEM_INTENTS.LIST_PENDING_PAYMENTS]: {
        id: SYSTEM_INTENTS.LIST_PENDING_PAYMENTS,
        name: "Listar Pagos Pendientes",
        description: "Ver lista de facturas vencidas o por vencer.",

        risk_level: 'low',
        scope: 'read-only',
        allowed_roles: ['owner', 'admin', 'viewer'],
        module: 'billing',

        required_parameters: [],
        allowed_spaces: ['agency'],
        linked_action: 'list_pending_payments',
        requires_confirmation: false
    },

    // 4. CREATE CLIENT NOTE (Low Risk - Internal Data)
    [SYSTEM_INTENTS.CREATE_CLIENT_NOTE]: {
        id: SYSTEM_INTENTS.CREATE_CLIENT_NOTE,
        name: "Crear Nota de Cliente",
        description: "Agregar una nota rápida al timeline del cliente.",

        risk_level: 'low',
        scope: 'agency',
        allowed_roles: ['owner', 'admin', 'editor', 'member'],
        module: 'crm',

        required_parameters: ['client_id', 'content'],
        allowed_spaces: ['agency'],
        linked_action: 'create_client_note',
        requires_confirmation: false // Low risk usually doesn't need confirmation, but can enforce if strict
    },

    // 5. PAUSE FLOW (High Risk - Operational Impact)
    [SYSTEM_INTENTS.PAUSE_FLOW]: {
        id: SYSTEM_INTENTS.PAUSE_FLOW,
        name: "Pausar Flujo",
        description: "Detener la ejecución de una automatización activa.",

        risk_level: 'high',
        scope: 'agency',
        allowed_roles: ['owner', 'admin'],
        module: 'flows',

        required_parameters: ['flow_id'],
        allowed_spaces: ['agency'],
        linked_action: 'pause_flow',
        requires_confirmation: true
    },

    // 6. ACTIVATE FLOW (High Risk)
    [SYSTEM_INTENTS.ACTIVATE_FLOW]: {
        id: SYSTEM_INTENTS.ACTIVATE_FLOW,
        name: "Activar Flujo",
        description: "Reanudar o iniciar una automatización.",

        risk_level: 'high',
        scope: 'agency',
        allowed_roles: ['owner', 'admin'],
        module: 'flows',

        required_parameters: ['flow_id'],
        allowed_spaces: ['agency'],
        linked_action: 'activate_flow',
        requires_confirmation: true
    },

    // 7. RUN FLOW ONCE (Medium Risk - Manual Trigger)
    [SYSTEM_INTENTS.RUN_FLOW_ONCE]: {
        id: SYSTEM_INTENTS.RUN_FLOW_ONCE,
        name: "Ejecutar Flujo (Manual)",
        description: "Forzar una ejecución inmediata de un flujo.",

        risk_level: 'medium',
        scope: 'agency',
        allowed_roles: ['owner', 'admin', 'editor'],
        module: 'flows',

        required_parameters: ['flow_id'],
        allowed_spaces: ['agency'],
        linked_action: 'run_flow_once',
        requires_confirmation: true // Always confirm manual triggers
    },

    // 8. LIST ACTIVE FLOWS (Read Only)
    [SYSTEM_INTENTS.LIST_ACTIVE_FLOWS]: {
        id: SYSTEM_INTENTS.LIST_ACTIVE_FLOWS,
        name: "Listar Flujos Activos",
        description: "Ver qué automatizaciones están corriendo actualmente.",

        risk_level: 'low',
        scope: 'read-only',
        allowed_roles: ['owner', 'admin', 'viewer'],
        module: 'flows',

        required_parameters: [],
        allowed_spaces: ['agency'],
        linked_action: 'list_active_flows',
        requires_confirmation: false
    }
};

export const getIntentDefinition = (intentId: string): IntentDefinition | undefined => {
    return INTENT_REGISTRY[intentId];
}
