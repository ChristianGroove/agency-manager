/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-16-whatsapp-encoding-limits
 * Feature: F16 - Intelligent WhatsApp Checkout
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { formatWhatsAppMessage, StorefrontActionPayload } from '../harness/contracts';

export const suite = {
  name: 'T2-16: WhatsApp Encoding Limits & Phone Normalization',
  tier: 'Tier 2',
  feature: 'F16: Intelligent WhatsApp Checkout',
  tests: [
    {
      name: '4000+ character long payload is compressed and truncated gracefully',
      fn: async () => {
        const longNotes = 'Nota especial del cliente: '.repeat(200);
        const payload: StorefrontActionPayload = {
          itemId: 'item-custom-01',
          calculatedTotalPrice: 350000,
          quantity: 1,
          customerInfo: {
            name: 'Carlos Ruiz',
            phone: '3001234567',
            email: 'carlos@example.com',
            notes: longNotes,
          },
          deepLinkUrl: 'https://pixy.app/store/p/item-custom-01',
        };

        const res = formatWhatsAppMessage(payload, '+57 300 123 4567');
        expect(res.rawText.length).toBeLessThanOrEqual(4000);
        expect(res.rawText).toContain('[Mensaje comprimido]');
        expect(res.encodedUri).toContain('https://wa.me/573001234567?text=');
      },
    },
    {
      name: 'International phone normalization handles formats with and without +57',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'item-phone-test',
          calculatedTotalPrice: 50000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/store/p/item-phone-test',
        };

        const res1 = formatWhatsAppMessage(payload, '+57 312 345 6789');
        expect(res1.phone).toBe('573123456789');

        const res2 = formatWhatsAppMessage(payload, '3123456789');
        expect(res2.phone).toBe('573123456789');

        const res3 = formatWhatsAppMessage(payload, '+1 (555) 234-5678');
        expect(res3.phone).toBe('15552345678');
      },
    },
    {
      name: 'Customer notes with line breaks, quotes and emojis are URL encoded properly',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'item-notes-test',
          calculatedTotalPrice: 120000,
          quantity: 2,
          customerInfo: {
            name: 'María "La Elegante" Peña',
            phone: '3009876543',
            email: 'maria@example.com',
            notes: 'Línea 1: Por favor empacar para regalo 🎁\nLínea 2: Entregar después de las 2:00 PM "Urgente"',
          },
          deepLinkUrl: 'https://pixy.app/store/p/item-notes-test',
        };

        const res = formatWhatsAppMessage(payload, '573009876543');
        expect(res.encodedUri).toContain('%22La%20Elegante%22');
        expect(res.encodedUri).toContain('%0A');
        expect(res.encodedUri).toContain('%F0%9F%8E%81');
      },
    },
    {
      name: 'Price formatting in COP renders with Colombian period separators',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'item-price-format',
          calculatedTotalPrice: 1850000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/store/p/item-price-format',
        };

        const res = formatWhatsAppMessage(payload, '+573001234567');
        expect(res.rawText).toContain('$1.850.000 COP');
      },
    },
    {
      name: 'Null or empty business phone falls back to system default phone',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'item-null-phone',
          calculatedTotalPrice: 45000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/store/p/item-null-phone',
        };

        const res = formatWhatsAppMessage(payload, '');
        expect(res.phone).toBe('573001234567');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier2');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
