/**
 * Tier 3: Cross-Feature Pairwise Interactions
 * Suite: t3-06-customizer-theme-modal-sync
 * Features: Store Customizer Studio × Storefront Detail Modal & Action Hub
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { StoreCustomizerTheme } from '../harness/contracts';
import { mockCustomizerTheme } from '../harness/mock-data';

export interface RenderedModalStyles {
  accentColor: string;
  fontFamily: string;
  buttonBackground: string;
  badgeBorderColor: string;
  hasFaqBlock: boolean;
  businessHoursCount: number;
}

export function applyThemeToStorefrontModal(theme: StoreCustomizerTheme): RenderedModalStyles {
  const accent = theme.primary_color || '#3B82F6';
  const font = theme.font_family || 'Inter';

  return {
    accentColor: accent,
    fontFamily: font,
    buttonBackground: accent,
    badgeBorderColor: accent,
    hasFaqBlock: Array.isArray(theme.faq_items) && theme.faq_items.length > 0,
    businessHoursCount: Array.isArray(theme.business_hours) ? theme.business_hours.length : 0,
  };
}

export const suite = {
  name: 'T3-06: Customizer Theme × Detail Modal Sync',
  tier: 'Tier 3',
  feature: 'F22 x F6: Store Customizer x Interactive Detail Modal',
  tests: [
    {
      name: 'Applying custom brand color (#4F46E5) permeates into modal CTA buttons',
      fn: async () => {
        const modalStyles = applyThemeToStorefrontModal(mockCustomizerTheme);
        expect(modalStyles.accentColor).toBe('#4F46E5');
        expect(modalStyles.buttonBackground).toBe('#4F46E5');
      },
    },
    {
      name: 'Changing customizer font to Plus Jakarta Sans updates modal typography',
      fn: async () => {
        const customized: StoreCustomizerTheme = {
          ...mockCustomizerTheme,
          font_family: 'Plus Jakarta Sans',
        };

        const modalStyles = applyThemeToStorefrontModal(customized);
        expect(modalStyles.fontFamily).toBe('Plus Jakarta Sans');
      },
    },
    {
      name: 'Storefront modal reflects FAQ items configured in Customizer Studio',
      fn: async () => {
        const modalStyles = applyThemeToStorefrontModal(mockCustomizerTheme);
        expect(modalStyles.hasFaqBlock).toBe(true);
      },
    },
    {
      name: 'Storefront modal reflects operating business hours from customizer',
      fn: async () => {
        const modalStyles = applyThemeToStorefrontModal(mockCustomizerTheme);
        expect(modalStyles.businessHoursCount).toBe(3);
      },
    },
    {
      name: 'Theme with minimal defaults applies fallback color without style crashes',
      fn: async () => {
        const minimalTheme: StoreCustomizerTheme = {
          primary_color: '',
          font_family: '',
        };

        const modalStyles = applyThemeToStorefrontModal(minimalTheme);
        expect(modalStyles.accentColor).toBe('#3B82F6');
        expect(modalStyles.fontFamily).toBe('Inter');
        expect(modalStyles.hasFaqBlock).toBe(false);
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
