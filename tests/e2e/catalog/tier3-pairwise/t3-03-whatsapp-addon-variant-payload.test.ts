/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-03-whatsapp-addon-variant-payload
 * Features: Variant Matrix × Add-ons Engine × WhatsApp Message Generator
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { formatWhatsAppMessage, StorefrontActionPayload } from '../harness/contracts';
import { mockFashionApparel } from '../harness/mock-data';

const selectedVariant = mockFashionApparel.variants[2];
const selectedAddon = {
  groupId: 'addon-grp-packaging',
  optionId: 'opt-pkg-luxury',
  name: 'Estuche de Madera de Lujo',
  priceDelta: 35000,
};

export const suite = {
  name: 'T3-03: WhatsApp × Variant × Addons Payload',
  tier: 'Tier 3',
  feature: 'F4 x F5 x F16: Variants x Addons x WhatsApp Checkout',
  tests: [
    {
      name: 'Formats multi-attribute variant (Size+Color) into formatted WhatsApp text',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: mockFashionApparel.name,
          variantId: selectedVariant.id,
          selectedVariant,
          selectedAddons: [selectedAddon],
          calculatedTotalPrice: (180000 + 15000 + 35000) * 2,
          quantity: 2,
          customerInfo: {
            name: 'Andrés Morales',
            phone: '3151234567',
            email: 'andres@example.com',
            notes: 'Entregar antes de las 5pm',
          },
          deepLinkUrl: 'https://pixy.app/boutique/p/item-fashion-001?variant=var-l-navy',
        };

        const res = formatWhatsAppMessage(payload, '+573151234567');
        expect(res.rawText).toContain('Camisa Lino Premium Orgánica');
        expect(res.rawText).toContain('Variante:* Talla L / Azul Marino (Talla: L, Color: Azul Marino)');
        expect(res.rawText).toContain('Estuche de Madera de Lujo (+$35.000)');
        expect(res.rawText).toContain('Cantidad:* 2');
        expect(res.rawText).toContain('Total:* $460.000 COP');
        expect(res.rawText).toContain('Cliente:* Andrés Morales');
        expect(res.rawText).toContain('https://pixy.app/boutique/p/item-fashion-001?variant=var-l-navy');
      },
    },
    {
      name: 'Encoded WhatsApp URI matches URI-escaped payload for direct chat launching',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'Producto Básico',
          calculatedTotalPrice: 50000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/store/p/basic',
        };

        const res = formatWhatsAppMessage(payload, '573001234567');
        expect(res.encodedUri.startsWith('https://wa.me/573001234567?text=')).toBe(true);
        expect(res.encodedUri).toContain(encodeURIComponent('Producto Básico'));
      },
    },
    {
      name: 'Product with 0 variants but 3 addons formats addons list correctly in message',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'Servicio de Consultoría',
          selectedAddons: [
            { groupId: 'g1', optionId: 'o1', name: 'Auditoría SEO', priceDelta: 200000 },
            { groupId: 'g2', optionId: 'o2', name: 'Optimización de Velocidad', priceDelta: 150000 },
            { groupId: 'g3', optionId: 'o3', name: 'Configuración Analytics', priceDelta: 100000 },
          ],
          calculatedTotalPrice: 1450000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/agency/p/seo',
        };

        const res = formatWhatsAppMessage(payload);
        expect(res.rawText).toContain('Auditoría SEO (+$200.000)');
        expect(res.rawText).toContain('Optimización de Velocidad (+$150.000)');
        expect(res.rawText).toContain('Configuración Analytics (+$100.000)');
      },
    },
    {
      name: 'Message text preserves line breaks and bold markers across mobile WhatsApp client',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'Test Item',
          calculatedTotalPrice: 10000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/test',
        };

        const res = formatWhatsAppMessage(payload);
        expect(res.rawText).toContain('\n');
        expect(res.rawText).toContain('*Item:*');
        expect(res.rawText).toContain('*Total:*');
      },
    },
    {
      name: 'Sanitizes international business phone number in WhatsApp target URL',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'Test Item',
          calculatedTotalPrice: 10000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/test',
        };

        const res = formatWhatsAppMessage(payload, '+57 (300) 555-9988');
        expect(res.phone).toBe('573005559988');
        expect(res.encodedUri).toContain('wa.me/573005559988');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier3');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
