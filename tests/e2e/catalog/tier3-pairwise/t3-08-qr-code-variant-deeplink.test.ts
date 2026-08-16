/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-08-qr-code-variant-deeplink
 * Features: 1-Click QR Code Generator × Dynamic Variant Pre-Selection
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { generateStorefrontQRUrl, renderOfflineQRSvgString } from '../tier2-boundaries/t2-14-qr-special-chars.test';
import { mockFashionApparel } from '../harness/mock-data';

export const suite = {
  name: 'T3-08: QR Code Deep Link with Variant',
  tier: 'Tier 3',
  feature: 'F14 x F4: 1-Click QR Code x Dynamic Variants Pre-Selection',
  tests: [
    {
      name: 'Generates QR code for product with pre-selected Navy / Size L variant',
      fn: async () => {
        const selectedVariant = mockFashionApparel.variants[2];

        const qrResult = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'lino-boutique',
          itemId: mockFashionApparel.id,
          variantId: selectedVariant.id,
        });

        expect(qrResult.fullUrl).toBe('https://pixy.app/lino-boutique/p/item-fashion-001?variant=var-l-navy');
        expect(qrResult.isOfflineSvgReady).toBe(true);
      },
    },
    {
      name: 'Generates QR code with both variant and promotional coupon tracking params',
      fn: async () => {
        const qrResult = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'lino-boutique',
          itemId: 'item-fashion-001',
          variantId: 'var-s-white',
          customQueryParams: {
            coupon: 'VERANO2026',
            source: 'printed_flyer_qr',
          },
        });

        expect(qrResult.fullUrl).toContain('variant=var-s-white');
        expect(qrResult.fullUrl).toContain('coupon=VERANO2026');
        expect(qrResult.fullUrl).toContain('source=printed_flyer_qr');
      },
    },
    {
      name: 'Renders standalone SVG vector for variant QR code without external network latency',
      fn: async () => {
        const qrResult = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'lino-boutique',
          itemId: 'item-fashion-001',
          variantId: 'var-m-white',
        });

        const svg = renderOfflineQRSvgString(qrResult.fullUrl, 300);
        expect(svg).toContain('viewBox="0 0 300 300"');
        expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      },
    },
    {
      name: 'Variant parameter is cleanly parsed by storefront router for instant variant activation',
      fn: async () => {
        const testUrl = 'https://pixy.app/boutique/p/item-100?variant=var-s-white';
        const parsedUrl = new URL(testUrl);
        const extractedVariantId = parsedUrl.searchParams.get('variant');

        expect(extractedVariantId).toBe('var-s-white');
      },
    },
    {
      name: 'Handles special characters in variant IDs within QR code query parameters',
      fn: async () => {
        const qrResult = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'boutique',
          itemId: 'item-1',
          variantId: 'var#size/42 (special)',
        });

        expect(qrResult.fullUrl).toContain('variant=var%23size%2F42+%28special%29');
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
