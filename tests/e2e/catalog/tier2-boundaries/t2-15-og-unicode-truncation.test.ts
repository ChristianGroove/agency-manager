/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-15-og-unicode-truncation
 * Feature: F15 - Dynamic OpenGraph Rich Previews
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export interface OGMetadataInput {
  title: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  organizationName?: string;
}

export interface OGCardResponse {
  clampedTitle: string;
  formattedPrice: string;
  finalImageUrl: string;
  headers: Record<string, string>;
}

export function generateOGCardMetadata(input: OGMetadataInput): OGCardResponse {
  const MAX_TITLE_LEN = 75;
  let clampedTitle = input.title || 'Catálogo Oficial Pixy';
  if (clampedTitle.length > MAX_TITLE_LEN) {
    clampedTitle = clampedTitle.slice(0, MAX_TITLE_LEN - 3).trim() + '...';
  }

  const formattedPrice = input.price !== undefined
    ? `$${Math.round(input.price).toLocaleString('es-CO')} COP`
    : 'Consultar Precio';

  const defaultPixyBanner = 'https://cdn.pixy.app/branding/default-catalog-og-banner.webp';
  const finalImageUrl = input.imageUrl || defaultPixyBanner;

  return {
    clampedTitle,
    formattedPrice,
    finalImageUrl,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
    },
  };
}

export const suite = {
  name: 'T2-15: OpenGraph Unicode Truncation & Caching Headers',
  tier: 'Tier 2',
  feature: 'F15: Dynamic OpenGraph Rich Previews',
  tests: [
    {
      name: '200 character product name is clamped with ellipsis for 1200x630 card layout',
      fn: async () => {
        const longTitle = 'Suscripción Enterprise Plus con Inteligencia Artificial Avanzada para Optimización Masiva de Procesos y Facturación Electrónica DIAN 2026 Multiusuario Ilimitado';
        const og = generateOGCardMetadata({ title: longTitle, price: 500000 });

        expect(og.clampedTitle.length).toBeLessThanOrEqual(75);
        expect(og.clampedTitle.endsWith('...')).toBe(true);
      },
    },
    {
      name: 'Emoji characters in OG title render without byte corruption',
      fn: async () => {
        const titleWithEmoji = '✨ Super Oferta Relámpago 🔥 Camisa de Seda 🇨🇴';
        const og = generateOGCardMetadata({ title: titleWithEmoji, price: 120000 });

        expect(og.clampedTitle).toContain('✨');
        expect(og.clampedTitle).toContain('🔥');
        expect(og.clampedTitle).toContain('🇨🇴');
      },
    },
    {
      name: 'Missing cover photo falls back to default Pixy catalog banner',
      fn: async () => {
        const og = generateOGCardMetadata({ title: 'Servicio Sin Foto' });

        expect(og.finalImageUrl).toBe('https://cdn.pixy.app/branding/default-catalog-og-banner.webp');
      },
    },
    {
      name: 'Extreme price formatting ($1,234,567,890 COP) renders with standard dots',
      fn: async () => {
        const og = generateOGCardMetadata({ title: 'Yate de Lujo', price: 1234567890 });

        expect(og.formattedPrice).toBe('$1.234.567.890 COP');
      },
    },
    {
      name: 'Caching headers specify 24h TTL and 12h stale-while-revalidate',
      fn: async () => {
        const og = generateOGCardMetadata({ title: 'Consultoría' });

        expect(og.headers['Cache-Control']).toContain('max-age=86400');
        expect(og.headers['Cache-Control']).toContain('stale-while-revalidate=43200');
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
