/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-03-classification-nulls
 * Feature: F3 - Universal Item Classifications
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { CatalogClassification, UniversalCatalogItem } from '../harness/contracts';

export function normalizeItemClassification(item: Partial<UniversalCatalogItem>): {
  classification: CatalogClassification;
  isPurchasable: boolean;
  validationWarnings: string[];
} {
  const warnings: string[] = [];
  const validClassifications: CatalogClassification[] = ['physical', 'digital', 'service', 'subscription'];

  let classification: CatalogClassification = item.classification as CatalogClassification;
  if (!classification || !validClassifications.includes(classification)) {
    classification = item.type === 'recurring' ? 'subscription' : 'physical';
    warnings.push(`Invalid classification fallback to "${classification}"`);
  }

  let isPurchasable = item.is_active !== false;

  if (classification === 'physical') {
    const qty = item.inventory_quantity ?? 0;
    const track = item.track_inventory ?? false;
    const allowBackorders = item.allow_backorders ?? false;

    if (track && qty <= 0 && !allowBackorders) {
      isPurchasable = false;
      warnings.push('Physical item has 0 stock and backorders disabled');
    }
  } else if (classification === 'digital') {
    const downloadUrl = item.specifications?.download_url;
    if (!downloadUrl) {
      warnings.push('Digital item missing download/license fulfillment URL');
    }
  } else if (classification === 'subscription') {
    const validFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly'];
    if (!item.frequency || !validFrequencies.includes(item.frequency)) {
      warnings.push('Subscription frequency invalid or missing, defaulted to monthly');
    }
  } else if (classification === 'service') {
    const deliverables = item.specifications?.deliverables;
    if (!deliverables || deliverables.length === 0) {
      warnings.push('Service item has no deliverables defined');
    }
  }

  return {
    classification,
    isPurchasable,
    validationWarnings: warnings,
  };
}

export const suite = {
  name: 'T2-03: Classification Nulls & Boundary Fallbacks',
  tier: 'Tier 2',
  feature: 'F3: Universal Item Classifications',
  tests: [
    {
      name: 'Physical item with 0 stock and backorders disabled is not purchasable',
      fn: async () => {
        const item: Partial<UniversalCatalogItem> = {
          classification: 'physical',
          inventory_quantity: 0,
          track_inventory: true,
          allow_backorders: false,
          is_active: true,
        };

        const result = normalizeItemClassification(item);
        expect(result.classification).toBe('physical');
        expect(result.isPurchasable).toBe(false);
        expect(result.validationWarnings).toContain('Physical item has 0 stock and backorders disabled');
      },
    },
    {
      name: 'Digital item with empty download link emits warning but retains classification',
      fn: async () => {
        const item: Partial<UniversalCatalogItem> = {
          classification: 'digital',
          specifications: {},
          is_active: true,
        };

        const result = normalizeItemClassification(item);
        expect(result.classification).toBe('digital');
        expect(result.isPurchasable).toBe(true);
        expect(result.validationWarnings).toContain('Digital item missing download/license fulfillment URL');
      },
    },
    {
      name: 'Subscription with invalid interval frequency falls back with warning',
      fn: async () => {
        const item: Partial<UniversalCatalogItem> = {
          classification: 'subscription',
          frequency: 'bi-annually-invalid',
          is_active: true,
        };

        const result = normalizeItemClassification(item);
        expect(result.classification).toBe('subscription');
        expect(result.validationWarnings).toContain('Subscription frequency invalid or missing, defaulted to monthly');
      },
    },
    {
      name: 'Service with empty deliverables records warning while remaining purchasable',
      fn: async () => {
        const item: Partial<UniversalCatalogItem> = {
          classification: 'service',
          specifications: { deliverables: [] },
          is_active: true,
        };

        const result = normalizeItemClassification(item);
        expect(result.classification).toBe('service');
        expect(result.validationWarnings).toContain('Service item has no deliverables defined');
      },
    },
    {
      name: 'Null or invalid classification falls back to sensible default',
      fn: async () => {
        const item: Partial<UniversalCatalogItem> = {
          classification: undefined,
          type: 'recurring',
          is_active: true,
        };

        const result = normalizeItemClassification(item);
        expect(result.classification).toBe('subscription');
        expect(result.validationWarnings[0]).toContain('fallback to "subscription"');
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
