
/**
 * Vertical Configuration System (Industry Profiles)
 * Defines how the CRM UI adapts to different industry verticals (Spaces).
 */

export type VerticalType = 'agency' | 'resto' | 'cleaning' | 'retail' | 'saas' | 'platform';

export interface VerticalConfig {
    crmTemplateId: string; // Link to CRMTemplates in @/modules/core/crm/templates/registry
    terminology: {
        client: string;    // 'Cliente', 'Comensal', 'Paciente'
        clients: string;   // 'Clientes', 'Comensales', 'Pacientes'
        project: string;   // 'Proyecto', 'Reserva', 'Contrato'
        sale: string;      // 'Venta', 'Pedido', 'Tratamiento'
        action_new: string; // 'Nuevo Cliente', 'Nuevo Comensal'
    };
    insights: {
        primary: {
            label: string;
            key: string;
        };
        secondary: {
            label: string;
            key: string;
        };
    };
    management: {
        visibleTabs: string[];
        profileSections: ('identity' | 'communication' | 'digital_presence')[];
        actions: {
            showBilling: boolean;
            showHosting: boolean;
            showServices: boolean;
            showOrders: boolean;
        };
    };
    rules: {
        allowedChannels: string[];
    };
}

export const VERTICAL_REGISTRY: Record<VerticalType, VerticalConfig> = {
    agency: {
        crmTemplateId: 'agency',
        terminology: {
            client: 'Cliente',
            clients: 'Clientes',
            project: 'Proyecto',
            sale: 'Venta',
            action_new: 'Nuevo Cliente'
        },
        insights: {
            primary: { label: 'Próximo Pago', key: 'next_payment' },
            secondary: { label: 'Suscripciones', key: 'active_services' }
        },
        management: {
            visibleTabs: ['info', 'activity', 'services', 'billing', 'hosting'],
            profileSections: ['identity', 'communication', 'digital_presence'],
            actions: {
                showBilling: true,
                showHosting: true,
                showServices: true,
                showOrders: false
            }
        },
        rules: {
            allowedChannels: ['whatsapp', 'email', 'sms']
        }
    },
    resto: {
        crmTemplateId: 'resto',
        terminology: {
            client: 'Comensal',
            clients: 'Comensales',
            project: 'Reserva',
            sale: 'Pedido',
            action_new: 'Nuevo Comensal'
        },
        insights: {
            primary: { label: 'Visitas', key: 'visits' },
            secondary: { label: 'LTV (Gasto)', key: 'ltv' }
        },
        management: {
            visibleTabs: ['info', 'activity', 'orders'],
            profileSections: ['identity', 'communication'],
            actions: {
                showBilling: false,
                showHosting: false,
                showServices: false,
                showOrders: true
            }
        },
        rules: {
            allowedChannels: ['whatsapp', 'email']
        }
    },
    cleaning: {
        crmTemplateId: 'cleaning',
        terminology: {
            client: 'Cliente',
            clients: 'Clientes',
            project: 'Servicio',
            sale: 'Orden',
            action_new: 'Nuevo Cliente'
        },
        insights: {
            primary: { label: 'Próximo Servicio', key: 'next_service' },
            secondary: { label: 'Frecuencia', key: 'frequency' }
        },
        management: {
            visibleTabs: ['info', 'activity', 'services', 'billing'],
            profileSections: ['identity', 'communication'],
            actions: {
                showBilling: true,
                showHosting: false,
                showServices: true,
                showOrders: false
            }
        },
        rules: {
            allowedChannels: ['whatsapp', 'email', 'sms']
        }
    },
    retail: {
        crmTemplateId: 'ecommerce', // Linked to high-ticket/retail flow
        terminology: {
            client: 'Cliente',
            clients: 'Clientes',
            project: 'Compra',
            sale: 'Venta',
            action_new: 'Nuevo Cliente'
        },
        insights: {
            primary: { label: 'Última Compra', key: 'last_purchase' },
            secondary: { label: 'Puntos', key: 'points' }
        },
        management: {
            visibleTabs: ['info', 'activity', 'billing'],
            profileSections: ['identity', 'communication'],
            actions: {
                showBilling: true,
                showHosting: false,
                showServices: false,
                showOrders: false
            }
        },
        rules: {
            allowedChannels: ['whatsapp', 'email', 'sms']
        }
    },
    saas: {
        crmTemplateId: 'saas',
        terminology: {
            client: 'Usuario',
            clients: 'Usuarios',
            project: 'Suscripción',
            sale: 'Plan',
            action_new: 'Nuevo Usuario'
        },
        insights: {
            primary: { label: 'Plan Actual', key: 'current_plan' },
            secondary: { label: 'Uso de API', key: 'api_usage' }
        },
        management: {
            visibleTabs: ['info', 'activity', 'services', 'billing'],
            profileSections: ['identity', 'communication', 'digital_presence'],
            actions: {
                showBilling: true,
                showHosting: false,
                showServices: true,
                showOrders: false
            }
        },
        rules: {
            allowedChannels: ['email', 'whatsapp']
        }
    },
    platform: {
        crmTemplateId: 'saas', // Uses high-level SaaS/Platform flow
        terminology: {
            client: 'Tenant',
            clients: 'Tenants',
            project: 'Infraestructura',
            sale: 'Suscripción',
            action_new: 'Nuevo Tenant'
        },
        insights: {
            primary: { label: 'Costo Infra', key: 'infra_cost' },
            secondary: { label: 'Actividad', key: 'health_score' }
        },
        management: {
            visibleTabs: ['info', 'activity', 'services', 'billing'],
            profileSections: ['identity', 'communication', 'digital_presence'],
            actions: {
                showBilling: true,
                showHosting: false,
                showServices: true,
                showOrders: false
            }
        },
        rules: {
            allowedChannels: ['email', 'sms']
        }
    }
};
