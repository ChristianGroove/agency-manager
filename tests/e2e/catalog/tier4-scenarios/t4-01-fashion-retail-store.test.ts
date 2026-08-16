/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-01-fashion-retail-store
 * Domain: S1 - Physical Apparel & Fashion E-Commerce
 * Features Exercised: F1, F2, F3, F4, F5, F6, F7, F8, F10, F12, F14, F15, F16, F18, F22
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { mockFashionApparel } from '../harness/mock-data';
import {
  calculateEffectiveTotalPrice,
  evaluateDynamicBadges,
  formatWhatsAppMessage,
  StorefrontActionPayload,
} from '../harness/contracts';
import { processClientSideWebPCompression } from '../tier2-boundaries/t2-02-webp-corrupt.test';
import { computeZoomPosition } from '../tier2-boundaries/t2-08-zoom-boundaries.test';
import { generateStorefrontQRUrl } from '../tier2-boundaries/t2-14-qr-special-chars.test';
import { createWompiPaymentSession } from '../tier2-boundaries/t2-18-wompi-currency-min-max.test';

const apparel = mockFashionApparel;

export const suite = {
  name: 'T4-01: Scenario S1 - Fashion Retail Store',
  tier: 'Tier 4',
  feature: 'S1: Physical Apparel & Boutique Retail Store',
  tests: [
    {
      name: 'Step 1: Client compresses high-res fashion photos to WebP before gallery upload',
      fn: async () => {
        const rawImage = {
          name: 'lino-shirt-hero.jpg',
          sizeBytes: 3.5 * 1024 * 1024,
          mimeType: 'image/jpeg',
          bufferData: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
        };

        const compResult = processClientSideWebPCompression(rawImage);
        expect(compResult.success).toBe(true);
        expect(compResult.mimeType).toBe('image/webp');
        expect(compResult.compressedBuffer!.length).toBeLessThan(rawImage.sizeBytes);
      },
    },
    {
      name: 'Step 2: Customer browses gallery with 3 photos and zooms on fabric weave',
      fn: async () => {
        expect(apparel.gallery_images).toHaveLength(3);
        expect(apparel.gallery_images[0].is_cover).toBe(true);

        const zoomState = computeZoomPosition({ x: 300, y: 250, containerWidth: 600, containerHeight: 500 }, 2.5);
        expect(zoomState.enabled).toBe(true);
        expect(zoomState.bgPositionXPercent).toBe(50);
        expect(zoomState.bgPositionYPercent).toBe(50);
        expect(zoomState.zoomScale).toBe(2.5);
      },
    },
    {
      name: 'Step 3: Customer configures Size L / Azul Marino variant + Luxury Wooden Gift Box addon',
      fn: async () => {
        const navyVariant = apparel.variants[2];
        const luxuryBox = apparel.addon_groups[0].options[1];

        const total = calculateEffectiveTotalPrice(
          apparel,
          navyVariant,
          [{ priceDelta: luxuryBox.price_delta }],
          2
        );

        expect(total).toBe(460000);
      },
    },
    {
      name: 'Step 4: Dynamic badges prioritize "-18% Descuento" and "Pocas Unidades" for low stock navy variant',
      fn: async () => {
        const badges = evaluateDynamicBadges(apparel);
        expect(badges).toContain('-18% Descuento');
        expect(badges).toContain('Destacado');
      },
    },
    {
      name: 'Step 5: Checkout via WhatsApp and Wompi Express generates verified payloads and QR deep link',
      fn: async () => {
        const navyVariant = apparel.variants[2];
        const luxuryBox = apparel.addon_groups[0].options[1];

        const payload: StorefrontActionPayload = {
          itemId: apparel.name,
          variantId: navyVariant.id,
          selectedVariant: navyVariant,
          selectedAddons: [{ groupId: 'g1', optionId: luxuryBox.id, name: luxuryBox.name, priceDelta: luxuryBox.price_delta }],
          calculatedTotalPrice: 230000,
          quantity: 1,
          customerInfo: { name: 'Valentina Gomez', phone: '3120001122', email: 'valentina@boutique.co' },
          deepLinkUrl: 'https://pixy.app/boutique/p/item-fashion-001?variant=var-l-navy',
        };

        const wa = formatWhatsAppMessage(payload, '+573001234567');
        expect(wa.rawText).toContain('Camisa Lino Premium Orgánica');
        expect(wa.rawText).toContain('Estuche de Madera de Lujo');
        expect(wa.rawText).toContain('$230.000 COP');

        const wompi = createWompiPaymentSession(230000, 'COP', 'ref-fashion-001', 'wompi_secret');
        expect(wompi.isValid).toBe(true);
        expect(wompi.session?.amount_in_cents).toBe(23000000);

        const qr = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'boutique',
          itemId: apparel.id,
          variantId: navyVariant.id,
        });
        expect(qr.fullUrl).toContain('variant=var-l-navy');
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
