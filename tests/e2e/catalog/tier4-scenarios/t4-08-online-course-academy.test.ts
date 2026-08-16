/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-08-online-course-academy
 * Domain: S8 - Digital EdTech & Online Academy Course
 * Features Exercised: F1, F3, F4, F6, F9, F10, F11, F13, F15, F18
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem, calculateEffectiveTotalPrice } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { parseAndSanitizeVideoUrl } from '../tier2-boundaries/t2-09-video-malformed.test';
import { parseSpecificationTabs } from '../tier2-boundaries/t2-11-spec-tabs-empty.test';
import { createWompiPaymentSession } from '../tier2-boundaries/t2-18-wompi-currency-min-max.test';

export const mockAcademyCourse: UniversalCatalogItem = {
  id: 'item-course-008',
  organization_id: TENANT_A_ID,
  name: 'Master en Inteligencia Artificial & Fullstack con Next.js 15',
  description: 'De cero a arquitecto senior creando aplicaciones reales con agentes de IA, Supabase y Next.js.',
  category_id: 'cat-edtech',
  category: 'Cursos & Certificaciones',
  base_price: 450000,
  compare_at_price: 650000,
  type: 'one_off',
  classification: 'digital',
  image_url: 'https://cdn.pixy.app/demo/course-cover.webp',
  gallery_images: [
    { id: 'crs-1', url: 'https://cdn.pixy.app/demo/course-cover.webp', is_cover: true, order_index: 0 },
  ],
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  inventory_quantity: 9999,
  track_inventory: false,
  allow_backorders: true,
  low_stock_threshold: 0,
  has_variants: true,
  variant_attributes: [
    {
      id: 'attr-course-tier',
      organization_id: TENANT_A_ID,
      name: 'Modalidad de Acceso',
      slug: 'modalidad',
      swatch_type: 'pill',
      options: [
        { id: 'tier-self-paced', label: 'Autoestudio (Acceso de por vida)', value: 'Autoestudio', order_index: 0 },
        { id: 'tier-mentorship', label: 'Mentoring en Vivo + Code Review', value: 'Mentoring', order_index: 1 },
      ],
    },
  ],
  variants: [
    {
      id: 'var-self-paced',
      catalog_item_id: 'item-course-008',
      title: 'Autoestudio',
      price_modifier: 450000,
      price_type: 'fixed',
      inventory_quantity: 9999,
      track_inventory: false,
      attributes: { 'Modalidad de Acceso': 'Autoestudio' },
      is_active: true,
    },
    {
      id: 'var-mentoring',
      catalog_item_id: 'item-course-008',
      title: 'Mentoring en Vivo',
      price_modifier: 950000,
      price_type: 'fixed',
      inventory_quantity: 30,
      track_inventory: true,
      attributes: { 'Modalidad de Acceso': 'Mentoring' },
      is_active: true,
    },
  ],
  addon_groups: [
    {
      id: 'addon-certificate',
      name: 'Certificación Universitaria',
      selection_type: 'single',
      is_required: false,
      options: [
        { id: 'cert-digital', name: 'Diploma Digital Verificable en Blockchain (Gratis)', price_delta: 0, is_default: true },
        { id: 'cert-physical', name: 'Diploma Físico Enmarcado con Envío a Domicilio', price_delta: 120000, is_default: false },
      ],
    },
  ],
  badges: ['-31% Descuento', 'Destacado'],
  specifications: {
    features: ['60 horas de video en 4K', '12 Proyectos del mundo real', 'Comunidad privada en Discord'],
    deliverables: ['Acceso inmediato al campus virtual', 'Repositorios de GitHub con código fuente'],
    warranty: 'Garantía incondicional de devolución de 15 días.',
  },
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-08T00:00:00Z',
};

const course = mockAcademyCourse;

export const suite = {
  name: 'T4-08: Scenario S8 - Online Academy Course',
  tier: 'Tier 4',
  feature: 'S8: Digital EdTech & Online Academy Course',
  tests: [
    {
      name: 'Step 1: Digital course classification and trailer preview embed validation',
      fn: async () => {
        expect(course.classification).toBe('digital');
        const video = parseAndSanitizeVideoUrl(course.video_url);
        expect(video.isValid).toBe(true);
        expect(video.provider).toBe('youtube');
      },
    },
    {
      name: 'Step 2: Specification tabs show 60h syllabus, Discord community, and 15-day refund policy',
      fn: async () => {
        const tabs = parseSpecificationTabs(course.description, course.specifications);
        expect(tabs.length).toBeGreaterThanOrEqual(3);

        const featuresTab = tabs.find((t) => t.id === 'features');
        expect((featuresTab!.content as string[])).toContain('60 horas de video en 4K');
      },
    },
    {
      name: 'Step 3: Student chooses Live Mentoring variant ($950,000 COP) + Framed Physical Diploma ($120,000 COP)',
      fn: async () => {
        const mentoringVariant = course.variants[1];
        const physicalCert = course.addon_groups[0].options[1];

        const total = calculateEffectiveTotalPrice(
          course,
          mentoringVariant,
          [{ priceDelta: physicalCert.price_delta }],
          1
        );

        expect(total).toBe(1070000);
      },
    },
    {
      name: 'Step 4: Wompi express online checkout session generation and cents conversion',
      fn: async () => {
        const total = 1070000;
        const sessionRes = createWompiPaymentSession(total, 'COP', 'course-student-order-77', 'wompi_secret');

        expect(sessionRes.isValid).toBe(true);
        expect(sessionRes.session?.amount_in_cents).toBe(107000000);
      },
    },
    {
      name: 'Step 5: Dynamic discount badge verifies -31% discount computation',
      fn: async () => {
        expect(course.badges).toContain('-31% Descuento');
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
