/**
 * Tier 1 Test Suite: F3 - Universal Item Classifications
 * Tests Physical SKU/barcode/stock, Digital download/license, Service hourly/deliverables, Subscription frequencies, classification schema validation.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
} from '../harness/assertions';
import {
  validateUniversalCatalogItem,
} from '../harness/contracts';
import {
  mockPhysicalItem,
  mockDigitalItem,
  mockServiceItem,
  mockSubscriptionItem,
} from '../harness/mock-data';

export const suite = {
  name: 'T1-03: Universal Item Classifications',
  tier: 'Tier 1',
  feature: 'F3: Universal Item Classifications',
  tests: [
    {
      name: 'Validates Physical classification contract with SKU, barcode, and inventory tracking',
      fn: () => {
        assertEqual(mockPhysicalItem.classification, 'physical');
        assertEqual(mockPhysicalItem.type, 'product');
        assertEqual(mockPhysicalItem.sku, 'TSHIRT-OVR-001');
        assertEqual(mockPhysicalItem.barcode, '7701234567890');
        assertTrue(mockPhysicalItem.track_inventory);
        assertEqual(mockPhysicalItem.inventory_quantity, 150);
        assertEqual(mockPhysicalItem.low_stock_threshold, 20);

        const res = validateUniversalCatalogItem(mockPhysicalItem);
        assertTrue(res.isValid, `Physical item failed validation: ${res.errors.join(', ')}`);
      },
    },
    {
      name: 'Validates Digital classification contract with instantaneous delivery and infinite license inventory',
      fn: () => {
        assertEqual(mockDigitalItem.classification, 'digital');
        assertEqual(mockDigitalItem.type, 'product');
        assertFalse(mockDigitalItem.track_inventory);
        assertTrue(mockDigitalItem.allow_backorders);
        assertDefined(mockDigitalItem.specifications.deliverables);
        assertTrue(mockDigitalItem.specifications.deliverables.some((d: string) => d.includes('Descarga instantánea')));

        const res = validateUniversalCatalogItem(mockDigitalItem);
        assertTrue(res.isValid, `Digital item failed validation: ${res.errors.join(', ')}`);
      },
    },
    {
      name: 'Validates Service classification contract with SLA deliverables and one-off engagement terms',
      fn: () => {
        assertEqual(mockServiceItem.classification, 'service');
        assertEqual(mockServiceItem.type, 'one_off');
        assertDefined(mockServiceItem.specifications.deliverables);
        assertDefined(mockServiceItem.specifications.sla);
        assertEqual(mockServiceItem.specifications.sla, 'Primera entrega de propuestas en 5 días hábiles');

        const res = validateUniversalCatalogItem(mockServiceItem);
        assertTrue(res.isValid, `Service item failed validation: ${res.errors.join(', ')}`);
      },
    },
    {
      name: 'Validates Subscription classification contract with recurring billing frequency and auto-renew terms',
      fn: () => {
        assertEqual(mockSubscriptionItem.classification, 'subscription');
        assertEqual(mockSubscriptionItem.type, 'recurring');
        assertEqual(mockSubscriptionItem.frequency, 'monthly');
        assertDefined(mockSubscriptionItem.specifications.terms);
        assertTrue(mockSubscriptionItem.specifications.terms.includes('Facturación recurrente'));

        const res = validateUniversalCatalogItem(mockSubscriptionItem);
        assertTrue(res.isValid, `Subscription item failed validation: ${res.errors.join(', ')}`);
      },
    },
    {
      name: 'Rejects invalid classification enum values and malformed schema structures',
      fn: () => {
        const invalidItem = {
          ...mockPhysicalItem,
          classification: 'invalid_classification_type' as any,
        };

        const res = validateUniversalCatalogItem(invalidItem);
        assertFalse(res.isValid);
        assertTrue(
          res.errors.some((err) =>
            err.includes('classification must be one of: physical, digital, service, subscription')
          )
        );
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
