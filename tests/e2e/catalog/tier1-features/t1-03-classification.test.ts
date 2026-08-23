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
      name: 'Validates Real Estate classification contract with property details, operation type, and Colombian metrics',
      fn: () => {
        const mockRealEstateTestItem = {
          id: 'item_re_test_01',
          organization_id: 'tenant-test-re',
          name: 'Apartamento de Lujo en El Poblado',
          description: 'Exclusivo apartamento de 145m2 con vista panorámica',
          base_price: 1250000000,
          type: 'real_estate' as const,
          classification: 'real_estate' as const,
          gallery_images: [
            { id: 're-img-1', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9', is_cover: true, order_index: 0 },
          ],
          inventory_quantity: 1,
          track_inventory: false,
          allow_backorders: false,
          low_stock_threshold: 1,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: ['Destacado', 'Novedad'],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2026-08-22T00:00:00Z',
          real_estate_details: {
            operation_type: 'sale',
            property_type: 'apartment',
            area_total_m2: 145,
            bedrooms: 3,
            bathrooms: 4,
            stratum: '6',
            city: 'Medellín',
            neighborhood: 'El Poblado',
          },
        };

        assertEqual(mockRealEstateTestItem.classification, 'real_estate');
        assertEqual(mockRealEstateTestItem.type, 'real_estate');
        assertEqual(mockRealEstateTestItem.real_estate_details.operation_type, 'sale');
        assertEqual(mockRealEstateTestItem.real_estate_details.area_total_m2, 145);

        const res = validateUniversalCatalogItem(mockRealEstateTestItem);
        assertTrue(res.isValid, `Real estate item failed validation: ${res.errors.join(', ')}`);
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
            err.includes('classification must be one of: physical, digital, service, subscription, real_estate')
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
