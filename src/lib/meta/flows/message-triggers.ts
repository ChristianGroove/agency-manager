/**
 * Interactive Message Triggers for WhatsApp Flows
 * 
 * Generates List Messages and Reply Buttons that launch Flows
 * as triggers from AI intent detection.
 */

export interface FlowTriggerConfig {
    flowId: string;
    flowToken: string;
    flowActionPayload?: Record<string, any>;
}

/**
 * Generate List Message (Main Menu) - Up to 10 options
 */
export function generateFlowListMessage(params: {
    headerText: string;
    bodyText: string;
    buttonLabel: string;
    flows: {
        appointment?: FlowTriggerConfig;
        leadGen?: FlowTriggerConfig;
        support?: FlowTriggerConfig;
    };
}) {
    const { headerText, bodyText, buttonLabel, flows } = params;

    const rows: any[] = [];

    // Appointment booking flow
    if (flows.appointment) {
        rows.push({
            id: 'flow_appointment',
            title: '📅 Agendar Cita',
            description: 'Reserva una consulta técnica',
            metadata: JSON.stringify({
                action: 'launch_flow',
                flow_id: flows.appointment.flowId,
                flow_token: flows.appointment.flowToken
            })
        });
    }

    // Lead generation flow
    if (flows.leadGen) {
        rows.push({
            id: 'flow_lead_gen',
            title: '📋 Solicitar Información',
            description: 'Recibe detalles y cotización',
            metadata: JSON.stringify({
                action: 'launch_flow',
                flow_id: flows.leadGen.flowId,
                flow_token: flows.leadGen.flowToken
            })
        });
    }

    // Tech support flow
    if (flows.support) {
        rows.push({
            id: 'flow_support',
            title: '🛠️ Soporte Técnico',
            description: 'Crear ticket de ayuda',
            metadata: JSON.stringify({
                action: 'launch_flow',
                flow_id: flows.support.flowId,
                flow_token: flows.support.flowToken
            })
        });
    }

    return {
        type: 'interactive',
        interactive: {
            type: 'list',
            header: {
                type: 'text',
                text: headerText
            },
            body: {
                text: bodyText
            },
            action: {
                button: buttonLabel,
                sections: [
                    {
                        title: 'Opciones Disponibles',
                        rows
                    }
                ]
            }
        }
    };
}

/**
 * Generate Reply Buttons - Up to 3 options
 */
export function generateFlowReplyButtons(params: {
    bodyText: string;
    buttons: Array<{
        id: string;
        title: string;
        flowId?: string;
        flowToken?: string;
    }>;
}) {
    const { bodyText, buttons } = params;

    return {
        type: 'interactive',
        interactive: {
            type: 'button',
            body: {
                text: bodyText
            },
            action: {
                buttons: buttons.slice(0, 3).map(btn => ({
                    type: 'reply',
                    reply: {
                        id: btn.id,
                        title: btn.title.substring(0, 20), // Max 20 chars
                        metadata: btn.flowId ? JSON.stringify({
                            action: 'launch_flow',
                            flow_id: btn.flowId,
                            flow_token: btn.flowToken
                        }) : undefined
                    }
                }))
            }
        }
    };
}

/**
 * Generate Flow launch message (directly launches Flow)
 */
export function generateFlowLaunchMessage(params: {
    flowId: string;
    flowToken: string;
    screenId?: string;
    flowActionPayload?: Record<string, any>;
    headerText?: string;
    bodyText: string;
    footerText?: string;
}) {
    const {
        flowId,
        flowToken,
        screenId,
        flowActionPayload,
        headerText,
        bodyText,
        footerText
    } = params;

    return {
        type: 'interactive',
        interactive: {
            type: 'flow',
            header: headerText ? {
                type: 'text',
                text: headerText
            } : undefined,
            body: {
                text: bodyText
            },
            footer: footerText ? {
                text: footerText
            } : undefined,
            action: {
                name: 'flow',
                parameters: {
                    flow_message_version: '3',
                    flow_token: flowToken,
                    flow_id: flowId,
                    flow_cta: 'Continuar',
                    flow_action: 'navigate',
                    flow_action_payload: {
                        screen: screenId || 'APPOINTMENT_SCREEN',
                        data: flowActionPayload || {}
                    }
                }
            }
        }
    };
}

/**
 * Create Flow trigger from AI intent
 * This integrates with ai-message-handler.ts from Fase 2
 */
export function createFlowTriggerFromIntent(params: {
    intent: string;
    flowConfigs: Record<string, FlowTriggerConfig>;
}): {
    type: 'flow_launch';
    message: any;
    intent: string;
} | null {
    const { intent, flowConfigs } = params;

    // Map intents to Flows
    const intentFlowMap: Record<string, {
        config: FlowTriggerConfig;
        bodyText: string;
    }> = {
        'appointment_booking': {
            config: flowConfigs.appointment,
            bodyText: 'Te abro el formulario de agendamiento de cita técnica...'
        },
        'lead_generation': {
            config: flowConfigs.leadGen,
            bodyText: 'Te envío el formulario para recibir información...'
        },
        'technical_support': {
            config: flowConfigs.support,
            bodyText: 'Voy a crear un ticket de soporte técnico...'
        }
    };

    const mapping = intentFlowMap[intent];
    if (!mapping || !mapping.config) {
        return null;
    }

    const flowMessage = generateFlowLaunchMessage({
        flowId: mapping.config.flowId,
        flowToken: mapping.config.flowToken,
        bodyText: mapping.bodyText,
        screenId: mapping.config.flowActionPayload?.screen
    });

    return {
        type: 'flow_launch',
        message: flowMessage,
        intent
    };
}

/**
 * Quick actions for common scenarios
 */
export function generateQuickActionsMenu(flowConfigs: {
    appointment?: FlowTriggerConfig;
    leadGen?: FlowTriggerConfig;
    support?: FlowTriggerConfig;
}) {
    const buttons: Array<{
        id: string;
        title: string;
        flowId?: string;
        flowToken?: string;
    }> = [];

    if (flowConfigs.appointment) {
        buttons.push({
            id: 'quick_appointment',
            title: '📅 Agendar',
            flowId: flowConfigs.appointment.flowId,
            flowToken: flowConfigs.appointment.flowToken
        });
    }

    if (flowConfigs.support) {
        buttons.push({
            id: 'quick_support',
            title: '🛠️ Soporte',
            flowId: flowConfigs.support.flowId,
            flowToken: flowConfigs.support.flowToken
        });
    }

    if (flowConfigs.leadGen) {
        buttons.push({
            id: 'quick_info',
            title: '📋 Info',
            flowId: flowConfigs.leadGen.flowId,
            flowToken: flowConfigs.leadGen.flowToken
        });
    }

    return generateFlowReplyButtons({
        bodyText: '¿En qué puedo ayudarte?',
        buttons
    });
}
