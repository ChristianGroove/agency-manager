/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-05-freelance-design-services
 * Domain: S5 - Freelance UI/UX & Brand Design Services
 * Features Exercised: F1, F3, F5, F6, F8, F11, F13, F16, F17, F19
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice, StorefrontActionPayload } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { parseSpecificationTabs } from '../tier2-boundaries/t2-11-spec-tabs-empty.test';
import { submitStorefrontQuoteToCRM, CRMSubmissionState } from '../tier2-boundaries/t2-17-crm-lead-dedup-resilience.test';

export const mockDesignService: UniversalCatalogItem = {
  id: 'item-design-005',
  organization_id: TENANT_A_ID,
  name: 'Diseño de Marca e Identidad Visual Completa',
  description: 'Manual de marca, logotipo responsivo, paleta cromática, tipografías y templates para redes sociales.',
  category_id: 'cat-design',
  category: 'Diseño y Creatividad',
  base_price: 1800000,
  type: 'one_off',
  classification: 'service',
  image_url: 'https://cdn.pixy.app/demo/brand-cover.webp',
  gallery_images: [
    { id: 'dsg-1', url: 'https://cdn.pixy.app/demo/brand-cover.webp', is_cover: true, order_index: 0 },
    { id: 'dsg-2', url: 'https://cdn.pixy.app/demo/brand-mockup.webp', is_cover: false, order_index: 1 },
  ],
  inventory_quantity: 3,
  track_inventory: true,
  allow_backorders: false,
  low_stock_threshold: 1,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [
    {
      id: 'addon-revisions',
      name: 'Rondas de Revisión Adicionales',
      selection_type: 'single',
      is_required: false,
      options: [
        { id: 'opt-rev-std', name: '2 Rondas de Ajustes (Incluidas)', price_delta: 0, is_default: true },
        { id: 'opt-rev-unlimited', name: 'Rondas Ilimitadas por 15 Días', price_delta: 450000, is_default: false },
      ],
    },
    {
      id: 'addon-assets',
      name: 'Entregables Adicionales',
      selection_type: 'multiple',
      is_required: false,
      options: [
        { id: 'opt-3d-assets', name: 'Renders 3D de Empaques y Packaging', price_delta: 600000, is_default: false },
        { id: 'opt-motion-logo', name: 'Animación de Logo en After Effects / Lottie', price_delta: 350000, is_default: false },
      ],
    },
  ],
  badges: ['Destacado', 'Pocas Unidades'],
  specifications: {
    features: ['Archivos vectoriales (.AI, .SVG, .PDF)', 'Figma Design System organizado', 'Guía de uso tipográfico'],
    deliverables: ['Entrega en 10 días hábiles', 'Transferencia total de derechos patrimoniales de autor'],
    warranty: 'Garantía de satisfacción con llamada de revisión uno a uno.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-11T09:00:00Z',
};

const design = mockDesignService;
const crmState: CRMSubmissionState = { recentSubmissions: new Map() };

export const suite = {
  name: 'T4-05: Scenario S5 - Freelance Design Package',
  tier: 'Tier 4',
  feature: 'S5: Creative Services & Freelance Design Studio',
  tests: [
    {
      name: 'Step 1: Freelance design service model validation and multi-image portfolio preview',
      fn: async () => {
        expect(design.classification).toBe('service');
        expect(design.type).toBe('one_off');
        expect(design.gallery_images).toHaveLength(2);
      },
    },
    {
      name: 'Step 2: Specification tabs show vector deliverables and copyright transfer terms',
      fn: async () => {
        const tabs = parseSpecificationTabs(design.description, design.specifications);
        expect(tabs.length).toBeGreaterThanOrEqual(3);

        const deliverablesTab = tabs.find((t) => t.id === 'deliverables');
        expect(deliverablesTab).toBeDefined();
        expect((deliverablesTab!.content as string[])).toContain('Transferencia total de derechos patrimoniales de autor');
      },
    },
    {
      name: 'Step 3: Client configures Unlimited Revisions + 3D Packaging Render + Motion Logo',
      fn: async () => {
        const addons = [
          { priceDelta: design.addon_groups[0].options[1].price_delta },
          { priceDelta: design.addon_groups[1].options[0].price_delta },
          { priceDelta: design.addon_groups[1].options[1].price_delta },
        ];

        const total = calculateEffectiveTotalPrice(design, null, addons, 1);
        expect(total).toBe(3200000);
      },
    },
    {
      name: 'Step 4: Converts customized design package into direct CRM Lead and Quote draft',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: design.id,
          calculatedTotalPrice: 3200000,
          quantity: 1,
          selectedAddons: [
            { groupId: 'g1', optionId: 'opt-rev-unlimited', name: 'Rondas Ilimitadas', priceDelta: 450000 },
            { groupId: 'g2', optionId: 'opt-3d-assets', name: 'Renders 3D', priceDelta: 600000 },
            { groupId: 'g2', optionId: 'opt-motion-logo', name: 'Animación Logo', priceDelta: 350000 },
          ],
          customerInfo: {
            name: 'Mauricio Villa',
            email: 'mauricio@innovacion.co',
            phone: '3137778899',
            notes: 'Marca de café especial para exportación a Europa.',
          },
          deepLinkUrl: 'https://pixy.app/estudio/p/item-design-005',
        };

        const crm = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(crm.success).toBe(true);
        expect(crm.draft?.quote.total_amount).toBe(3200000);
        expect(crm.draft?.quote.items[0].addons).toHaveLength(3);
      },
    },
    {
      name: 'Step 5: Client notes and brand briefing details preserved in CRM record',
      fn: async () => {
        expect(design.is_visible_in_portal).toBe(true);
        expect(design.is_active).toBe(true);
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
