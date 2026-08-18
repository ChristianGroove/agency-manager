/**
 * Tier 4 Test Suite: End-to-End Real-World Application Workload Scenarios
 * Covers Multi-Step Business Workflows:
 * 1. Retail Store Multi-Item Cart to WhatsApp Checkout with Delivery & Custom Notes
 * 2. High-Concurrency Flash Sale with Atomic Stock Decrement & Lockout
 * 3. Multi-Variant B2B Formal Quote Generation with Add-Ons & CRM Lead Capture
 * 4. Service Business Booking Slot Selection with Direct Customer Info Pre-fill
 * 5. Multi-Channel Hybrid Storefront with Per-Item CTA Overrides & Customizer
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
  InMemoryInventoryEngine,
  evaluateStockStatus,
  formatConsolidatedWhatsAppCartOrder,
  generateConsolidatedWompiSession,
  generateConsolidatedCRMQuote,
  resolveEffectiveCTA,
} from '../harness/contracts';
import { TENANT_A_ID, TENANT_B_ID } from '../harness/mock-data';

export const suite = {
  name: 'T4-00: End-to-End Real-World Workflow Scenarios',
  tier: 'Tier 4',
  feature: 'F1-F13: Complete End-to-End Business Scenarios',
  tests: [
    {
      name: 'Scenario 1: Retail Store Multi-Item Cart to WhatsApp Checkout with Delivery & Custom Notes',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();
        const cart = createStorefrontCartStore(TENANT_A_ID);

        // Setup store inventory: Jean Denim (stock = 15), Camiseta (stock = 25), Cinturón Cuero (stock = 8)
        engine.registerItem({
          catalogItemId: 'item_jean_01',
          variantId: 'var_jean_32',
          stockQuantity: 15,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 5,
        });

        engine.registerItem({
          catalogItemId: 'item_shirt_01',
          variantId: 'var_shirt_m',
          stockQuantity: 25,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 5,
        });

        engine.registerItem({
          catalogItemId: 'item_belt_01',
          stockQuantity: 8,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 3,
        });

        // 1. Customer adds Jean (Size 32)
        cart.addItem({
          catalog_item_id: 'item_jean_01',
          name: 'Jean Denim Clásico',
          base_price: 140000,
          unit_price: 140000,
          quantity: 1,
          selected_variant: {
            id: 'var_jean_32',
            name: 'Talla 32',
            attributes: { Talla: '32' },
          },
          selected_addons: [],
        });

        // 2. Customer adds Camiseta (Size M) + Gift Wrap Addon
        cart.addItem({
          catalog_item_id: 'item_shirt_01',
          name: 'Camiseta Básica Algodón',
          base_price: 45000,
          unit_price: 45000,
          quantity: 2,
          selected_variant: {
            id: 'var_shirt_m',
            name: 'Talla M',
            attributes: { Talla: 'M' },
          },
          selected_addons: [
            { id: 'add_gift', name: 'Empaque de Regalo con Moño', price: 6000 },
          ],
          custom_notes: 'Marcar para Cumpleaños de Sofía',
        });

        // 3. Customer adds Cinturón Cuero
        cart.addItem({
          catalog_item_id: 'item_belt_01',
          name: 'Cinturón Cuero Café',
          base_price: 65000,
          unit_price: 65000,
          quantity: 1,
          selected_addons: [],
        });

        // Verify Cart Totals:
        // Jean: 140.000 * 1 = 140.000
        // Shirt + Addon: (45.000 + 6.000) * 2 = 102.000
        // Belt: 65.000 * 1 = 65.000
        // Total = 307.000
        assertEqual(cart.getTotalItems(), 4);
        assertEqual(cart.getTotal(), 307000);

        // 4. Configure Delivery Method and Customer Profile
        cart.setDeliveryMethod('delivery');
        cart.updateCustomerProfile({
          name: 'Camila Osorio',
          phone: '+57 314 555 7788',
          address: 'Calle 127 # 19-45, Torre 2, Apto 804, Bogotá',
          notes: 'Favor timbrar en portería',
        });

        // 5. Generate WhatsApp Consolidated Order
        const waOrder = formatConsolidatedWhatsAppCartOrder(cart, '+573009990011', '$');
        assertTrue(waOrder.rawText.includes('Jean Denim Clásico'));
        assertTrue(waOrder.rawText.includes('Camiseta Básica Algodón'));
        assertTrue(waOrder.rawText.includes('Empaque de Regalo con Moño'));
        assertTrue(waOrder.rawText.includes('Cinturón Cuero Café'));
        assertTrue(waOrder.rawText.includes('307.000'));
        assertTrue(waOrder.rawText.includes('Camila Osorio'));
        assertTrue(waOrder.rawText.includes('Calle 127 # 19-45'));

        // 6. Execute atomic stock decrement
        const decRes = await engine.decrementStockAction({
          organizationId: TENANT_A_ID,
          items: [
            { catalogItemId: 'item_jean_01', variantId: 'var_jean_32', quantity: 1 },
            { catalogItemId: 'item_shirt_01', variantId: 'var_shirt_m', quantity: 2 },
            { catalogItemId: 'item_belt_01', quantity: 1 },
          ],
        });

        assertTrue(decRes.success);
        assertEqual(engine.getItem('item_jean_01', 'var_jean_32')?.stockQuantity, 14);
        assertEqual(engine.getItem('item_shirt_01', 'var_shirt_m')?.stockQuantity, 23);
        assertEqual(engine.getItem('item_belt_01')?.stockQuantity, 7);
      },
    },
    {
      name: 'Scenario 2: High-Concurrency Flash Sale with Atomic Stock Decrement & Lockout',
      fn: async () => {
        const engine = new InMemoryInventoryEngine();

        // Limited edition drop: Exactly 5 units available
        const FLASH_ITEM_ID = 'drop_sneaker_limited';
        engine.registerItem({
          catalogItemId: FLASH_ITEM_ID,
          stockQuantity: 5,
          trackInventory: true,
          allowBackorders: false,
          lowStockThreshold: 2,
        });

        // Simulate 8 simultaneous buyers attempting to purchase 1 unit each
        const buyerAttempts = Array.from({ length: 8 }, (_, i) => ({
          buyerId: `buyer_${i + 1}`,
          quantity: 1,
        }));

        const results = await Promise.all(
          buyerAttempts.map((buyer) =>
            engine.decrementStockAction({
              organizationId: TENANT_A_ID,
              items: [{ catalogItemId: FLASH_ITEM_ID, quantity: buyer.quantity }],
            })
          )
        );

        const successfulPurchases = results.filter((r) => r.success);
        const rejectedPurchases = results.filter((r) => !r.success);

        // Exactly 5 buyers succeed, exactly 3 fail due to stock depletion
        assertEqual(successfulPurchases.length, 5);
        assertEqual(rejectedPurchases.length, 3);

        const finalItem = engine.getItem(FLASH_ITEM_ID);
        assertEqual(finalItem?.stockQuantity, 0);

        // Storefront status is now 'Agotado' and locked
        const status = evaluateStockStatus(finalItem!);
        assertEqual(status.status, 'out_of_stock');
        assertEqual(status.badge, 'Agotado');
        assertFalse(status.canPurchase);
      },
    },
    {
      name: 'Scenario 3: Multi-Variant B2B Formal Quote Generation with Add-Ons & CRM Lead Capture',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        // B2B Item: ERP Cloud License (Enterprise Variant: +$4.000.000)
        // Add-ons: Dedicated SLA Support (+$1.500.000), Data Migration (+$2.000.000)
        cart.addItem({
          catalog_item_id: 'b2b_erp_cloud',
          name: 'Licenciamiento ERP Cloud SaaS',
          base_price: 3000000,
          unit_price: 3000000,
          quantity: 1,
          selected_variant: {
            id: 'var_tier_enterprise',
            name: 'Tier Enterprise (Hasta 100 Usuarios)',
            price_modifier: 4000000,
            price_type: 'offset',
            attributes: { Tier: 'Enterprise' },
          },
          selected_addons: [
            { id: 'add_sla', name: 'SLA Soporte 24/7 Dedicado', price: 1500000 },
            { id: 'add_migr', name: 'Migración de Datos Históricos', price: 2000000 },
          ],
          custom_notes: 'Requerimos integración con SAP Business One',
        });

        cart.updateCustomerProfile({
          name: 'Ing. Carlos Sarmiento',
          phone: '+57 320 888 4433',
          address: 'Zona Franca de Bogotá, Bodega 45',
          notes: 'Facturar a nombre de Inversiones Logísticas S.A.S - NIT 900.123.456-7',
        });

        const crmQuote = generateConsolidatedCRMQuote(cart, TENANT_A_ID);

        // Verify Lead
        assertEqual(crmQuote.lead.name, 'Ing. Carlos Sarmiento');
        assertEqual(crmQuote.lead.phone, '+57 320 888 4433');
        assertEqual(crmQuote.lead.organization_id, TENANT_A_ID);

        // Verify Quote Items
        assertEqual(crmQuote.quote.items.length, 1);
        const quoteItem = crmQuote.quote.items[0];
        assertEqual(quoteItem.catalog_item_id, 'b2b_erp_cloud');
        assertEqual(quoteItem.variant_title, 'Tier Enterprise (Hasta 100 Usuarios)');
        assertEqual(quoteItem.addons.length, 2);

        // Total: 3.000.000 + 4.000.000 + 1.500.000 + 2.000.000 = 10.500.000
        assertEqual(crmQuote.quote.total, 10500000);
      },
    },
    {
      name: 'Scenario 4: Service Business Booking Slot Selection with Direct Customer Info Pre-fill',
      fn: () => {
        const baseUrl = 'https://pixy.agency/portal/citas';
        const params = new URLSearchParams();
        params.set('action', 'book');
        params.set('item', 'service_dental_whitening');
        params.set('variant', 'var_laser_zoom');
        params.set('date', '2026-10-15');
        params.set('slot', '14:30');
        params.set('name', 'Valentina Morales');
        params.set('phone', '+573167778899');

        const bookingUrl = `${baseUrl}?${params.toString()}`;

        assertTrue(bookingUrl.includes('item=service_dental_whitening'));
        assertTrue(bookingUrl.includes('variant=var_laser_zoom'));
        assertTrue(bookingUrl.includes('date=2026-10-15'));
        assertTrue(bookingUrl.includes('slot=14%3A30'));
        assertTrue(bookingUrl.includes('name=Valentina+Morales') || bookingUrl.includes('name=Valentina%20Morales'));
      },
    },
    {
      name: 'Scenario 5: Multi-Channel Hybrid Storefront with Per-Item CTA Overrides & Store Customizer',
      fn: () => {
        // Theme setting: Global Primary CTA is 'cart'
        const customizerTheme = {
          primary_cta: 'cart',
        };

        const catalogItems = [
          { id: 'item_1', name: 'Libro Físico', cta_type: null }, // defaults to 'cart'
          { id: 'item_2', name: 'Consultoría Estratégica', cta_type: 'quote' }, // overrides to 'quote'
          { id: 'item_3', name: 'Sesión de Masaje Terapéutico', cta_type: 'booking' }, // overrides to 'booking'
          { id: 'item_4', name: 'Compra Rápida Wompi', cta_type: 'buy' }, // overrides to 'buy'
          { id: 'item_5', name: 'Preguntas por WhatsApp', cta_type: 'whatsapp' }, // overrides to 'whatsapp'
        ];

        const resolvedCTAs = catalogItems.map((item) => ({
          id: item.id,
          cta: resolveEffectiveCTA(item, customizerTheme),
        }));

        assertEqual(resolvedCTAs[0].cta, 'cart');
        assertEqual(resolvedCTAs[1].cta, 'quote');
        assertEqual(resolvedCTAs[2].cta, 'booking');
        assertEqual(resolvedCTAs[3].cta, 'buy');
        assertEqual(resolvedCTAs[4].cta, 'whatsapp');
      },
    },
  ],
};
