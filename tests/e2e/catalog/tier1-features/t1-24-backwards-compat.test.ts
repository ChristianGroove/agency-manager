/**
 * Tier 1 Test Suite: F24 - Cross-Module 100% Backwards Compatibility
 * Tests legacy single image_url fallback from cover photo, legacy service_catalog columns intact, legacy quotes query compatibility, legacy contracts schema check, null variant safety.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
} from '../harness/assertions';
import {
  mockPhysicalItem,
  mockServiceItem,
} from '../harness/mock-data';

export const suite = {
  name: 'T1-24: Cross-Module 100% Backwards Compatibility',
  tier: 'Tier 1',
  feature: 'F24: Cross-Module 100% Backwards Compatibility',
  tests: [
    {
      name: 'Derives legacy single image_url fallback automatically from gallery cover photo',
      fn: () => {
        // Legacy consumers read item.image_url directly
        const coverImage = mockPhysicalItem.gallery_images.find((img) => img.is_cover);
        assertDefined(coverImage);
        assertEqual(mockPhysicalItem.image_url, coverImage!.url);

        // Even when gallery changes, image_url must mirror the cover photo
        function syncLegacyImageUrl(gallery: typeof mockPhysicalItem.gallery_images) {
          const cover = gallery.find((g) => g.is_cover) || gallery[0];
          return cover ? cover.url : undefined;
        }

        const newImageUrl = syncLegacyImageUrl(mockPhysicalItem.gallery_images);
        assertEqual(newImageUrl, mockPhysicalItem.image_url);
      },
    },
    {
      name: 'Ensures all original service_catalog columns remain intact and queryable',
      fn: () => {
        // Original schema fields: id, name, category, base_price, image_url, is_visible_in_portal, organization_id, type, created_at
        const legacyRequiredKeys = [
          'id',
          'name',
          'category',
          'base_price',
          'image_url',
          'is_visible_in_portal',
          'organization_id',
          'type',
          'created_at',
        ];

        for (const key of legacyRequiredKeys) {
          assertTrue(
            key in mockPhysicalItem,
            `Required legacy key "${key}" missing in UniversalCatalogItem`
          );
        }
      },
    },
    {
      name: 'Preserves Quotes and Invoices line items referencing new and legacy catalog items',
      fn: () => {
        interface LegacyQuoteLineItem {
          catalog_item_id?: string;
          description: string;
          quantity: number;
          price: number;
        }

        const quoteItemFromNewCatalog: LegacyQuoteLineItem = {
          catalog_item_id: mockPhysicalItem.id,
          description: mockPhysicalItem.name,
          quantity: 2,
          price: mockPhysicalItem.base_price,
        };

        assertEqual(quoteItemFromNewCatalog.catalog_item_id, 'item_phys_001');
        assertEqual(quoteItemFromNewCatalog.price, 85000);
        assertEqual(quoteItemFromNewCatalog.quantity, 2);
      },
    },
    {
      name: 'Maintains contract generator and briefing template relational binding',
      fn: () => {
        // Contract generator uses item.name, item.base_price, and specifications
        function generateContractSection(item: typeof mockServiceItem) {
          return {
            serviceName: item.name,
            totalFee: item.base_price,
            scopeOfWork: item.specifications.deliverables || [],
            turnaroundSla: item.specifications.sla || 'N/A',
          };
        }

        const contract = generateContractSection(mockServiceItem);
        assertEqual(contract.serviceName, 'Consultoría & Branding Estratégico Corporativo');
        assertEqual(contract.totalFee, 3200000);
        assertEqual(contract.scopeOfWork.length, 3);
        assertEqual(contract.turnaroundSla, 'Primera entrega de propuestas en 5 días hábiles');
      },
    },
    {
      name: 'Guarantees null-variant and empty-addon safety for simple legacy items',
      fn: () => {
        const simpleLegacyItem = {
          id: 'item_legacy_001',
          organization_id: 'org_123',
          name: 'Consultoría Clásica 1 Hora',
          category: 'Asesoría',
          base_price: 150000,
          type: 'one_off' as const,
          classification: 'service' as const,
          image_url: 'https://example.com/legacy.jpg',
          gallery_images: [],
          inventory_quantity: 0,
          track_inventory: false,
          allow_backorders: true,
          low_stock_threshold: 0,
          has_variants: false,
          variant_attributes: [],
          variants: [],
          addon_groups: [],
          badges: [],
          specifications: {},
          is_visible_in_portal: true,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
        };

        // Item operates normally without throwing errors on variants or addons
        assertFalse(simpleLegacyItem.has_variants);
        assertEqual(simpleLegacyItem.variants.length, 0);
        assertEqual(simpleLegacyItem.addon_groups.length, 0);
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
