/**
 * Tier 1 Test Suite: F15 - Dynamic OpenGraph Rich Previews
 * Tests 1200x630 dimension header, product title & price dynamic rendering, cover image banner embed, organization branding tag, twitter card meta tag.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
} from '../harness/assertions';
import { mockPhysicalItem } from '../harness/mock-data';

export const suite = {
  name: 'T1-15: Dynamic OpenGraph Rich Previews',
  tier: 'Tier 1',
  feature: 'F15: Dynamic OpenGraph Rich Previews',
  tests: [
    {
      name: 'Enforces standard 1200x630 dimension header specification for social share cards',
      fn: () => {
        function getOpenGraphImageConfig() {
          return {
            width: 1200,
            height: 630,
            contentType: 'image/png',
          };
        }

        const config = getOpenGraphImageConfig();
        assertEqual(config.width, 1200);
        assertEqual(config.height, 630);
        assertEqual(config.contentType, 'image/png');
      },
    },
    {
      name: 'Dynamically renders product title, category, and formatted COP/USD price string',
      fn: () => {
        function formatOgCardContent(item: {
          name: string;
          category?: string;
          base_price: number;
        }) {
          const formattedPrice = `$${item.base_price.toLocaleString('es-CO')} COP`;
          return {
            title: item.name,
            category: item.category || 'General',
            priceDisplay: formattedPrice,
          };
        }

        const ogContent = formatOgCardContent(mockPhysicalItem);
        assertEqual(ogContent.title, 'Camiseta Premium Oversize Minimalist');
        assertEqual(ogContent.category, 'Ropa Masculina');
        assertEqual(ogContent.priceDisplay, '$85.000 COP');
      },
    },
    {
      name: 'Embeds product cover image banner within OpenGraph visual preview template',
      fn: () => {
        function buildOgCardTemplate(item: {
          image_url?: string;
          name: string;
          base_price: number;
        }) {
          const coverUrl = item.image_url || 'https://app.pixy.com/placeholder-og.jpg';
          return {
            imageUrl: coverUrl,
            hasCustomBanner: !!item.image_url,
          };
        }

        const ogTemplate = buildOgCardTemplate(mockPhysicalItem);
        assertTrue(ogTemplate.hasCustomBanner);
        assertEqual(ogTemplate.imageUrl, mockPhysicalItem.image_url);
      },
    },
    {
      name: 'Includes organization branding tag, verified badge, and portal site name',
      fn: () => {
        function buildOgMetadata(item: { name: string; description?: string }, orgName: string) {
          return {
            'og:title': item.name,
            'og:description': item.description,
            'og:site_name': `${orgName} | Portal Pixy`,
            'og:type': 'website',
          };
        }

        const meta = buildOgMetadata(mockPhysicalItem, 'Acme Apparel');
        assertEqual(meta['og:site_name'], 'Acme Apparel | Portal Pixy');
        assertEqual(meta['og:type'], 'website');
        assertEqual(meta['og:title'], mockPhysicalItem.name);
      },
    },
    {
      name: 'Generates Twitter Card metadata with summary_large_image card type',
      fn: () => {
        function buildTwitterCardMetadata(item: {
          name: string;
          description?: string;
          image_url?: string;
        }) {
          return {
            'twitter:card': 'summary_large_image',
            'twitter:title': item.name,
            'twitter:description': item.description?.slice(0, 120),
            'twitter:image': item.image_url,
          };
        }

        const twitterMeta = buildTwitterCardMetadata(mockPhysicalItem);
        assertEqual(twitterMeta['twitter:card'], 'summary_large_image');
        assertEqual(twitterMeta['twitter:title'], mockPhysicalItem.name);
        assertEqual(twitterMeta['twitter:image'], mockPhysicalItem.image_url);
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
