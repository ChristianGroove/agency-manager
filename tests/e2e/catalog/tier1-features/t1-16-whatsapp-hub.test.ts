/**
 * Tier 1 Test Suite: F16 - Intelligent WhatsApp Checkout
 * Tests URI encoding of item name + variant + addons, phone number normalization, currency formatted price line, deep link catalog backlink, emoji structure.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
} from '../harness/assertions';
import {
  buildWhatsAppCheckoutUrl,
  validateStorefrontActionPayload,
} from '../harness/contracts';
import {
  mockPhysicalItem,
  mockStorefrontActionPayload,
} from '../harness/mock-data';

export const suite = {
  name: 'T1-16: Intelligent WhatsApp Checkout',
  tier: 'Tier 1',
  feature: 'F16: Intelligent WhatsApp Checkout',
  tests: [
    {
      name: 'URI encodes full checkout message including product name, variant title, and selected add-ons',
      fn: () => {
        const url = buildWhatsAppCheckoutUrl(
          mockStorefrontActionPayload,
          '+57 300 123 4567',
          mockPhysicalItem.name
        );

        assertTrue(url.startsWith('https://wa.me/573001234567?text='));

        // Decode query param to verify content
        const encodedText = url.split('?text=')[1];
        const decodedText = decodeURIComponent(encodedText);

        assertContains(decodedText, 'Camiseta Premium Oversize Minimalist');
        assertContains(decodedText, 'Negro Azabache / S');
        assertContains(decodedText, 'Caja Rígida de Lujo con Cinta');
        assertContains(decodedText, 'Iniciales en el pecho');
      },
    },
    {
      name: 'Normalizes international phone number into clean digits-only string without plus or spaces',
      fn: () => {
        const phoneFormats = [
          '+57 (300) 123-4567',
          '+57 300 123 4567',
          '573001234567',
          '+57-300-123-4567',
        ];

        for (const phone of phoneFormats) {
          const url = buildWhatsAppCheckoutUrl(
            mockStorefrontActionPayload,
            phone,
            mockPhysicalItem.name
          );
          assertTrue(url.startsWith('https://wa.me/573001234567?'));
        }
      },
    },
    {
      name: 'Formats calculated total price line with COP currency formatting',
      fn: () => {
        const url = buildWhatsAppCheckoutUrl(
          mockStorefrontActionPayload,
          '573001234567',
          mockPhysicalItem.name,
          '$'
        );
        const decoded = decodeURIComponent(url.split('?text=')[1]);

        assertContains(decoded, '💰 *Total estimado*: $112.000');
      },
    },
    {
      name: 'Includes backlink deep link URL in WhatsApp message payload for seller reference',
      fn: () => {
        const url = buildWhatsAppCheckoutUrl(
          mockStorefrontActionPayload,
          '573001234567',
          mockPhysicalItem.name
        );
        const decoded = decodeURIComponent(url.split('?text=')[1]);

        assertContains(decoded, '🔗 Ver en catálogo: https://app.pixy.com/portal/preview?item=item_phys_001');
      },
    },
    {
      name: 'Structures message with clean emojis and customer custom notes',
      fn: () => {
        const url = buildWhatsAppCheckoutUrl(
          mockStorefrontActionPayload,
          '573001234567',
          mockPhysicalItem.name
        );
        const decoded = decodeURIComponent(url.split('?text=')[1]);

        assertContains(decoded, '🛒');
        assertContains(decoded, '▫️');
        assertContains(decoded, '💰');
        assertContains(decoded, '🔗');
        assertContains(decoded, '📝 *Notas*: Por favor bordar las iniciales "CMG" con hilo plateado.');

        // Validate payload contract itself
        const payloadValidation = validateStorefrontActionPayload(mockStorefrontActionPayload);
        assertTrue(payloadValidation.isValid);
      },
    },
  ],
};

export async function run() {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of suite.tests) {
    try {
      await t.fn();
      passed++;
    } catch (err: any) {
      failed++;
      errors.push(`${t.name}: ${err.message}`);
    }
  }

  return { passed, failed, errors };
}
