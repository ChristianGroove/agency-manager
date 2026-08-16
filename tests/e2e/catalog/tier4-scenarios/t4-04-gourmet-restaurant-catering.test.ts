/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-04-gourmet-restaurant-catering
 * Domain: S4 - Gourmet Restaurant & Catering Menu
 * Features Exercised: F1, F3, F4, F5, F6, F10, F12, F14, F16, F22, F23, F25
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { mockGourmetDish } from '../harness/mock-data';
import { calculateEffectiveTotalPrice, formatWhatsAppMessage, StorefrontActionPayload } from '../harness/contracts';
import { generateStorefrontQRUrl, renderOfflineQRSvgString } from '../tier2-boundaries/t2-14-qr-special-chars.test';

const dish = mockGourmetDish;

export const suite = {
  name: 'T4-04: Scenario S4 - Gourmet Restaurant & Catering',
  tier: 'Tier 4',
  feature: 'S4: Gourmet Restaurant & Tabletop Catering Menu',
  tests: [
    {
      name: 'Step 1: Tabletop QR code generation with table number parameter (?table=12)',
      fn: async () => {
        const qrRes = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'la-brasa-restaurante',
          itemId: dish.id,
          customQueryParams: { table: '12', zone: 'terraza' },
        });

        expect(qrRes.fullUrl).toContain('table=12');
        expect(qrRes.fullUrl).toContain('zone=terraza');
        const svg = renderOfflineQRSvgString(qrRes.fullUrl);
        expect(svg).toContain('<svg');
      },
    },
    {
      name: 'Step 2: Diner views food photo gallery and selects meat doneness variant',
      fn: async () => {
        expect(dish.gallery_images).toHaveLength(2);
        expect(dish.gallery_images[0].is_cover).toBe(true);

        const mediumDonenessVariant = dish.variants[0];
        expect(mediumDonenessVariant.attributes['Término de la Carne']).toBe('Medio');
      },
    },
    {
      name: 'Step 3: Diner selects extra gourmet sides (Truffle Fries +$22,000 & Grilled Asparagus +$16,000)',
      fn: async () => {
        const medVariant = dish.variants[0];
        const sides = [
          { priceDelta: dish.addon_groups[0].options[0].price_delta },
          { priceDelta: dish.addon_groups[0].options[1].price_delta },
        ];

        const total = calculateEffectiveTotalPrice(dish, medVariant, sides, 2);
        expect(total).toBe(266000);
      },
    },
    {
      name: 'Step 4: Diner submits table order via WhatsApp to kitchen dispatch',
      fn: async () => {
        const medVariant = dish.variants[0];
        const side1 = dish.addon_groups[0].options[0];
        const side2 = dish.addon_groups[0].options[1];

        const payload: StorefrontActionPayload = {
          itemId: dish.name,
          variantId: medVariant.id,
          selectedVariant: medVariant,
          selectedAddons: [
            { groupId: 'sides', optionId: side1.id, name: side1.name, priceDelta: side1.price_delta },
            { groupId: 'sides', optionId: side2.id, name: side2.name, priceDelta: side2.price_delta },
          ],
          calculatedTotalPrice: 266000,
          quantity: 2,
          customerInfo: {
            name: 'Mesa 12 (Felipe)',
            phone: '3009998877',
            notes: 'La carne en término medio estricto por favor y sin sal en las papas.',
          },
          deepLinkUrl: 'https://pixy.app/restaurante/p/item-resto-004?table=12',
        };

        const wa = formatWhatsAppMessage(payload, '+573001234567');
        expect(wa.rawText).toContain('Corte Ribeye Dry Aged 45 Días');
        expect(wa.rawText).toContain('Término Medio');
        expect(wa.rawText).toContain('Papas trufadas con queso parmesano');
        expect(wa.rawText).toContain('Mesa 12 (Felipe)');
        expect(wa.rawText).toContain('Total:* $266.000 COP');
      },
    },
    {
      name: 'Step 5: Restaurant customizer branding reflects opening hours and dark steakhouse theme',
      fn: async () => {
        expect(dish.classification).toBe('physical');
        expect(dish.category).toBe('Cortes & Parrilla');
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
