/**
 * Tier 1 Test Suite: Inventory & Stock Engine
 * Covers Item & Variant Stock Tracking, Atomic Decrement, Restore,
 * Low Stock Thresholds, Out-of-Stock Lockout, Backorders, SKUs & Barcodes.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertThrows,
  assertArrayLength,
  assertGreaterThan,
  assertLessThanOrEqual,
} from '../harness/assertions';
import {
  InMemoryInventoryEngine,
  evaluateStockStatus,
  StockStatusEvaluation,
} from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';

export const suite = {
  name: 'T1-00: Stock & Inventory Management Engine',
  tier: 'Tier 1',
  feature: 'F1 & F2: Inventory Tracking, Atomic Actions & Out-of-Stock Guards',
  tests: [
    {
      name: 'Item level stock tracking and status evaluation',
      fn: () => {
        // 1. In Stock normal
        const itemInStock = {
          track_inventory: true,
          stock_quantity: 25,
          allow_backorders: false,
          low_stock_threshold: 5,
        };
        const resInStock = evaluateStockStatus(itemInStock);
        assertEqual(resInStock.status, 'in_stock');
        assertEqual(resInStock.badge, null);
        assertTrue(resInStock.canPurchase);

        // 2. Low Stock threshold boundary
        const itemLowStock = {
          track_inventory: true,
          stock_quantity: 4,
          allow_backorders: false,
          low_stock_threshold: 5,
        };
        const resLowStock = evaluateStockStatus(itemLowStock);
        assertEqual(resLowStock.status, 'low_stock');
        assertEqual(resLowStock.badge, '¡Últimas 4 unidades!');
        assertTrue(resLowStock.canPurchase);

        // 3. Out of stock lockout (backorders disabled)
        const itemOutOfStock = {
          track_inventory: true,
          stock_quantity: 0,
          allow_backorders: false,
          low_stock_threshold: 5,
        };
        const resOutOfStock = evaluateStockStatus(itemOutOfStock);
        assertEqual(resOutOfStock.status, 'out_of_stock');
        assertEqual(resOutOfStock.badge, 'Agotado');
        assertFalse(resOutOfStock.canPurchase);

        // 4. Out of stock with backorders allowed
        const itemBackorder = {
          track_inventory: true,
          stock_quantity: 0,
          allow_backorders: true,
          low_stock_threshold: 5,
        };
        const resBackorder = evaluateStockStatus(itemBackorder);
        assertEqual(resBackorder.status, 'backorder');
        assertEqual(resBackorder.badge, 'Disponible bajo pedido');
        assertTrue(resBackorder.canPurchase);

        // 5. Untracked inventory item
        const itemUntracked = {
          track_inventory: false,
          stock_quantity: 0,
          allow_backorders: false,
        };
        const resUntracked = evaluateStockStatus(itemUntracked);
        assertEqual(resUntracked.status, 'untracked');
        assertEqual(resUntracked.badge, null);
        assertTrue(resUntracked.canPurchase);
      },
    },
    {
      name: 'Variant level stock tracking with independent inventories',
      fn: () => {
        const engine = new InMemoryInventoryEngine();

        // Register variant S (in stock = 10), variant M (low stock = 2), variant L (out of stock = 0, no backorders)
        engine.registerItem({
          catalogItemId: 'item_tshirt_001',
          variantId: 'var_size_s',
          stockQuantity: 10,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 5,
          sku: 'TSHIRT-BLK-S',
          barcode: '770123456701',
        });

        engine.registerItem({
          catalogItemId: 'item_tshirt_001',
          variantId: 'var_size_m',
          stockQuantity: 2,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 5,
          sku: 'TSHIRT-BLK-M',
          barcode: '770123456702',
        });

        engine.registerItem({
          catalogItemId: 'item_tshirt_001',
          variantId: 'var_size_l',
          stockQuantity: 0,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 5,
          sku: 'TSHIRT-BLK-L',
          barcode: '770123456703',
        });

        const varS = engine.getItem('item_tshirt_001', 'var_size_s');
        const varM = engine.getItem('item_tshirt_001', 'var_size_m');
        const varL = engine.getItem('item_tshirt_001', 'var_size_l');

        assertTrue(varS !== undefined);
        assertEqual(varS?.stockQuantity, 10);
        assertEqual(evaluateStockStatus(varS!).status, 'in_stock');

        assertTrue(varM !== undefined);
        assertEqual(varM?.stockQuantity, 2);
        assertEqual(evaluateStockStatus(varM!).status, 'low_stock');
        assertEqual(evaluateStockStatus(varM!).badge, '¡Últimas 2 unidades!');

        assertTrue(varL !== undefined);
        assertEqual(varL?.stockQuantity, 0);
        assertEqual(evaluateStockStatus(varL!).status, 'out_of_stock');
        assertEqual(evaluateStockStatus(varL!).badge, 'Agotado');
        assertFalse(evaluateStockStatus(varL!).canPurchase);
      },
    },
    {
      name: 'Atomic stock decrement across multiple items and variants',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();

        engine.registerItem({
          catalogItemId: 'item_shoes_01',
          variantId: 'var_size_41',
          stockQuantity: 5,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 2,
        });

        engine.registerItem({
          catalogItemId: 'item_socks_01',
          variantId: undefined, // base product
          stockQuantity: 12,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 3,
        });

        // Decrement 2 pairs of shoes and 3 pairs of socks
        const result = await engine.decrementStockAction({
          organizationId: TENANT_A_ID,
          items: [
            { catalogItemId: 'item_shoes_01', variantId: 'var_size_41', quantity: 2 },
            { catalogItemId: 'item_socks_01', quantity: 3 },
          ],
        });

        assertTrue(result.success, `Expected decrement to succeed: ${result.error}`);
        assertEqual(result.updatedItems?.length, 2);

        const updatedShoes = engine.getItem('item_shoes_01', 'var_size_41');
        const updatedSocks = engine.getItem('item_socks_01');

        assertEqual(updatedShoes?.stockQuantity, 3);
        assertEqual(updatedSocks?.stockQuantity, 9);
      },
    },
    {
      name: 'Atomic rollback on partial inventory failure (all-or-nothing)',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();

        engine.registerItem({
          catalogItemId: 'item_hoodie_01',
          stockQuantity: 10,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 2,
        });

        engine.registerItem({
          catalogItemId: 'item_cap_01',
          stockQuantity: 1, // only 1 in stock
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 2,
        });

        // Request 2 hoodies (sufficient) and 3 caps (insufficient)
        const result = await engine.decrementStockAction({
          organizationId: TENANT_A_ID,
          items: [
            { catalogItemId: 'item_hoodie_01', quantity: 2 },
            { catalogItemId: 'item_cap_01', quantity: 3 },
          ],
        });

        // Operation must fail completely and leave hoodie stock untouched
        assertFalse(result.success);
        assertTrue(result.error?.includes('Stock insuficiente') || result.error?.includes('insuficiente'));

        const untouchedHoodie = engine.getItem('item_hoodie_01');
        const untouchedCap = engine.getItem('item_cap_01');

        assertEqual(untouchedHoodie?.stockQuantity, 10);
        assertEqual(untouchedCap?.stockQuantity, 1);
      },
    },
    {
      name: 'Stock restoration after cancelled order or returned items',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();

        engine.registerItem({
          catalogItemId: 'item_watch_01',
          stockQuantity: 3,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 2,
        });

        // 1. Decrement 2 units
        await engine.decrementStockAction({
          organizationId: TENANT_A_ID,
          items: [{ catalogItemId: 'item_watch_01', quantity: 2 }],
        });
        assertEqual(engine.getItem('item_watch_01')?.stockQuantity, 1);

        // 2. Restore 2 units
        const restoreRes = await engine.restoreStockAction({
          organizationId: TENANT_A_ID,
          items: [{ catalogItemId: 'item_watch_01', quantity: 2 }],
        });

        assertTrue(restoreRes.success);
        assertEqual(engine.getItem('item_watch_01')?.stockQuantity, 3);
      },
    },
    {
      name: 'Direct stock update with low stock threshold and SKU adjustment',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();

        engine.registerItem({
          catalogItemId: 'item_bottle_01',
          stockQuantity: 0,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 5,
        });

        const updateRes = await engine.updateItemStockAction({
          organizationId: TENANT_A_ID,
          catalogItemId: 'item_bottle_01',
          stockQuantity: 150,
          lowStockThreshold: 10,
          sku: 'BOTTLE-ECO-750ML',
          barcode: '770999888111',
          allowBackorders: true,
        });

        assertTrue(updateRes.success);
        assertEqual(updateRes.data?.stockQuantity, 150);
        assertEqual(updateRes.data?.lowStockThreshold, 10);
        assertEqual(updateRes.data?.sku, 'BOTTLE-ECO-750ML');
        assertEqual(updateRes.data?.barcode, '770999888111');
        assertTrue(updateRes.data?.allowBackorders);
      },
    },
  ],
};
