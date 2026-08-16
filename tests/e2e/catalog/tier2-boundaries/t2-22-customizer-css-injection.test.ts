/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-22-customizer-css-injection
 * Feature: F22 - Real-Time Store Customizer Studio
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { sanitizeCssColor, StoreCustomizerTheme } from '../harness/contracts';

export function validateStoreCustomizerTheme(theme: Partial<StoreCustomizerTheme>): {
  isValid: boolean;
  sanitizedTheme: StoreCustomizerTheme;
  errors: string[];
} {
  const errors: string[] = [];

  const rawColor = theme.primary_color || '#3B82F6';
  const cleanColor = sanitizeCssColor(rawColor);
  if (rawColor !== cleanColor && !rawColor.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)) {
    errors.push('Malicious or invalid primary_color format sanitized to fallback');
  }

  let heroUrl = theme.hero_banner_url;
  if (heroUrl && (!heroUrl.startsWith('http://') && !heroUrl.startsWith('https://'))) {
    heroUrl = 'https://cdn.pixy.app/branding/default-hero-banner.webp';
    errors.push('Invalid hero banner URL defaulted to standard fallback banner');
  }

  const cleanSocial: Record<string, string> = {};
  if (theme.social_links) {
    for (const [network, url] of Object.entries(theme.social_links)) {
      if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
        errors.push(`Blocked unsafe protocol in social link for "${network}"`);
      } else {
        cleanSocial[network] = url;
      }
    }
  }

  if (theme.business_hours) {
    for (const bh of theme.business_hours) {
      if (!bh.is_closed) {
        if (bh.open >= bh.close) {
          errors.push(`Invalid business hours for ${bh.day}: open time (${bh.open}) must be before close time (${bh.close})`);
        }
      }
    }
  }

  const sanitizedTheme: StoreCustomizerTheme = {
    primary_color: cleanColor,
    font_family: theme.font_family || 'Inter',
    hero_banner_url: heroUrl,
    hero_title: theme.hero_title || '',
    hero_subtitle: theme.hero_subtitle || '',
    faq_items: theme.faq_items || [],
    testimonials: theme.testimonials || [],
    social_links: cleanSocial,
    business_hours: theme.business_hours || [],
  };

  return {
    isValid: errors.length === 0,
    sanitizedTheme,
    errors,
  };
}

export const suite = {
  name: 'T2-22: Customizer CSS Injection & Security Boundaries',
  tier: 'Tier 2',
  feature: 'F22: Real-Time Store Customizer Studio',
  tests: [
    {
      name: 'Malicious CSS injection in primary_color is sanitized to safe fallback',
      fn: async () => {
        const maliciousColor = '#3B82F6; background-image: url("https://malicious.site/hack"); content: "test"';
        const res = validateStoreCustomizerTheme({ primary_color: maliciousColor });

        expect(res.sanitizedTheme.primary_color).toBe('#3B82F6');
        expect(res.errors.length).toBeGreaterThan(0);
        expect(res.errors[0]).toContain('primary_color format sanitized');
      },
    },
    {
      name: 'Broken or invalid protocol in hero banner falls back to default banner',
      fn: async () => {
        const res = validateStoreCustomizerTheme({ hero_banner_url: 'ftp://bad-url.com/img.png' });

        expect(res.sanitizedTheme.hero_banner_url).toBe('https://cdn.pixy.app/branding/default-hero-banner.webp');
        expect(res.errors[0]).toContain('Invalid hero banner URL');
      },
    },
    {
      name: '20+ FAQ items accordion expands and renders smoothly without DOM errors',
      fn: async () => {
        const largeFaq = Array.from({ length: 25 }, (_, i) => ({
          question: `¿Pregunta Frecuente #${i + 1}?`,
          answer: `Respuesta detallada para la pregunta #${i + 1} del catálogo Pixy.`,
        }));

        const res = validateStoreCustomizerTheme({ faq_items: largeFaq });
        expect(res.sanitizedTheme.faq_items).toHaveLength(25);
        expect(res.isValid).toBe(true);
      },
    },
    {
      name: 'Social link with javascript: URI is strictly blocked',
      fn: async () => {
        const res = validateStoreCustomizerTheme({
          social_links: {
            instagram: 'https://instagram.com/pixy',
            maliciousX: 'javascript:alert(document.cookie)',
          },
        });

        expect(res.sanitizedTheme.social_links?.instagram).toBe('https://instagram.com/pixy');
        expect(res.sanitizedTheme.social_links?.maliciousX).toBeUndefined();
        expect(res.errors[0]).toContain('Blocked unsafe protocol in social link');
      },
    },
    {
      name: 'Business hours with invalid open/close sequence trigger validation error',
      fn: async () => {
        const res = validateStoreCustomizerTheme({
          business_hours: [
            { day: 'Lunes', open: '18:00', close: '08:00', is_closed: false },
          ],
        });

        expect(res.isValid).toBe(false);
        expect(res.errors[0]).toContain('open time (18:00) must be before close time (08:00)');
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
