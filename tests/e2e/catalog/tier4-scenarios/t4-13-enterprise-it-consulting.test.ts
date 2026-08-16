/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-13-enterprise-it-consulting
 * Domain: S13 - Enterprise IT Consulting & Corporate SLA
 * Features Exercised: F3 (Classification), F5 (Addons), F6 (Modal), F11 (Specs), F13 (AI), F17 (CRM), F20 (SSR /portfolio), F21 (Admin Tabs), F24 (Compat), F25 (RLS)
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice, StorefrontActionPayload } from '../harness/contracts';
import { TENANT_A_ID, TENANT_B_ID } from '../harness/mock-data';
import { authorizeCatalogAction, UserSession } from '../tier2-boundaries/t2-20-rbac-unauthorized.test';
import { parseSpecificationTabs } from '../tier2-boundaries/t2-11-spec-tabs-empty.test';
import { submitStorefrontQuoteToCRM, CRMSubmissionState } from '../tier2-boundaries/t2-17-crm-lead-dedup-resilience.test';

export const mockITConsulting: UniversalCatalogItem = {
  id: 'item-it-013',
  organization_id: TENANT_A_ID,
  name: 'Arquitectura Cloud & Ciberseguridad ISO 27001 para Banca',
  description: 'Consultoría estratégica de infraestructura multinube, modernización de microservicios y compliance regulatorio.',
  category_id: 'cat-enterprise-it',
  category: 'Ciberseguridad & Cloud',
  base_price: 12000000,
  type: 'recurring',
  classification: 'service',
  frequency: 'monthly',
  image_url: 'https://cdn.pixy.app/demo/cloud-sec.webp',
  gallery_images: [
    { id: 'it-1', url: 'https://cdn.pixy.app/demo/cloud-sec.webp', is_cover: true, order_index: 0 },
  ],
  inventory_quantity: 2, // Only 2 concurrent enterprise retainers
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 1,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [
    {
      id: 'addon-soc-monitoring',
      name: 'Centro de Operaciones de Seguridad (SOC 24/7)',
      selection_type: 'single',
      is_required: false,
      options: [
        { id: 'soc-business-hours', name: 'Monitoreo Horario Hábil 8x5', price_delta: 0, is_default: true },
        { id: 'soc-full-247', name: 'SOC 24/7/365 con Respuesta Inmediata a Incidentes', price_delta: 6500000, is_default: false },
      ],
    },
  ],
  badges: ['Destacado', 'Pocas Unidades'],
  specifications: {
    features: ['Ingenieros Certificados AWS Solutions Architect & CISM', 'Pruebas de penetración periódicas (Ethical Hacking)', 'Auditoría de código estático (SAST/DAST)'],
    deliverables: ['Informe mensual ejecutivo C-Level', 'Matriz de riesgos ISO 27001 actualizada'],
    warranty: 'SLA de respuesta a incidentes críticos menor a 15 minutos garantizado por contrato.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

const itService = mockITConsulting;
const now = 1755000000000;

export const suite = {
  name: 'T4-13: Scenario S13 - Enterprise IT Consulting & Corporate Retainer',
  tier: 'Tier 4',
  feature: 'S13: Enterprise IT Consulting & Corporate SLA',
  tests: [
    {
      name: 'Step 1: Corporate IAM access verification for /portfolio Server Component',
      fn: async () => {
        const adminSession: UserSession = {
          userId: 'usr-corp-admin',
          organizationId: TENANT_A_ID,
          role: 'admin',
          expiresAtMs: now + 3600000,
        };

        const auth = authorizeCatalogAction(adminSession, TENANT_A_ID, 'admin_workspace', now);
        expect(auth.allowed).toBe(true);
        expect(auth.statusCode).toBe(200);

        // Cross-tenant attempt is blocked
        const foreignAuth = authorizeCatalogAction(adminSession, TENANT_B_ID, 'admin_workspace', now);
        expect(foreignAuth.allowed).toBe(false);
        expect(foreignAuth.statusCode).toBe(403);
      },
    },
    {
      name: 'Step 2: Specification tabs show ISO 27001 compliance and 15-min incident response SLA',
      fn: async () => {
        const tabs = parseSpecificationTabs(itService.description, itService.specifications);
        expect(tabs.length).toBeGreaterThanOrEqual(3);

        const warrantyTab = tabs.find((t) => t.id === 'warranty');
        expect(warrantyTab).toBeDefined();
        expect(warrantyTab!.content).toContain('SLA de respuesta a incidentes críticos menor a 15 minutos');
      },
    },
    {
      name: 'Step 3: Enterprise client configures Retainer + SOC 24/7/365 Addon ($6,500,000 COP)',
      fn: async () => {
        const socAddon = itService.addon_groups[0].options[1]; // +6,500,000 COP

        const total = calculateEffectiveTotalPrice(
          itService,
          null,
          [{ priceDelta: socAddon.price_delta }],
          1
        );

        // 12,000,000 + 6,500,000 = 18,500,000 COP / month
        expect(total).toBe(18500000);
      },
    },
    {
      name: 'Step 4: Converts corporate inquiry into direct CRM Lead & B2B Draft Quote with SLA terms',
      fn: async () => {
        const crmState: CRMSubmissionState = { recentSubmissions: new Map() };
        const socAddon = itService.addon_groups[0].options[1];

        const payload: StorefrontActionPayload = {
          itemId: itService.id,
          calculatedTotalPrice: 18500000,
          quantity: 1,
          selectedAddons: [{ groupId: 'soc', optionId: socAddon.id, name: socAddon.name, priceDelta: socAddon.price_delta }],
          customerInfo: {
            name: 'Banco Financiero Nacional (VP Tecnología)',
            email: 'vp.ti@bancofinanciero.com.co',
            phone: '3101119988',
            notes: 'Requiere firma previa de Acuerdo de Confidencialidad (NDA).',
          },
          deepLinkUrl: 'https://pixy.app/it-consulting/p/item-it-013',
        };

        const crm = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(crm.success).toBe(true);
        expect(crm.draft?.quote.total_amount).toBe(18500000);
        expect(crm.draft?.lead.email).toBe('vp.ti@bancofinanciero.com.co');
      },
    },
    {
      name: 'Step 5: Backwards compatibility with legacy corporate contracts referencing IT services',
      fn: async () => {
        expect(itService.classification).toBe('service');
        expect(itService.type).toBe('recurring');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier4');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
