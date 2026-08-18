/**
 * Tier 1 Test Suite: Cart Drawer & Persistent Storefront State
 * Covers Cart Additions, Line Item Uniqueness, Variant Price Modifiers,
 * Add-on Totals, Quantity Limits, Delivery Mode Switcher, and Customer Profile Persistence.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertArrayLength,
  assertGreaterThan,
} from '../harness/assertions';
import {
  createStorefrontCartStore,
  computeCartLineUnitPrice,
  StorefrontCartItem,
} from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';

export const suite = {
  name: 'T1-00B: Persistent Cart Drawer & State Management',
  tier: 'Tier 1',
  feature: 'F5 & F6: Persistent Storefront Cart Store & Slide-Over Drawer',
  tests: [
    {
      name: 'Cart additions with unique line IDs for items and variants',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        // 1. Add simple product
        cart.addItem({
          catalog_item_id: 'prod_mug_01',
          name: 'Taza Cerámica Pixy',
          base_price: 25000,
          unit_price: 25000,
          quantity: 2,
          selected_addons: [],
        });

        assertEqual(cart.items.length, 1);
        assertEqual(cart.items[0].id, 'prod_mug_01:base');
        assertEqual(cart.items[0].quantity, 2);
        assertEqual(cart.items[0].final_price, 50000);
        assertEqual(cart.getTotalItems(), 2);
        assertEqual(cart.getTotal(), 50000);

        // 2. Add product with Variant A
        cart.addItem({
          catalog_item_id: 'prod_shirt_01',
          name: 'Camiseta Algodón',
          base_price: 45000,
          unit_price: 45000,
          quantity: 1,
          selected_variant: {
            id: 'var_size_s',
            name: 'Talla S',
            attributes: { Talla: 'S' },
          },
          selected_addons: [],
        });

        // 3. Add same product with Variant B (must create a separate cart line)
        cart.addItem({
          catalog_item_id: 'prod_shirt_01',
          name: 'Camiseta Algodón',
          base_price: 45000,
          unit_price: 45000,
          quantity: 1,
          selected_variant: {
            id: 'var_size_m',
            name: 'Talla M',
            attributes: { Talla: 'M' },
          },
          selected_addons: [],
        });

        assertEqual(cart.items.length, 3);
        assertEqual(cart.items[1].id, 'prod_shirt_01:var_size_s');
        assertEqual(cart.items[2].id, 'prod_shirt_01:var_size_m');
        assertEqual(cart.getTotalItems(), 4);
        assertEqual(cart.getTotal(), 140000);
      },
    },
    {
      name: 'Line item quantity merging when adding identical item and variant',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        cart.addItem({
          catalog_item_id: 'prod_coffee_01',
          name: 'Café Especial 500g',
          base_price: 32000,
          unit_price: 32000,
          quantity: 1,
          selected_addons: [],
        });

        // Add 3 more of the same item
        cart.addItem({
          catalog_item_id: 'prod_coffee_01',
          name: 'Café Especial 500g',
          base_price: 32000,
          unit_price: 32000,
          quantity: 3,
          selected_addons: [],
        });

        assertEqual(cart.items.length, 1);
        assertEqual(cart.items[0].quantity, 4);
        assertEqual(cart.items[0].final_price, 128000);
        assertEqual(cart.getTotal(), 128000);
      },
    },
    {
      name: 'Variant price modifiers and add-on pricing calculations',
      fn: () => {
        // Base price: $100.000
        // Offset variant: +$20.000 -> $120.000
        // Addon 1: +$15.000 (Garantía)
        // Addon 2: +$5.000 (Empaque)
        // Total unit: $140.000
        const unitPrice = computeCartLineUnitPrice(
          100000,
          {
            id: 'var_premium',
            name: 'Edición Premium',
            price_modifier: 20000,
            price_type: 'offset',
            attributes: { Tipo: 'Premium' },
          },
          [
            { price: 15000 },
            { price: 5000 },
          ]
        );

        assertEqual(unitPrice, 140000);

        // Fixed price override variant
        const fixedUnitPrice = computeCartLineUnitPrice(
          100000,
          {
            id: 'var_fixed',
            name: 'Edición Especial Fija',
            price_override: 85000,
            attributes: { Tipo: 'Especial' },
          },
          [{ price: 10000 }]
        );
        assertEqual(fixedUnitPrice, 95000);

        // Percentage modifier variant: +10%
        const pctUnitPrice = computeCartLineUnitPrice(
          100000,
          {
            id: 'var_pct',
            name: 'Edición +10%',
            price_modifier: 10,
            price_type: 'percentage',
            attributes: { Tipo: 'Plus' },
          },
          []
        );
        assertEqual(pctUnitPrice, 110000);
      },
    },
    {
      name: 'Quantity updates and automatic removal when quantity is reduced to zero',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        cart.addItem({
          catalog_item_id: 'prod_pen_01',
          name: 'Bolígrafo Ejecutivo',
          base_price: 15000,
          unit_price: 15000,
          quantity: 3,
          selected_addons: [],
        });

        const lineId = 'prod_pen_01:base';

        // Update quantity to 5
        cart.updateQuantity(lineId, 5);
        assertEqual(cart.items[0].quantity, 5);
        assertEqual(cart.items[0].final_price, 75000);

        // Update quantity to 0 -> should remove line
        cart.updateQuantity(lineId, 0);
        assertEqual(cart.items.length, 0);
        assertEqual(cart.getTotalItems(), 0);
        assertEqual(cart.getTotal(), 0);
      },
    },
    {
      name: 'Delivery mode switcher and customer profile persistence',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        // Default delivery method is 'pickup'
        assertEqual(cart.delivery_method, 'pickup');

        // Switch to 'delivery'
        cart.setDeliveryMethod('delivery');
        assertEqual(cart.delivery_method, 'delivery');

        // Update customer profile
        cart.updateCustomerProfile({
          name: 'Carolina Gómez',
          phone: '+57 312 987 6543',
          address: 'Calle 100 # 15-20, Apto 502, Bogotá',
          notes: 'Timbre número 502 o dejar con portería',
        });

        assertEqual(cart.customer_profile.name, 'Carolina Gómez');
        assertEqual(cart.customer_profile.phone, '+57 312 987 6543');
        assertEqual(cart.customer_profile.address, 'Calle 100 # 15-20, Apto 502, Bogotá');
        assertEqual(cart.customer_profile.notes, 'Timbre número 502 o dejar con portería');

        // Drawer open / close state
        assertFalse(cart.is_drawer_open);
        cart.setDrawerOpen(true);
        assertTrue(cart.is_drawer_open);
        cart.setDrawerOpen(false);
        assertFalse(cart.is_drawer_open);

        // Clear cart resets items but retains customer profile
        cart.addItem({
          catalog_item_id: 'prod_x',
          name: 'Item X',
          base_price: 10000,
          unit_price: 10000,
          quantity: 1,
          selected_addons: [],
        });
        assertEqual(cart.items.length, 1);
        cart.clearCart();
        assertEqual(cart.items.length, 0);
        assertEqual(cart.customer_profile.name, 'Carolina Gómez');
      },
    },
  ],
};
