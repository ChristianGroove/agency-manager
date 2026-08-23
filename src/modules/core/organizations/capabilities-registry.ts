
/**
 * PIXY CAPABILITIES REGISTRY
 * 
 * This file defines the atomic capabilities (flags) that drive the UI and logic.
 * Instead of relying on a "Vertical" industry type, we check for these capabilities.
 */

export type UICapability = 
  | 'crm.core'
  | 'crm.advanced'
  | 'crm.quotes'
  | 'messaging.standard'
  | 'messaging.bulk'
  | 'messaging.ai_agent'
  | 'billing.management'
  | 'hosting.management'
  | 'automation.engine'
  | 'automation.ai_analyzer'
  | 'notifications.smtp_custom'
  | 'whitelabel.branding'
  | 'whitelabel.domain_custom';

export interface TerminologyConfig {
  client: string;
  clients: string;
  project: string;
  sale: string;
  action_new: string;
}

export interface SpaceUIPolicy {
  visibleTabs: string[];
  showBilling: boolean;
  showHosting: boolean;
  showServices: boolean;
  showOrders: boolean;
  allowedChannels: string[];
  defaultDashboard?: string;
}

export interface SpaceManagementPolicy {
  visibleTabs: string[];
  profileSections: string[];
}

export interface SpaceRulesPolicy {
  allowedChannels: string[];
}

export interface DynamicSpaceConfig {
  terminology: TerminologyConfig;
  policies: SpaceUIPolicy;
  management: SpaceManagementPolicy;
  rules: SpaceRulesPolicy;
  capabilities: UICapability[];
}

/**
 * DEFAULT CAPABILITIES BY VERTICAL (Legacy Bridge)
 * This allows us to map existing organizations to the new capability system.
 */
