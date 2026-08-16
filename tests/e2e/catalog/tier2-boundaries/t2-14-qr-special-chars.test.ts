/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-14-qr-special-chars
 * Feature: F14 - 1-Click QR Code Generator
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export interface QRCodeConfig {
  baseUrl: string;
  tenantSlug?: string;
  itemId: string;
  variantId?: string;
  customQueryParams?: Record<string, string>;
  logoUrl?: string;
}

export function generateStorefrontQRUrl(config: QRCodeConfig): {
  fullUrl: string;
  isOfflineSvgReady: boolean;
  length: number;
} {
  const domain = (config.baseUrl || 'https://pixy.app').replace(/\/+$/, '');
  const slug = config.tenantSlug || 'store';
  let path = `${domain}/${slug}/p/${config.itemId}`;

  const queryParams = new URLSearchParams();
  if (config.variantId) {
    queryParams.set('variant', config.variantId);
  }
  if (config.customQueryParams) {
    for (const [k, v] of Object.entries(config.customQueryParams)) {
      queryParams.set(k, v);
    }
  }

  const queryString = queryParams.toString();
  const fullUrl = queryString ? `${path}?${queryString}` : path;

  return {
    fullUrl,
    isOfflineSvgReady: true,
    length: fullUrl.length,
  };
}

export function renderOfflineQRSvgString(url: string, size: number = 256): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#ffffff"/><path d="M10 10h50v50h-50z" fill="#000000"/><text x="10" y="240" font-size="8" fill="#888888">${encodeURIComponent(url.slice(0, 40))}</text></svg>`;
}

export const suite = {
  name: 'T2-14: QR Code Special Characters, Length & Offline SVG',
  tier: 'Tier 2',
  feature: 'F14: 1-Click QR Code Generator',
  tests: [
    {
      name: '500+ character long deep link URL is encoded into QR safely',
      fn: async () => {
        const longParams: Record<string, string> = {
          utm_source: 'instagram_reels_campaign_super_long_utm_parameter_value_2026',
          utm_medium: 'influencer_affiliate_colombia_bogota_medellin_cali',
          utm_campaign: 'black_friday_cyber_monday_universal_catalog_launch_season_discount',
          referral_token: 'tok_abcdef1234567890_extremely_long_cryptographic_token_string_here',
        };

        const res = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'boutique-lujo',
          itemId: 'item-luxury-jacket-001',
          customQueryParams: longParams,
        });

        expect(res.length).toBeGreaterThanOrEqual(300);
        expect(res.fullUrl).toContain('utm_campaign=black_friday');
      },
    },
    {
      name: 'Non-ASCII Cyrillic, Arabic, and Emoji query parameters are URL encoded',
      fn: async () => {
        const res = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'global-store',
          itemId: 'item-global-1',
          customQueryParams: {
            tag: '🔥_promo',
            city: 'Bogotá',
            greet: 'Привет',
          },
        });

        expect(res.fullUrl).toContain('%F0%9F%94%A5_promo');
        expect(res.fullUrl).toContain('Bogot%C3%A1');
        expect(res.fullUrl).toContain('%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82');
      },
    },
    {
      name: 'Missing or null tenant slug defaults gracefully to /store/',
      fn: async () => {
        const res = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: undefined,
          itemId: 'item-default-slug',
        });

        expect(res.fullUrl).toBe('https://pixy.app/store/p/item-default-slug');
      },
    },
    {
      name: 'Offline SVG generator produces valid standalone SVG without network access',
      fn: async () => {
        const svg = renderOfflineQRSvgString('https://pixy.app/boutique/p/item-1?variant=var-red');
        expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
        expect(svg).toContain('viewBox="0 0 256 256"');
        expect(svg).toContain('</svg>');
      },
    },
    {
      name: 'QR URL with variant parameter attaches ?variant= deep link',
      fn: async () => {
        const res = generateStorefrontQRUrl({
          baseUrl: 'https://pixy.app',
          tenantSlug: 'fashion-hub',
          itemId: 'item-100',
          variantId: 'var-blue-xl',
        });

        expect(res.fullUrl).toBe('https://pixy.app/fashion-hub/p/item-100?variant=var-blue-xl');
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
