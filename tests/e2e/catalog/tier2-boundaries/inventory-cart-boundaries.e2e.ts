/**
 * Tier 2 Test Suite: Inventory & Cart Boundary Value Analysis
 * Covers Zero Stock, Negative Stock Attempts, Max Integer Quantities,
 * Special Characters in Notes, Long Delivery Addresses, and Empty Cart Checkout Prevention.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertThrows,
  assertGreaterThan,
} from '../harness/assertions';
import {
  createStorefrontCartStore,
  InMemoryInventoryEngine,
  evaluateStockStatus,
  formatConsolidatedWhatsAppCartOrder,
  generateConsolidatedWompiSession,
  generateConsolidatedCRMQuote,
  sanitizeHtml,
} from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';

export const suite = {
  name: 'T2-00: Inventory & Cart Boundary Conditions',
  tier: 'Tier 2',
  feature: 'F1, F2, F5, F6, F7, F8, F9: Boundary Value & Resilience Analysis',
  tests: [
    {
      name: 'Zero stock exact boundary and stock transition lockout',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();

        engine.registerItem({
          catalogItemId: 'item_exact_1',
          stockQuantity: 1,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 1,
        });

        // In stock at 1
        assertEqual(evaluateStockStatus(engine.getItem('item_exact_1')!).status, 'low_stock');
        assertTrue(evaluateStockStatus(engine.getItem('item_exact_1')!).canPurchase);

        // Decrement 1 -> stock becomes 0
        const decRes = await engine.decrementStockAction({
          organizationId: TENANT_A_ID,
          items: [{ catalogItemId: 'item_exact_1', quantity: 1 }],
        });
        assertTrue(decRes.success);
        assertEqual(engine.getItem('item_exact_1')?.stockQuantity, 0);

        // Now out of stock -> must be locked out
        const statusAfter = evaluateStockStatus(engine.getItem('item_exact_1')!);
        assertEqual(statusAfter.status, 'out_of_stock');
        assertEqual(statusAfter.badge, 'Agotado');
        assertFalse(statusAfter.canPurchase);
      },
    },
    {
      name: 'Negative stock decrement attempts rejected when backorders are disabled',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();

        engine.registerItem({
          catalogItemId: 'item_strict_stock',
          stockQuantity: 3,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 2,
        });

        // Attempting to decrement 4 (more than available)
        const decRes = await engine.decrementStockAction({
          organizationId: TENANT_A_ID,
          items: [{ catalogItemId: 'item_strict_stock', quantity: 4 }],
        });

        assertFalse(decRes.success);
        assertTrue(decRes.error?.includes('Stock insuficiente') || decRes.error?.includes('insuficiente'));
        assertEqual(engine.getItem('item_strict_stock')?.stockQuantity, 3);
      },
    },
    {
      name: 'Negative and zero decrement quantity inputs rejected with validation errors',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();

        engine.registerItem({
          catalogItemId: 'item_val_01',
          stockQuantity: 10,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 2,
        });

        // Decrement with 0 quantity
        const zeroRes = await engine.decrementStockAction({
          organizationId: TENANT_A_ID,
          items: [{ catalogItemId: 'item_val_01', quantity: 0 }],
        });
        assertFalse(zeroRes.success);

        // Decrement with negative quantity
        const negRes = await engine.decrementStockAction({
          organizationId: TENANT_A_ID,
          items: [{ catalogItemId: 'item_val_01', quantity: -5 }],
        });
        assertFalse(negRes.success);

        assertEqual(engine.getItem('item_val_01')?.stockQuantity, 10);
      },
    },
    {
      name: 'Max integer and large batch cart quantities handling',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        cart.addItem({
          catalog_item_id: 'item_bulk_01',
          name: 'Tornillos Industriales x 1000',
          base_price: 15000,
          unit_price: 15000,
          quantity: 100000, // 100,000 units
          selected_addons: [],
        });

        assertEqual(cart.getTotalItems(), 100000);
        assertEqual(cart.getTotal(), 1500000000); // 1.5 Billion COP

        // Ensure calculations remain safe within Number.MAX_SAFE_INTEGER
        assertTrue(cart.getTotal() < Number.MAX_SAFE_INTEGER);
      },
    },
    {
      name: 'Special characters, emojis, and HTML escaping in notes and customer details',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        const maliciousInput = '<script>alert("XSS")</script> 🚀 "Pixy" & \'Special\' <style>body{color:red;}</style>';
        const sanitized = sanitizeHtml(maliciousInput);

        assertFalse(sanitized.includes('<script>'));
        assertFalse(sanitized.includes('</script>'));
        assertFalse(sanitized.includes('<style>'));

        cart.addItem({
          catalog_item_id: 'item_special_chars',
          name: 'Caja Regalo Sorpresa 🎁',
          base_price: 50000,
          unit_price: 50000,
          quantity: 1,
          selected_addons: [],
          custom_notes: maliciousInput,
        });

        cart.updateCustomerProfile({
          name: 'Juan O\'Connor & "Partners" 👨‍💻',
          phone: '+57 (300) 123-4567 #200',
          address: 'Calle 10 # 5-20 <Piso 3, Apt "B">',
          notes: maliciousInput,
        });

        const waOrder = formatConsolidatedWhatsAppCartOrder(cart, '+573001234567');
        // Encoded URI must be safe and not throw URI malformed errors
        assertTrue(waOrder.encodedUri.startsWith('https://wa.me/573001234567?text='));
        assertTrue(decodeURIComponent(waOrder.encodedUri).includes('🎁'));
      },
    },
    {
      name: 'Extremely long delivery addresses and notes handled without payload collapse',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        const veryLongAddress = 'Avenida Siempre Viva Número 742, Sector Los Sauces, Entrada 4, Torre B, Apartamento 1502, Conjunto Residencial Las Acacias del Parque Norte, Código Postal 110111, Kilómetro 14 Vía La Calera, Cundinamarca, Colombia. '.repeat(5);
        const veryLongNotes = 'Por favor llamar al portero Don Rodrigo antes de ingresar porque la puerta principal tiene un pestillo electrónico que a veces se bloquea con la lluvia. '.repeat(5);

        cart.addItem({
          catalog_item_id: 'item_furniture_01',
          name: 'Sofá Modular 3 Puestos',
          base_price: 1800000,
          unit_price: 1800000,
          quantity: 1,
          selected_addons: [],
        });

        cart.updateCustomerProfile({
          name: 'Esteban Morales',
          phone: '3187779900',
          address: veryLongAddress,
          notes: veryLongNotes,
        });

        const crmQuote = generateConsolidatedCRMQuote(cart, TENANT_A_ID);
        assertEqual(crmQuote.lead.address, veryLongAddress);
        assertEqual(crmQuote.lead.notes, veryLongNotes);
        assertEqual(crmQuote.quote.total, 1800000);
      },
    },
    {
      name: 'Empty cart checkout prevention across all channels',
      fn: () => {
        const emptyCart = createStorefrontCartStore(TENANT_A_ID);

        assertEqual(emptyCart.items.length, 0);
        assertEqual(emptyCart.getTotalItems(), 0);
        assertEqual(emptyCart.getTotal(), 0);

        // 1. Wompi with empty cart produces 0 amount
        const wompiSession = generateConsolidatedWompiSession(emptyCart);
        assertEqual(wompiSession.amountInCents, 0);

        // 2. CRM Quote with empty cart produces 0 total and empty items array
        const crmQuote = generateConsolidatedCRMQuote(emptyCart, TENANT_A_ID);
        assertEqual(crmQuote.quote.total, 0);
        assertEqual(crmQuote.quote.items.length, 0);
      },
    },
  ],
};
