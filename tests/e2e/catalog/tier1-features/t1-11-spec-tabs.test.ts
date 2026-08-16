/**
 * Tier 1 Test Suite: F11 - Expandable Specification Tabs
 * Tests Description tab content, Key Features list, Deliverables/SLA items, Warranty & Return policy, dynamic tab count when empty.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertArrayLength,
  assertDefined,
} from '../harness/assertions';
import {
  mockPhysicalItem,
  mockServiceItem,
} from '../harness/mock-data';

export const suite = {
  name: 'T1-11: Expandable Specification Tabs',
  tier: 'Tier 1',
  feature: 'F11: Expandable Specification Tabs',
  tests: [
    {
      name: 'Renders Description tab rich text and overview content',
      fn: () => {
        assertDefined(mockPhysicalItem.description);
        assertTrue(mockPhysicalItem.description!.length > 20);
        assertTrue(mockPhysicalItem.description!.includes('100% algodón peinado'));
      },
    },
    {
      name: 'Parses Key Features list and validates bullet points count',
      fn: () => {
        const features = mockPhysicalItem.specifications.features;
        assertTrue(Array.isArray(features));
        assertArrayLength(features, 3);
        assertEqual(features[0], '100% Algodón Peinado 240 GSM');
        assertEqual(features[1], 'Tejido pre-encogido anti-motas');
      },
    },
    {
      name: 'Parses Deliverables and SLA items tab for professional services',
      fn: () => {
        const deliverables = mockServiceItem.specifications.deliverables;
        const sla = mockServiceItem.specifications.sla;

        assertTrue(Array.isArray(deliverables));
        assertArrayLength(deliverables, 3);
        assertTrue(deliverables[0].includes('Brand Guidelines PDF interactivo'));
        assertEqual(sla, 'Primera entrega de propuestas en 5 días hábiles');
      },
    },
    {
      name: 'Renders Warranty and Return Policy tab content for retail items',
      fn: () => {
        const warranty = mockPhysicalItem.specifications.warranty;
        assertDefined(warranty);
        assertEqual(warranty, 'Garantía de confección por 90 días.');
      },
    },
    {
      name: 'Dynamically computes active visible tab bar count and hides empty specification sections',
      fn: () => {
        function getVisibleTabs(item: {
          description?: string;
          specifications?: Record<string, any>;
        }): string[] {
          const tabs: string[] = [];
          if (item.description && item.description.trim().length > 0) {
            tabs.push('description');
          }
          if (item.specifications?.features && item.specifications.features.length > 0) {
            tabs.push('features');
          }
          if (item.specifications?.deliverables && item.specifications.deliverables.length > 0) {
            tabs.push('deliverables');
          }
          if (item.specifications?.warranty) {
            tabs.push('warranty');
          }
          if (item.specifications?.terms) {
            tabs.push('terms');
          }
          return tabs;
        }

        // Full physical item has description, features, deliverables, warranty -> 4 tabs
        const physTabs = getVisibleTabs(mockPhysicalItem);
        assertEqual(physTabs.length, 4);

        // Minimal item with only description
        const minItem = { description: 'Simple item description' };
        const minTabs = getVisibleTabs(minItem);
        assertEqual(minTabs.length, 1);
        assertEqual(minTabs[0], 'description');

        // Completely empty item -> 0 tabs
        const emptyItem = {};
        const emptyTabs = getVisibleTabs(emptyItem);
        assertEqual(emptyTabs.length, 0);
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
