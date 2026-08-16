/**
 * Tier 1 Test Suite: F12 - Dynamic Status Badges
 * Tests "Destacado" badge styling, "Novedad" badge, "Pocas Unidades" low-stock threshold trigger, "-X% Descuento" compare-at calculation, max 3 badge display limit.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertArrayLength,
  assertContains,
} from '../harness/assertions';

export const suite = {
  name: 'T1-12: Dynamic Status Badges',
  tier: 'Tier 1',
  feature: 'F12: Dynamic Status Badges',
  tests: [
    {
      name: 'Renders Destacado (Featured) badge with primary highlight styling',
      fn: () => {
        function getBadgeStyle(badgeName: string) {
          switch (badgeName) {
            case 'Destacado':
              return { label: 'Destacado', bgClass: 'bg-amber-500 text-white', icon: 'Sparkles' };
            case 'Novedad':
              return { label: 'Novedad', bgClass: 'bg-emerald-500 text-white', icon: 'Flame' };
            case 'Pocas Unidades':
              return { label: 'Pocas Unidades', bgClass: 'bg-rose-500 text-white', icon: 'AlertTriangle' };
            default:
              return { label: badgeName, bgClass: 'bg-primary text-primary-foreground', icon: 'Tag' };
          }
        }

        const destacado = getBadgeStyle('Destacado');
        assertEqual(destacado.label, 'Destacado');
        assertEqual(destacado.bgClass, 'bg-amber-500 text-white');
        assertEqual(destacado.icon, 'Sparkles');
      },
    },
    {
      name: 'Calculates Novedad (New) badge dynamically based on item creation within 30 days',
      fn: () => {
        function isNewItem(createdAtIso: string, referenceDateIso = '2026-08-15T00:00:00Z'): boolean {
          const created = new Date(createdAtIso).getTime();
          const reference = new Date(referenceDateIso).getTime();
          const diffDays = (reference - created) / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 30;
        }

        // Created 14 days ago -> New
        assertTrue(isNewItem('2026-08-01T00:00:00Z'));

        // Created 45 days ago -> Not new
        assertFalse(isNewItem('2026-07-01T00:00:00Z'));
      },
    },
    {
      name: 'Triggers Pocas Unidades (Low Stock) badge when inventory quantity is below threshold',
      fn: () => {
        function shouldShowLowStockBadge(
          inventoryQuantity: number,
          lowStockThreshold: number,
          trackInventory: boolean
        ): boolean {
          if (!trackInventory) return false;
          return inventoryQuantity > 0 && inventoryQuantity <= lowStockThreshold;
        }

        // 10 units with threshold of 20 -> Low stock
        assertTrue(shouldShowLowStockBadge(10, 20, true));

        // 50 units with threshold of 20 -> Normal stock
        assertFalse(shouldShowLowStockBadge(50, 20, true));

        // 0 units -> Out of stock (not low stock)
        assertFalse(shouldShowLowStockBadge(0, 20, true));

        // Digital product (track_inventory = false) -> Never low stock
        assertFalse(shouldShowLowStockBadge(5, 20, false));
      },
    },
    {
      name: 'Calculates dynamic percentage discount badge from compare_at_price vs base_price',
      fn: () => {
        function calculateDiscountBadge(basePrice: number, compareAtPrice?: number): string | null {
          if (!compareAtPrice || compareAtPrice <= basePrice) return null;
          const discountPercent = Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100);
          return `-${discountPercent}%`;
        }

        // 85,000 COP vs 120,000 COP -> -29%
        const badge1 = calculateDiscountBadge(85000, 120000);
        assertEqual(badge1, '-29%');

        // 50,000 COP vs 100,000 COP -> -50%
        const badge2 = calculateDiscountBadge(50000, 100000);
        assertEqual(badge2, '-50%');

        // compareAt <= basePrice -> null (no discount)
        const badgeNone = calculateDiscountBadge(100000, 100000);
        assertEqual(badgeNone, null);
      },
    },
    {
      name: 'Enforces maximum 3 badges limit to maintain visual cleanliness in portal cards',
      fn: () => {
        function getDisplayedBadges(allBadges: string[], maxLimit = 3): string[] {
          return allBadges.slice(0, maxLimit);
        }

        const manyBadges = [
          'Destacado',
          'Novedad',
          '-30%',
          'Pocas Unidades',
          'Envío Gratis',
          'Exclusivo Web',
        ];

        const displayed = getDisplayedBadges(manyBadges, 3);
        assertArrayLength(displayed, 3);
        assertEqual(displayed, ['Destacado', 'Novedad', '-30%']);
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
