/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-13-industrial-equipment-manufacturing
 * Domain: S13 - Industrial Machinery & B2B Custom Engineering
 * Features Exercised: F1, F3, F4, F5, F6, F9, F10, F11, F13, F14, F15, F17, F20, F24, F25
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice, StorefrontActionPayload } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { parseSpecificationTabs } from '../tier2-boundaries/t2-11-spec-tabs-empty.test';
import { generateStorefrontQRUrl } from '../tier2-boundaries/t2-14-qr-special-chars.test';
import { submitStorefrontQuoteToCRM, CRMSubmissionState } from '../tier2-boundaries/t2-17-crm-lead-dedup-resilience.test';

export const mockIndustrialMachinery: UniversalCatalogItem = {
  id: 'item-machinery-013',
  organization_id: TENANT_A_ID,
  name: 'Empacadora & Dosificadora Automática Industrial de Gránulos 500g-5kg',
  description: 'Línea de empaque industrial servo-controlada con pesaje multicabezal de alta velocidad para café y granos.',
  category_id: 'cat-industrial-packaging',
  category: 'Maquinaria Industrial & Automatización',
  base_price: 48000000,
  type: 'product',
  classification: 'physical',
  image_url: 'https://cdn.pixy.app/demo/machinery-main.webp',
  gallery_images: [
    { id: 'mch-1', url: 'https://cdn.pixy.app/demo/machinery-main.webp', is_cover: true, order_index: 0, alt_text: 'Vista Frontal Línea de Empaque' },
    { id: 'mch-2', url: 'https://cdn.pixy.app/demo/machinery-weigh.webp', is_cover: false, order_index: 1, alt_text: 'Cabezal de Pesaje Multicabezal' },
    { id: 'mch-3', url: 'https://cdn.pixy.app/demo/machinery-plc.webp', is_cover: false, order_index: 2, alt_text: 'Panel de Control Siemens PLC' },
  ],
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  sku: 'IND-PACK-VFFS-2026',
  inventory_quantity: 2,
  track_inventory: true,
  allow_backorders: true,
  low_stock_threshold: 1,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-voltage-power',
      organization_id: TENANT_A_ID,
      name: 'Voltaje de Operación',
      slug: 'voltaje',
      swatch_type: 'pill',
      options: [
        { id: 'v-220-trifasico', label: '220V Trifásico 60Hz', value: '220V Trifásico', order_index: 0 },
        { id: 'v-440-trifasico', label: '440V Trifásico Industrial', value: '440V Trifásico', order_index: 1 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-v220',
      catalog_item_id: 'item-machinery-013',
      title: '220V Trifásico',
      price_modifier: 0,
      price_type: 'offset',
      inventory_quantity: 1,
      track_inventory: true,
      attributes: { 'Voltaje de Operación': '220V Trifásico' },
      is_active: true,
    },
    {
      id: 'var-v440',
      catalog_item_id: 'item-machinery-013',
      title: '440V Trifásico con Transformador Integrado',
      price_modifier: 4500000,
      price_type: 'offset',
      inventory_quantity: 1,
      track_inventory: true,
      attributes: { 'Voltaje de Operación': '440V Trifásico' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-commissioning',
      name: 'Servicio de Puesta en Marcha & Capacitación en Planta',
      selection_type: 'single',
      is_required: true,
      options: [
        { id: 'com-bogota', name: 'Instalación y Capacitación Zona Bogotá / Sabana', price_delta: 2500000, is_default: true },
        { id: 'com-nacional', name: 'Instalación Nacional (Todo Colombia con Viáticos)', price_delta: 5500000, is_default: false },
      ],
    },
    {
      id: 'addon-machinery-options',
      name: 'Módulos Opcionales de la Línea',
      selection_type: 'multiple',
      is_required: false,
      options: [
        { id: 'opt-nitrogen', name: 'Sistema de Inyección de Gas Nitrógeno (Preservación)', price_delta: 6800000, is_default: false },
        { id: 'opt-laser-date', name: 'Fechador Láser de Fibra Óptica para Lote y Vencimiento', price_delta: 8200000, is_default: false },
      ],
    },
  ],
  badges: ['Destacado', 'Garantía 2 Años'],
  specifications: {
    features: [
      'Velocidad de empaque: Hasta 60 bolsas/minuto',
      'Construcción en Acero Inoxidable Quirúrgico AISI 316L',
      'Control por pantalla táctil Siemens HMI 10" con recetas configurables',
    ],
    deliverables: ['Planos mecánicos y eléctricos en CAD', 'Manual técnico en español', 'Certificado de calibración metrológica'],
    warranty: '2 Años de garantía de fábrica con repuestos en stock nacional permanente.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-01T00:00:00Z',
};

const machine = mockIndustrialMachinery;
const crmState: CRMSubmissionState = { recentSubmissions: new Map() };

export const suite = {
  name: 'T4-13: Scenario S13 - Industrial Machinery & Custom Engineering',
  tier: 'Tier 4',
  feature: 'S13: Industrial Equipment & Custom B2B Manufacturing',
  tests: [
    {
      name: 'Step 1: Industrial machine multi-photo gallery and video demonstration verification',
      fn: async () => {
        expect(machine.classification).toBe('physical');
        expect(machine.gallery_images).toHaveLength(3);
        expect(machine.video_url).toContain('youtube.com');
      },
    },
    {
      name: 'Step 2: Technical specifications tab verifies AISI 316L stainless steel and 2-year warranty',
      fn: async () => {
        const tabs = parseSpecificationTabs(machine.description, machine.specifications);
        expect(tabs.length).toBeGreaterThanOrEqual(3);

        const features = tabs.find((t) => t.id === 'features');
        expect((features!.content as string[])).toContain('Construcción en Acero Inoxidable Quirúrgico AISI 316L');

        const warranty = tabs.find((t) => t.id === 'warranty');
        expect(warranty!.content).toContain('2 Años de garantía de fábrica');
      },
    },
    {
      name: 'Step 3: Plant Director configures 440V ($+4.5M) + National Setup ($+5.5M) + Nitrogen ($+6.8M) + Laser ($+8.2M)',
      fn: async () => {
        const v440Variant = machine.variants[1];
        const nationalSetup = machine.addon_groups[0].options[1];
        const nitrogenModule = machine.addon_groups[1].options[0];
        const laserDateModule = machine.addon_groups[1].options[1];

        const total = calculateEffectiveTotalPrice(
          machine,
          v440Variant,
          [
            { priceDelta: nationalSetup.price_delta },
            { priceDelta: nitrogenModule.price_delta },
            { priceDelta: laserDateModule.price_delta },
          ],
          1
        );

        expect(total).toBe(48000000 + 4500000 + 5500000 + 6800000 + 8200000);
        expect(total).toBe(73000000);
      },
    },
    {
      name: 'Step 4: Converts multi-million COP configuration into formal CRM B2B Quote & Lead pipeline draft',
      fn: async () => {
        const v440Variant = machine.variants[1];
        const nationalSetup = machine.addon_groups[0].options[1];
        const nitrogenModule = machine.addon_groups[1].options[0];
        const laserDateModule = machine.addon_groups[1].options[1];

        const payload: StorefrontActionPayload = {
          itemId: machine.id,
          variantId: v440Variant.id,
          selectedVariant: v440Variant,
          selectedAddons: [
            { groupId: 'g1', optionId: nationalSetup.id, name: nationalSetup.name, priceDelta: nationalSetup.price_delta },
            { groupId: 'g2', optionId: nitrogenModule.id, name: nitrogenModule.name, priceDelta: nitrogenModule.price_delta },
            { groupId: 'g2', optionId: laserDateModule.id, name: laserDateModule.name, priceDelta: laserDateModule.price_delta },
          ],
          calculatedTotalPrice: 73000000,
          quantity: 1,
          customerInfo: {
            name: 'Ing. Gustavo Petrocelli',
            email: 'gpetrocelli@industriasdelcafe.com',
            phone: '3109990011',
            notes: 'Requerimos cotización formal con RUT y Certificación Bancaria para junta directiva.',
          },
          deepLinkUrl: 'https://pixy.app/maquinaria/p/item-machinery-013?variant=var-v440',
        };

        const crm = submitStorefrontQuoteToCRM(payload, TENANT_A_ID, crmState);
        expect(crm.success).toBe(true);
        expect(crm.draft?.quote.total_amount).toBe(73000000);
        expect(crm.draft?.quote.items[0].addons).toHaveLength(3);
      },
    },
    {
      name: 'Step 5: QR deep link printed on industrial machinery catalog brochure opens exact 440V configuration',
      fn: async () => {
        const qr = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'ind-machinery',
          itemId: machine.id,
          variantId: 'var-v440',
          customQueryParams: { expo: 'andina_pack_2026' },
        });

        expect(qr.fullUrl).toContain('ind-machinery/p/item-machinery-013?variant=var-v440');
        expect(qr.fullUrl).toContain('expo=andina_pack_2026');
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
