/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-11-spec-tabs-empty
 * Feature: F11 - Expandable Specification Tabs
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { sanitizeHtml } from '../harness/contracts';

export interface TabConfig {
  id: string;
  label: string;
  content: string | string[];
}

export function parseSpecificationTabs(
  description?: string,
  specs?: Record<string, any>
): TabConfig[] {
  const tabs: TabConfig[] = [];

  const cleanDescription = sanitizeHtml(description || 'Sin descripción disponible.');
  tabs.push({
    id: 'description',
    label: 'Descripción',
    content: cleanDescription,
  });

  if (!specs || typeof specs !== 'object') {
    return tabs;
  }

  if (Array.isArray(specs.features) && specs.features.length > 0) {
    const cleanFeatures = specs.features
      .map((f: string) => sanitizeHtml(String(f)).trim())
      .filter(Boolean);
    if (cleanFeatures.length > 0) {
      tabs.push({
        id: 'features',
        label: 'Características Clave',
        content: cleanFeatures,
      });
    }
  }

  if (Array.isArray(specs.deliverables) && specs.deliverables.length > 0) {
    const cleanDeliverables = specs.deliverables
      .map((d: string) => sanitizeHtml(String(d)).trim())
      .filter(Boolean);
    if (cleanDeliverables.length > 0) {
      tabs.push({
        id: 'deliverables',
        label: 'Entregables y SLA',
        content: cleanDeliverables,
      });
    }
  }

  if (specs.warranty && typeof specs.warranty === 'string') {
    const cleanWarranty = sanitizeHtml(specs.warranty).trim();
    if (cleanWarranty) {
      tabs.push({
        id: 'warranty',
        label: 'Garantía y Políticas',
        content: cleanWarranty,
      });
    }
  }

  return tabs;
}

export const suite = {
  name: 'T2-11: Specification Tabs Empty & XSS Boundaries',
  tier: 'Tier 2',
  feature: 'F11: Expandable Specification Tabs',
  tests: [
    {
      name: 'Empty specifications object returns Description tab as fallback',
      fn: async () => {
        const tabs = parseSpecificationTabs('Descripción básica del producto.', {});
        expect(tabs).toHaveLength(1);
        expect(tabs[0].id).toBe('description');
        expect(tabs[0].content).toBe('Descripción básica del producto.');
      },
    },
    {
      name: '10,000 character description string is sanitized and preserved without crashing',
      fn: async () => {
        const longText = 'A'.repeat(10000);
        const tabs = parseSpecificationTabs(longText, {});
        expect(tabs).toHaveLength(1);
        expect(typeof tabs[0].content).toBe('string');
        expect((tabs[0].content as string).length).toBe(10000);
      },
    },
    {
      name: 'XSS script tags and onerror vectors are completely stripped from specifications',
      fn: async () => {
        const maliciousSpecs = {
          features: [
            'Safe bullet point',
            '<script>alert("XSS Attack")</script>Enhanced Feature',
            '<img src=x onerror="stealTokens()">High Security',
          ],
          warranty: '<a href="javascript:void(0)" onclick="malicious()">Garantía 100%</a>',
        };

        const tabs = parseSpecificationTabs('Desc', maliciousSpecs);
        expect(tabs).toHaveLength(3);

        const featuresTab = tabs.find((t) => t.id === 'features');
        expect(featuresTab).toBeDefined();
        const featureItems = featuresTab!.content as string[];
        expect(featureItems[1]).toBe('Enhanced Feature');
        expect(featureItems[2]).toBe('High Security');

        const warrantyTab = tabs.find((t) => t.id === 'warranty');
        expect(warrantyTab!.content).toBe('Garantía 100%');
      },
    },
    {
      name: 'Unicode emojis and international characters in specs render faithfully',
      fn: async () => {
        const unicodeSpecs = {
          features: ['🔥 Ultra Rápido ⚡', '🌱 100% Orgánico & Sostenible 🍃', '日本語 & Español Support 🇨🇴'],
          warranty: '✨ Cobertura total de 1 año con cambio inmediato 🛡️',
        };

        const tabs = parseSpecificationTabs('Emoji description 🚀', unicodeSpecs);
        expect(tabs).toHaveLength(3);

        const featuresTab = tabs.find((t) => t.id === 'features');
        const items = featuresTab!.content as string[];
        expect(items[0]).toContain('🔥 Ultra Rápido ⚡');
        expect(items[1]).toContain('🌱 100% Orgánico');
        expect(items[2]).toContain('日本語');
      },
    },
    {
      name: 'Missing warranty key omits warranty tab cleanly without null tab error',
      fn: async () => {
        const specsWithoutWarranty = {
          features: ['Feature 1', 'Feature 2'],
        };

        const tabs = parseSpecificationTabs('Desc', specsWithoutWarranty);
        expect(tabs).toHaveLength(2);
        const warrantyTab = tabs.find((t) => t.id === 'warranty');
        expect(warrantyTab).toBeUndefined();
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
