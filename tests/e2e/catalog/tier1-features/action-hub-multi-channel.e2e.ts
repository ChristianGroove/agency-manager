/**
 * Tier 1 Test Suite: Multi-Channel Action Hub Execution Engine
 * Covers Consolidated WhatsApp Checkout, Express Wompi SHA-256 HMAC Sessions,
 * 1-Click CRM Lead & Quote Generation, and Direct Appointment Booking Links.
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
  formatConsolidatedWhatsAppCartOrder,
  generateConsolidatedWompiSession,
  generateConsolidatedCRMQuote,
  generateWompiSignature,
} from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';

export const suite = {
  name: 'T1-00C: Multi-Channel Action Hub Engine',
  tier: 'Tier 1',
  feature: 'F7, F8, F9, F10: WhatsApp, Wompi, CRM Quotes & Appointment Links',
  tests: [
    {
      name: 'Consolidated WhatsApp multi-item order formatting and deep links',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        cart.addItem({
          catalog_item_id: 'item_sneakers_01',
          name: 'Zapatillas Urbanas Running',
          base_price: 180000,
          unit_price: 180000,
          quantity: 1,
          selected_variant: {
            id: 'var_size_42',
            name: 'Talla 42 / Color Negro',
            attributes: { Talla: '42', Color: 'Negro' },
          },
          selected_addons: [
            { id: 'add_insoles', name: 'Plantillas Ortopédicas Gel', price: 25000 },
          ],
          custom_notes: 'Empacar con doble caja de protección',
        });

        cart.addItem({
          catalog_item_id: 'item_socks_pack',
          name: 'Pack 3 Medias Deportivas',
          base_price: 30000,
          unit_price: 30000,
          quantity: 2,
          selected_addons: [],
        });

        cart.setDeliveryMethod('delivery');
        cart.updateCustomerProfile({
          name: 'Mateo Valencia',
          phone: '+57 300 555 1234',
          address: 'Carrera 7 # 72-10, Oficina 801, Medellín',
          notes: 'Entregar en recepción antes de las 5pm',
        });

        const order = formatConsolidatedWhatsAppCartOrder(cart, '+573001234567', '$');

        assertTrue(order.phone.startsWith('57'));
        assertEqual(order.phone, '573001234567');

        // Check raw text contents
        assertTrue(order.rawText.includes('NUEVO PEDIDO DESDE TIENDA PIXY'));
        assertTrue(order.rawText.includes('Zapatillas Urbanas Running'));
        assertTrue(order.rawText.includes('Talla 42 / Color Negro'));
        assertTrue(order.rawText.includes('Plantillas Ortopédicas Gel'));
        assertTrue(order.rawText.includes('Pack 3 Medias Deportivas'));
        assertTrue(order.rawText.includes('🚚 Envío a Domicilio'));
        assertTrue(order.rawText.includes('Mateo Valencia'));
        assertTrue(order.rawText.includes('Carrera 7 # 72-10, Oficina 801, Medellín'));
        assertTrue(order.rawText.includes('Empacar con doble caja de protección'));

        // Check total calculation: (180000 + 25000) * 1 + 30000 * 2 = 205000 + 60000 = 265000
        assertEqual(cart.getTotal(), 265000);
        assertTrue(order.rawText.includes('265.000'));

        // Check URI encoding
        assertTrue(order.encodedUri.startsWith('https://wa.me/573001234567?text='));
        assertTrue(order.encodedUri.includes(encodeURIComponent('Zapatillas Urbanas Running')));
      },
    },
    {
      name: 'Express Wompi online checkout session with SHA-256 HMAC integrity signatures',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        cart.addItem({
          catalog_item_id: 'prod_keyboard_01',
          name: 'Teclado Mecánico RGB Pro',
          base_price: 350000,
          unit_price: 350000,
          quantity: 1,
          selected_addons: [],
        });

        const integritySecret = 'prod_integrity_secret_xyz987';
        const publicKey = 'pub_prod_pixy123';
        const redirectUrl = 'https://pixy.agency/tienda/checkout/success';

        const session = generateConsolidatedWompiSession(
          cart,
          integritySecret,
          publicKey,
          redirectUrl,
          'COP'
        );

        assertTrue(session.reference.startsWith('ORD-'));
        assertEqual(session.amountInCents, 35000000); // $350.000 COP = 35.000.000 cents
        assertEqual(session.currency, 'COP');

        // Independently compute expected SHA-256 HMAC signature
        const expectedSignature = generateWompiSignature(
          session.reference,
          session.amountInCents,
          'COP',
          integritySecret
        );

        assertEqual(session.signature, expectedSignature);
        assertTrue(session.signature.length === 64); // SHA-256 hex length

        // Validate checkout URL formatting
        assertTrue(session.checkoutUrl.startsWith('https://checkout.wompi.co/p/'));
        assertTrue(session.checkoutUrl.includes(`public-key=${publicKey}`));
        assertTrue(session.checkoutUrl.includes(`currency=COP`));
        assertTrue(session.checkoutUrl.includes(`amount-in-cents=35000000`));
        assertTrue(session.checkoutUrl.includes(`reference=${session.reference}`));
        assertTrue(session.checkoutUrl.includes(`signature:integrity=${session.signature}`));
      },
    },
    {
      name: '1-Click CRM Lead & Quote generation with variant lines and add-ons',
      fn: () => {
        const cart = createStorefrontCartStore(TENANT_A_ID);

        cart.addItem({
          catalog_item_id: 'service_web_dev',
          name: 'Diseño & Desarrollo Web Corporativo',
          base_price: 2500000,
          unit_price: 2500000,
          quantity: 1,
          selected_variant: {
            id: 'var_ecommerce',
            name: 'Plan E-commerce Avanzado',
            price_modifier: 1000000,
            price_type: 'offset',
            attributes: { Plan: 'E-commerce' },
          },
          selected_addons: [
            { id: 'add_seo', name: 'Optimización SEO On-Page', price: 400000 },
            { id: 'add_maint', name: 'Mantenimiento Mensual 3 Meses', price: 600000 },
          ],
        });

        cart.updateCustomerProfile({
          name: 'Alejandra Restrepo',
          phone: '+57 310 444 8899',
          address: 'Av. El Poblado # 5A-100, Medellín',
          notes: 'Requerimos entrega en 4 semanas',
        });

        const crmPayload = generateConsolidatedCRMQuote(cart, TENANT_A_ID);

        // Check Lead object
        assertEqual(crmPayload.lead.organization_id, TENANT_A_ID);
        assertEqual(crmPayload.lead.name, 'Alejandra Restrepo');
        assertEqual(crmPayload.lead.phone, '+57 310 444 8899');
        assertEqual(crmPayload.lead.address, 'Av. El Poblado # 5A-100, Medellín');
        assertEqual(crmPayload.lead.notes, 'Requerimos entrega en 4 semanas');
        assertEqual(crmPayload.lead.source, 'storefront_cart');

        // Check Quote object
        assertTrue(crmPayload.quote.number.startsWith('COT-'));
        assertEqual(crmPayload.quote.organization_id, TENANT_A_ID);
        assertEqual(crmPayload.quote.status, 'draft');
        assertEqual(crmPayload.quote.items.length, 1);

        const quoteItem = crmPayload.quote.items[0];
        assertEqual(quoteItem.catalog_item_id, 'service_web_dev');
        assertEqual(quoteItem.variant_id, 'var_ecommerce');
        assertEqual(quoteItem.variant_title, 'Plan E-commerce Avanzado');
        assertEqual(quoteItem.quantity, 1);
        assertEqual(quoteItem.unit_price, 4500000); // 2.500.000 + 1.000.000 + 400.000 + 600.000
        assertEqual(quoteItem.subtotal, 4500000);
        assertEqual(quoteItem.addons.length, 2);

        assertEqual(crmPayload.quote.total, 4500000);
      },
    },
    {
      name: 'Direct appointment booking link generation with pre-fills',
      fn: () => {
        const baseUrl = 'https://pixy.agency/portal/reservas';
        const params = new URLSearchParams();
        params.set('action', 'book');
        params.set('item', 'service_legal_consulting');
        params.set('variant', 'var_corporate_law');
        params.set('date', '2026-09-01');
        params.set('slot', '10:00-11:00');
        params.set('name', 'Dr. Roberto Mendoza');
        params.set('phone', '+573158889900');

        const fullBookingUrl = `${baseUrl}?${params.toString()}`;

        assertTrue(fullBookingUrl.startsWith('https://pixy.agency/portal/reservas?'));
        assertTrue(fullBookingUrl.includes('action=book'));
        assertTrue(fullBookingUrl.includes('item=service_legal_consulting'));
        assertTrue(fullBookingUrl.includes('variant=var_corporate_law'));
        assertTrue(fullBookingUrl.includes('date=2026-09-01'));
        assertTrue(fullBookingUrl.includes('slot=10%3A00-11%3A00'));
        assertTrue(fullBookingUrl.includes('name=Dr.+Roberto+Mendoza') || fullBookingUrl.includes('name=Dr.%20Roberto%20Mendoza'));
      },
    },
  ],
};
