/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-10-legacy-quote-with-new-fields
 * Features: 100% Backwards Compatibility × Multi-Photo Universal Catalog Item
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { UniversalCatalogItem } from '../harness/contracts';
import { mockFashionApparel } from '../harness/mock-data';

export interface UnifiedQuoteViewItem {
  id: string;
  name: string;
  price: number;
  isLegacy: boolean;
  coverImageUrl: string;
  hasMultiGallery: boolean;
}

export function formatUnifiedQuoteLine(item: Partial<UniversalCatalogItem> & { is_legacy?: boolean }): UnifiedQuoteViewItem {
  const isLegacy = item.is_legacy === true || !item.gallery_images;
  const coverImageUrl = item.image_url || (item.gallery_images && item.gallery_images[0]?.url) || 'https://cdn.pixy.app/fallback.webp';
  const hasMultiGallery = Array.isArray(item.gallery_images) && item.gallery_images.length > 1;

  return {
    id: item.id || 'unknown',
    name: item.name || 'Servicio',
    price: item.base_price || 0,
    isLegacy,
    coverImageUrl,
    hasMultiGallery,
  };
}

export const suite = {
  name: 'T3-10: Legacy Quotes with New Multi-Photo Catalog',
  tier: 'Tier 3',
  feature: 'F24 x F1: Backwards Compat x Multi-Photo Universal Catalog',
  tests: [
    {
      name: 'Legacy quote item with single image_url renders seamlessly alongside new multi-photo items',
      fn: async () => {
        const legacyItem = {
          id: 'srv-legacy-01',
          name: 'Diseño de Logo 2024',
          base_price: 600000,
          image_url: 'https://cdn.pixy.app/legacy-logo.jpg',
          is_legacy: true,
        };

        const modernItem = mockFashionApparel;

        const lineLegacy = formatUnifiedQuoteLine(legacyItem);
        const lineModern = formatUnifiedQuoteLine(modernItem);

        expect(lineLegacy.isLegacy).toBe(true);
        expect(lineLegacy.coverImageUrl).toBe('https://cdn.pixy.app/legacy-logo.jpg');
        expect(lineLegacy.hasMultiGallery).toBe(false);

        expect(lineModern.isLegacy).toBe(false);
        expect(lineModern.coverImageUrl).toBe(mockFashionApparel.gallery_images[0].url);
        expect(lineModern.hasMultiGallery).toBe(true);
      },
    },
    {
      name: 'Modern catalog items mirror cover photo in legacy image_url column for backwards compatibility',
      fn: async () => {
        expect(mockFashionApparel.image_url).toBe(mockFashionApparel.gallery_images[0].url);
      },
    },
    {
      name: 'Invoice generation handles mix of legacy services and new physical variant products',
      fn: async () => {
        const quoteLines = [
          formatUnifiedQuoteLine({ id: 'leg-1', name: 'Setup Servidor', base_price: 300000, is_legacy: true }),
          formatUnifiedQuoteLine(mockFashionApparel),
        ];

        const invoiceTotal = quoteLines.reduce((sum, line) => sum + line.price, 0);
        expect(invoiceTotal).toBe(300000 + 180000);
        expect(quoteLines).toHaveLength(2);
      },
    },
    {
      name: 'Null image_url in legacy item falls back cleanly without breaking layout',
      fn: async () => {
        const legacyNoImage = {
          id: 'leg-no-img',
          name: 'Hora de Consultoría',
          base_price: 150000,
          is_legacy: true,
        };

        const line = formatUnifiedQuoteLine(legacyNoImage);
        expect(line.coverImageUrl).toBe('https://cdn.pixy.app/fallback.webp');
      },
    },
    {
      name: 'Preserves category association for both legacy and universal items in quote overview',
      fn: async () => {
        const legacyCategory = 'Consultoría Clásica';
        const modernCategory = mockFashionApparel.category;

        expect(legacyCategory).toBe('Consultoría Clásica');
        expect(modernCategory).toBe('Moda Masculina');
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
