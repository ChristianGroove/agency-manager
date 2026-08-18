/**
 * Tier 3 Test Suite: Pairwise Cross-Feature Interactions
 * Covers combinatorial interactions between Variants, Add-ons,
 * Backorders, Delivery Modes, and Multi-Channel Checkout Triggers.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertGreaterThan,
} from '../harness/assertions';
import {
  createStorefrontCartStore,
  InMemoryInventoryEngine,
  evaluateStockStatus,
  formatConsolidatedWhatsAppCartOrder,
  generateConsolidatedWompiSession,
  generateConsolidatedCRMQuote,
  computeCartLineUnitPrice,
} from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';

interface PairwiseCase {
  id: string;
  description: string;
  variantType: 'none' | 'fixed' | 'offset' | 'percentage';
  addonsType: 'none' | 'single' | 'multiple';
  stockState: 'in_stock' | 'low_stock' | 'out_of_stock_no_backorder' | 'out_of_stock_backorder';
  channel: 'whatsapp' | 'wompi' | 'quote';
  delivery: 'pickup' | 'delivery';
}

const PAIRWISE_MATRIX: PairwiseCase[] = [
  {
    id: 'PW-01',
    description: 'Simple Product + No Addons + In Stock + WhatsApp + Pickup',
    variantType: 'none',
    addonsType: 'none',
    stockState: 'in_stock',
    channel: 'whatsapp',
    delivery: 'pickup',
  },
  {
    id: 'PW-02',
    description: 'Fixed Variant + Single Addon + Low Stock + Wompi + Delivery',
    variantType: 'fixed',
    addonsType: 'single',
    stockState: 'low_stock',
    channel: 'wompi',
    delivery: 'delivery',
  },
  {
    id: 'PW-03',
    description: 'Offset Variant + Multiple Addons + Backorder + CRM Quote + Delivery',
    variantType: 'offset',
    addonsType: 'multiple',
    stockState: 'out_of_stock_backorder',
    channel: 'quote',
    delivery: 'delivery',
  },
  {
    id: 'PW-04',
    description: 'Percentage Variant + Single Addon + Out of Stock (No Backorder) + WhatsApp + Pickup',
    variantType: 'percentage',
    addonsType: 'single',
    stockState: 'out_of_stock_no_backorder',
    channel: 'whatsapp',
    delivery: 'pickup',
  },
  {
    id: 'PW-05',
    description: 'Offset Variant + No Addons + In Stock + Wompi + Pickup',
    variantType: 'offset',
    addonsType: 'none',
    stockState: 'in_stock',
    channel: 'wompi',
    delivery: 'pickup',
  },
  {
    id: 'PW-06',
    description: 'Fixed Variant + Multiple Addons + Backorder + WhatsApp + Delivery',
    variantType: 'fixed',
    addonsType: 'multiple',
    stockState: 'out_of_stock_backorder',
    channel: 'whatsapp',
    delivery: 'delivery',
  },
  {
    id: 'PW-07',
    description: 'Percentage Variant + No Addons + Low Stock + CRM Quote + Delivery',
    variantType: 'percentage',
    addonsType: 'none',
    stockState: 'low_stock',
    channel: 'quote',
    delivery: 'delivery',
  },
  {
    id: 'PW-08',
    description: 'Simple Product + Multiple Addons + In Stock + CRM Quote + Pickup',
    variantType: 'none',
    addonsType: 'multiple',
    stockState: 'in_stock',
    channel: 'quote',
    delivery: 'pickup',
  },
];

export const suite = {
  name: 'T3-00: Pairwise Cross-Feature Interactions',
  tier: 'Tier 3',
  feature: 'F1, F2, F5, F6, F7, F8, F9: Pairwise Multi-Dimension Interaction Matrix',
  tests: PAIRWISE_MATRIX.map((testCase) => ({
    name: `[${testCase.id}] ${testCase.description}`,
    fn: async () => {
      const engine = new InMemoryInventoryEngine();
      const cart = createStorefrontCartStore(TENANT_A_ID);

      const basePrice = 50000;
      let variantObj: any = undefined;
      let addonsList: Array<{ id: string; name: string; price: number }> = [];

      // 1. Configure Variant
      if (testCase.variantType === 'fixed') {
        variantObj = {
          id: 'var_fixed_01',
          name: 'Variante Precio Fijo',
          price_modifier: 75000,
          price_type: 'fixed',
          attributes: { Tipo: 'Fijo' },
        };
      } else if (testCase.variantType === 'offset') {
        variantObj = {
          id: 'var_offset_01',
          name: 'Variante Offset +15k',
          price_modifier: 15000,
          price_type: 'offset',
          attributes: { Tipo: 'Offset' },
        };
      } else if (testCase.variantType === 'percentage') {
        variantObj = {
          id: 'var_pct_01',
          name: 'Variante +20%',
          price_modifier: 20,
          price_type: 'percentage',
          attributes: { Tipo: 'Pct' },
        };
      }

      // 2. Configure Add-ons
      if (testCase.addonsType === 'single') {
        addonsList = [{ id: 'add_1', name: 'Garantía 1 Año', price: 10000 }];
      } else if (testCase.addonsType === 'multiple') {
        addonsList = [
          { id: 'add_1', name: 'Garantía 1 Año', price: 10000 },
          { id: 'add_2', name: 'Empaque Regalo', price: 5000 },
        ];
      }

      // 3. Configure Stock State
      let initialStock = 20;
      let allowBackorders = false;
      let lowStockThreshold = 5;

      if (testCase.stockState === 'low_stock') {
        initialStock = 3;
      } else if (testCase.stockState === 'out_of_stock_no_backorder') {
        initialStock = 0;
        allowBackorders = false;
      } else if (testCase.stockState === 'out_of_stock_backorder') {
        initialStock = 0;
        allowBackorders = true;
      }

      engine.registerItem({
        catalogItemId: `item_${testCase.id}`,
        variantId: variantObj?.id,
        stockQuantity: initialStock,
        trackInventory: true,
        allowBackorders,
        lowStockThreshold,
      });

      const stockStatus = evaluateStockStatus({
        track_inventory: true,
        stock_quantity: initialStock,
        allow_backorders: allowBackorders,
        low_stock_threshold: lowStockThreshold,
      });

      if (testCase.stockState === 'out_of_stock_no_backorder') {
        assertFalse(stockStatus.canPurchase);
        assertEqual(stockStatus.status, 'out_of_stock');
        return; // Lockout verified, do not allow cart purchase
      } else {
        assertTrue(stockStatus.canPurchase);
      }

      // 4. Add to Cart
      cart.addItem({
        catalog_item_id: `item_${testCase.id}`,
        name: `Producto Test ${testCase.id}`,
        base_price: basePrice,
        unit_price: basePrice,
        quantity: 2,
        selected_variant: variantObj,
        selected_addons: addonsList,
      });

      cart.setDeliveryMethod(testCase.delivery);
      cart.updateCustomerProfile({
        name: `Cliente ${testCase.id}`,
        phone: '+573009998877',
        address: 'Calle 50 # 10-20',
      });

      // 5. Verify Unit & Total Price computation
      const expectedUnit = computeCartLineUnitPrice(basePrice, variantObj, addonsList);
      assertEqual(cart.items[0].unit_price, expectedUnit);
      assertEqual(cart.getTotal(), expectedUnit * 2);

      // 6. Test Channel Execution
      if (testCase.channel === 'whatsapp') {
        const wa = formatConsolidatedWhatsAppCartOrder(cart, '+573001234567');
        assertTrue(wa.rawText.includes(`Producto Test ${testCase.id}`));
        assertTrue(wa.encodedUri.startsWith('https://wa.me/'));
      } else if (testCase.channel === 'wompi') {
        const wompi = generateConsolidatedWompiSession(cart);
        assertEqual(wompi.amountInCents, expectedUnit * 2 * 100);
        assertTrue(wompi.signature.length === 64);
      } else if (testCase.channel === 'quote') {
        const quote = generateConsolidatedCRMQuote(cart, TENANT_A_ID);
        assertEqual(quote.quote.total, expectedUnit * 2);
        assertEqual(quote.lead.name, `Cliente ${testCase.id}`);
      }

      // 7. Atomic Decrement Execution
      const decRes = await engine.decrementStockAction({
        organizationId: TENANT_A_ID,
        items: [
          {
            catalogItemId: `item_${testCase.id}`,
            variantId: variantObj?.id,
            quantity: 2,
          },
        ],
      });

      assertTrue(decRes.success);
      const updatedStock = engine.getItem(`item_${testCase.id}`, variantObj?.id);
      assertEqual(updatedStock?.stockQuantity, initialStock - 2);
    },
  })),
};