export const CAPABILITY_PRESETS: Record<string, DynamicSpaceConfig> = {
  agency: {
    terminology: {
      client: 'Cliente',
      clients: 'Clientes',
      project: 'Proyecto',
      sale: 'Venta',
      action_new: 'Nuevo Cliente'
    },
    policies: {
      visibleTabs: ['info', 'activity', 'services', 'billing', 'hosting'],
      showBilling: true,
      showHosting: true,
      showServices: true,
      showOrders: false,
      allowedChannels: ['whatsapp', 'email', 'sms']
    },
    management: {
      visibleTabs: ['info', 'activity', 'services', 'billing', 'hosting'],
      profileSections: ['contact_info', 'business_details', 'social_links', 'preferences']
    },
    rules: {
      allowedChannels: ['whatsapp', 'email', 'sms']
    },
    capabilities: [
      'crm.core', 
      'crm.advanced', 
      'crm.quotes', 
      'messaging.standard', 
      'billing.management', 
      'hosting.management'
    ]
  },
  resto: {
    terminology: {
      client: 'Comensal',
      clients: 'Comensales',
      project: 'Reserva',
      sale: 'Pedido',
      action_new: 'Nuevo Comensal'
    },
    policies: {
      visibleTabs: ['info', 'activity', 'orders'],
      showBilling: false,
      showHosting: false,
      showServices: false,
      showOrders: true,
      allowedChannels: ['whatsapp', 'email']
    },
    management: {
      visibleTabs: ['info', 'activity', 'orders'],
      profileSections: ['contact_info', 'preferences']
    },
    rules: {
      allowedChannels: ['whatsapp', 'email']
    },
    capabilities: [
      'crm.core', 
      'messaging.standard'
    ]
  },
  real_estate: {
    terminology: {
      client: 'Cliente / Comprador',
      clients: 'Clientes / Prospectos',
      project: 'Inmueble / Propiedad',
      sale: 'Cierre / Negocio',
      action_new: 'Nuevo Prospecto'
    },
    policies: {
      visibleTabs: ['info', 'activity', 'services', 'billing'],
      showBilling: true,
      showHosting: false,
      showServices: true,
      showOrders: false,
      allowedChannels: ['whatsapp', 'email', 'sms'],
      defaultDashboard: 'real_estate'
    },
    management: {
      visibleTabs: ['info', 'activity', 'services', 'billing'],
      profileSections: ['contact_info', 'business_details', 'preferences']
    },
    rules: {
      allowedChannels: ['whatsapp', 'email', 'sms']
    },
    capabilities: [
      'crm.core',
      'crm.advanced',
      'crm.quotes',
      'messaging.standard',
      'messaging.ai_agent',
      'billing.management',
      'automation.engine'
    ]
  },
  cleaning: {
    terminology: {
      client: 'Cliente',
      clients: 'Clientes',
      project: 'Servicio',
      sale: 'Orden',
      action_new: 'Nuevo Cliente'
    },
    policies: {
      visibleTabs: ['info', 'activity', 'services', 'billing'],
      showBilling: true,
      showHosting: false,
      showServices: true,
      showOrders: false,
      allowedChannels: ['whatsapp', 'email', 'sms']
    },
    management: {
      visibleTabs: ['info', 'activity', 'services', 'billing'],
      profileSections: ['contact_info', 'preferences']
    },
    rules: {
      allowedChannels: ['whatsapp', 'email', 'sms']
    },
    capabilities: [
      'crm.core',
      'crm.advanced',
      'messaging.standard',
      'billing.management'
    ]
  },
  retail: {
    terminology: {
      client: 'Cliente',
      clients: 'Clientes',
      project: 'Compra',
      sale: 'Venta',
      action_new: 'Nuevo Cliente'
    },
    policies: {
      visibleTabs: ['info', 'activity', 'billing'],
      showBilling: true,
      showHosting: false,
      showServices: false,
      showOrders: false,
      allowedChannels: ['whatsapp', 'email', 'sms']
    },
    management: {
      visibleTabs: ['info', 'activity', 'billing'],
      profileSections: ['contact_info', 'preferences']
    },
    rules: {
      allowedChannels: ['whatsapp', 'email', 'sms']
    },
    capabilities: [
      'crm.core',
      'messaging.standard',
      'billing.management'
    ]
  },
  saas: {
    terminology: {
      client: 'Usuario',
      clients: 'Usuarios',
      project: 'Suscripción',
      sale: 'Plan',
      action_new: 'Nuevo Usuario'
    },
    policies: {
      visibleTabs: ['info', 'activity', 'services', 'billing'],
      showBilling: true,
      showHosting: false,
      showServices: true,
      showOrders: false,
      allowedChannels: ['email', 'whatsapp']
    },
    management: {
      visibleTabs: ['info', 'activity', 'services', 'billing'],
      profileSections: ['contact_info', 'business_details', 'preferences']
    },
    rules: {
      allowedChannels: ['email', 'whatsapp']
    },
    capabilities: [
      'crm.core',
      'crm.advanced',
      'messaging.standard',
      'billing.management',
      'automation.engine'
    ]
  },
  platform: {
    terminology: {
      client: 'Tenant',
      clients: 'Tenants',
      project: 'Infraestructura',
      sale: 'Suscripción',
      action_new: 'Nuevo Tenant'
    },
    policies: {
      visibleTabs: ['info', 'activity', 'services', 'billing'],
      showBilling: true,
      showHosting: false,
      showServices: true,
      showOrders: false,
      allowedChannels: ['email', 'sms']
    },
    management: {
      visibleTabs: ['info', 'activity', 'services', 'billing'],
      profileSections: ['contact_info', 'business_details', 'preferences']
    },
    rules: {
      allowedChannels: ['email', 'sms']
    },
    capabilities: [
      'crm.core',
      'crm.advanced',
      'messaging.standard',
      'billing.management',
      'automation.engine',
      'whitelabel.branding',
      'whitelabel.domain_custom'
    ]
  }
};
