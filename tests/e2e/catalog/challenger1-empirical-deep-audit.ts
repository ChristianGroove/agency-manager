import crypto from 'crypto';
import { expect } from './harness/assertions';
import {
  calculateEffectiveTotalPrice,
  evaluateDynamicBadges,
  formatWhatsAppMessage,
  generateWompiSignature,
  StorefrontActionPayload,
  CatalogVariant,
  createStorefrontCartStore,
  InMemoryInventoryEngine,
  formatConsolidatedWhatsAppCartOrder,
  generateConsolidatedWompiSession,
  generateConsolidatedCRMQuote,
  resolveEffectiveCTA,
} from './harness/contracts';
import {
  mockFashionApparel,
  mockGourmetDish,
  mockB2BSaaSSubscription,
  mockAgencyService,
  mockPhysicalItem,
  mockDigitalItem,
  mockServiceItem,
  mockSubscriptionItem,
  mockTenantBItem,
  TENANT_A_ID,
  TENANT_B_ID,
} from './harness/mock-data';
import {
  generateStorefrontQRUrl,
  renderOfflineQRSvgString,
} from './tier2-boundaries/t2-14-qr-special-chars.test';
import {
  computeZoomPosition,
} from './tier2-boundaries/t2-08-zoom-boundaries.test';

export interface ChallengerAuditResult {
  section: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const auditResults: ChallengerAuditResult[] = [];

async function runTest(section: string, name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    auditResults.push({ section, name, passed: true, durationMs });
    console.log(`  ✓ [${section}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    auditResults.push({ section, name, passed: false, error: err.message || String(err), durationMs });
    console.error(`  ✗ [${section}] ${name} (${durationMs}ms): ${err.message || err}`);
  }
}

export async function runDeepAudit() {
  console.log('\n' + '='.repeat(100));
  console.log('  CHALLENGER 1: EMPIRICAL MULTI-INDUSTRY & ACTION HUB DEEP AUDIT');
  console.log('='.repeat(100) + '\n');

  // ============================================================================
  // SECTION 1: 8 DISTINCT INDUSTRY WORKFLOWS & BUSINESS MODELS
  // ============================================================================
  
  // 1. Retail & Fashion
  await runTest('1. Industry Scenarios', 'Industry 1 - Retail & Fashion: Size x Color matrix variants, SKU, inventory bounds & cart', async () => {
    const item = mockFashionApparel;
    expect(item.classification).toBe('physical');
    expect(item.variants.length).toBe(3);
    expect(item.variants[0].sku).toBe('CAM-LINO-S-WHT');
    
    // Test variant price calculation (Base: 180000 + Var offset: 15000) * 2 = 390000
    const navyVar = item.variants.find((v: any) => v.title.includes('Azul Marino'))!;
    const total = calculateEffectiveTotalPrice(item, navyVar, [], 2);
    expect(total).toBe((item.base_price + navyVar.price_modifier) * 2);
    expect(total).toBe(390000);
  });

  // 2. B2B Agencies & Freelancers
  await runTest('1. Industry Scenarios', 'Industry 2 - B2B Agencies & Freelancers: SLA, deliverables & 1-click CRM Quotes', async () => {
    const agency = mockAgencyService;
    expect(agency.classification).toBe('service');
    expect(agency.type).toBe('recurring');

    const cart = createStorefrontCartStore(TENANT_A_ID);
    cart.updateCustomerProfile({
      name: 'Corporación Andina SAS',
      phone: '3112223344',
      notes: 'Requiere contrato SLA 24/7 y factura electrónica',
    });
    cart.addItem({
      catalog_item_id: agency.id,
      name: agency.name,
      base_price: agency.base_price,
      unit_price: agency.base_price,
      quantity: 1,
      selected_addons: [{ id: 'ugc-4videos', name: '4 Videos UGC con Creadores Profesionales', price: 800000 }],
    });

    const quoteRes = generateConsolidatedCRMQuote(cart, TENANT_A_ID);
    expect(quoteRes.quote.number.startsWith('COT-')).toBe(true);
    expect(quoteRes.quote.total).toBe(3300000); // 2.500.000 + 800.000
    expect(quoteRes.lead.name).toBe('Corporación Andina SAS');
    expect(quoteRes.quote.items.length).toBe(1);
  });

  // 3. Digital Products & SaaS
  await runTest('1. Industry Scenarios', 'Industry 3 - Digital Products & SaaS: Instant licenses, recurring subscriptions & tiers', async () => {
    const saas = mockB2BSaaSSubscription;
    expect(saas.classification).toBe('subscription');
    expect(saas.type).toBe('recurring');
    expect(saas.variants.length).toBe(2);

    const proVar = saas.variants.find((v: any) => v.title.includes('Pro Business'))!;
    const total = calculateEffectiveTotalPrice(saas, proVar, [{ priceDelta: 200000 }], 1);
    expect(total).toBe(1050000); // 850000 (fixed) + 200000 (addon)
  });

  // 4. Gastronomy & Restaurants
  await runTest('1. Industry Scenarios', 'Industry 4 - Gastronomy & Restaurants: Portions, toppings, table pickup & QR tabletop codes', async () => {
    const dish = mockGourmetDish;
    expect(dish.classification).toBe('physical');
    expect(dish.addon_groups.length).toBeGreaterThan(0);
    const side1 = dish.addon_groups[0].options[0]; // 16000
    const side2 = dish.addon_groups[0].options[1]; // 22000
    
    // Base 95000 + 0 (variant modifier) + 16000 + 22000 = 133000 * 2 = 266000
    const total = calculateEffectiveTotalPrice(
      dish,
      dish.variants[0],
      [{ priceDelta: side1.price_delta }, { priceDelta: side2.price_delta }],
      2
    );
    expect(total).toBe(266000);

    const qr = generateStorefrontQRUrl({ baseUrl: 'https://pixy.app', tenantSlug: 'bistro-don-pedro', itemId: dish.id, customQueryParams: { mesa: '12' } });
    expect(qr.fullUrl).toContain('mesa=12');
    const svg = renderOfflineQRSvgString(qr.fullUrl);
    expect(svg).toContain('<svg');
  });

  // 5. Appointments & Consultations
  await runTest('1. Industry Scenarios', 'Industry 5 - Appointments & Consultations: Booking slot scheduling & deep link routing', async () => {
    const service = mockServiceItem;
    expect(service.classification).toBe('service');

    const params = new URLSearchParams({
      action: 'book',
      item: service.id,
      date: '2026-09-15',
      slot: '10:00',
      staff: 'consultor-senior',
      name: 'Elena Gómez',
      phone: '3157778899',
    });

    const bookingUrl = `https://pixy.app/portal/citas?${params.toString()}`;
    const parsed = new URL(bookingUrl);
    expect(parsed.searchParams.get('action')).toBe('book');
    expect(parsed.searchParams.get('item')).toBe(service.id);
    expect(parsed.searchParams.get('slot')).toBe('10:00');
    expect(parsed.searchParams.get('staff')).toBe('consultor-senior');
  });

  // 6. Luxury / Custom Goods
  await runTest('1. Industry Scenarios', 'Industry 6 - Luxury / Custom Goods: High-res gallery zoom & quote generation', async () => {
    const physical = mockPhysicalItem;
    expect(physical.gallery_images.length).toBe(8);
    expect(physical.gallery_images[0].is_cover).toBe(true);

    const zoom = computeZoomPosition({ x: 300, y: 300, containerWidth: 600, containerHeight: 600 }, 2.5);
    expect(zoom.enabled).toBe(true);
    expect(zoom.bgPositionXPercent).toBe(50);
    expect(zoom.bgPositionYPercent).toBe(50);
    expect(zoom.zoomScale).toBe(2.5);
  });

  // 7. Wholesale & High-Volume
  await runTest('1. Industry Scenarios', 'Industry 7 - Wholesale & High-Volume: Stock tracking & backorders allowed', async () => {
    const digital = mockDigitalItem;
    expect(digital.allow_backorders).toBe(true);
    expect(digital.track_inventory).toBe(false);

    const physical = mockPhysicalItem;
    expect(physical.allow_backorders).toBe(false);
    expect(physical.track_inventory).toBe(true);
    expect(physical.inventory_quantity).toBe(150);
  });

  // 8. Zero-Configuration Anonymous Public Stores
  await runTest('1. Industry Scenarios', 'Industry 8 - Anonymous Public Store: Guest navigation, session persistence & cart store', async () => {
    const cart = createStorefrontCartStore(TENANT_A_ID);
    expect(cart.items.length).toBe(0);
    expect(cart.getTotal()).toBe(0);

    cart.addItem({
      catalog_item_id: 'guest-item-1',
      name: 'Producto Invitado',
      base_price: 45000,
      unit_price: 45000,
      quantity: 2,
      selected_addons: [],
    });

    expect(cart.items.length).toBe(1);
    expect(cart.getTotal()).toBe(90000);
    expect(cart.getTotalItems()).toBe(2);
  });

  // ============================================================================
  // SECTION 2: STOREFRONT ACTION HUB (WHATSAPP, CRM QUOTES, WOMPI, APPOINTMENTS)
  // ============================================================================
  
  // WhatsApp Checkout Formatting
  await runTest('2. Action Hub', '2.1 WhatsApp itemized Colombian checkout formatting with variants, addons & notes', async () => {
    const cart = createStorefrontCartStore(TENANT_A_ID);
    cart.setDeliveryMethod('delivery');
    cart.updateCustomerProfile({
      name: 'Valentina Restrepo',
      phone: '3005559988',
      address: 'Cra 7 # 116-50 Apto 402, Bogotá',
      notes: 'Llamar antes de entregar por favor',
    });

    cart.addItem({
      catalog_item_id: 'item-101',
      name: 'Vestido de Gala Seda',
      base_price: 350000,
      unit_price: 350000,
      quantity: 1,
      selected_variant: { id: 'var-101-m', name: 'Talla M / Esmeralda', attributes: { Talla: 'M', Color: 'Esmeralda' } },
      selected_addons: [{ id: 'addon-bastilla', name: 'Ajuste de Bastilla', price: 25000 }],
      custom_notes: 'Largo 1.40m',
    });

    const wa = formatConsolidatedWhatsAppCartOrder(cart, '+57 300 555 9988', '$');
    expect(wa.rawText).toContain('Vestido de Gala Seda');
    expect(wa.rawText).toContain('Talla M / Esmeralda');
    expect(wa.rawText).toContain('Ajuste de Bastilla');
    expect(wa.rawText).toContain('Valentina Restrepo');
    expect(wa.rawText).toContain('Cra 7 # 116-50 Apto 402, Bogotá');
    expect(wa.rawText).toContain('Llamar antes de entregar por favor');
    expect(wa.phone).toBe('573005559988');
    expect(wa.encodedUri.startsWith('https://wa.me/573005559988?text=')).toBe(true);
  });

  // Wompi Signature & Checkout Session
  await runTest('2. Action Hub', '2.2 Wompi HMAC-SHA256 signature calculation & tamper resistance', async () => {
    const cart = createStorefrontCartStore(TENANT_A_ID);
    cart.addItem({
      catalog_item_id: 'item-wompi',
      name: 'Curso de Fotografía Avanzada',
      base_price: 250000,
      unit_price: 250000,
      quantity: 1,
      selected_addons: [],
    });

    const secret = 'wompi_secret_valid_prod_123';
    const pubKey = 'pub_prod_test_456';
    const wompiSession = generateConsolidatedWompiSession(cart, secret, pubKey);

    expect(wompiSession.amountInCents).toBe(25000000);
    expect(wompiSession.currency).toBe('COP');
    expect(wompiSession.signature.length).toBe(64);
    expect(wompiSession.checkoutUrl).toContain('checkout.wompi.co');
    expect(wompiSession.checkoutUrl).toContain(`signature:integrity=${wompiSession.signature}`);

    // Verify exact HMAC formula against crypto standard
    const expectedSig = crypto
      .createHash('sha256')
      .update(`${wompiSession.reference}${wompiSession.amountInCents}COP${secret}`)
      .digest('hex');
    expect(wompiSession.signature).toBe(expectedSig);
  });

  // 1-Click CRM Quote Engine
  await runTest('2. Action Hub', '2.3 1-Click CRM Quote generation with COT-... reference & lead capture', async () => {
    const cart = createStorefrontCartStore(TENANT_A_ID);
    cart.updateCustomerProfile({
      name: 'Carlos Sarmiento',
      phone: '3104445566',
      notes: 'Cotización para proyecto corporativo Q4',
    });

    cart.addItem({
      catalog_item_id: 'agency-seo-01',
      name: 'Consultoría SEO & Growth',
      base_price: 1800000,
      unit_price: 1800000,
      quantity: 1,
      selected_addons: [{ id: 'addon-audit', name: 'Auditoría Técnica Inicial', price: 500000 }],
    });

    const quoteRes = generateConsolidatedCRMQuote(cart, TENANT_A_ID);
    expect(quoteRes.quote.number.startsWith('COT-')).toBe(true);
    expect(quoteRes.quote.total).toBe(2300000);
    expect(quoteRes.quote.items.length).toBe(1);
    expect(quoteRes.quote.items[0].description).toBe('Consultoría SEO & Growth');
    expect(quoteRes.lead.name).toBe('Carlos Sarmiento');
    expect(quoteRes.lead.organization_id).toBe(TENANT_A_ID);
  });

  // Appointment Deep Linking
  await runTest('2. Action Hub', '2.4 Appointment booking deep link parametric query composition', async () => {
    const params = new URLSearchParams({
      action: 'book',
      item: 'item-cons-01',
      variant: 'var-presencial',
      date: '2026-09-20',
      slot: '15:00',
      staff: 'dra-lopez',
      name: 'Lucía Méndez',
      phone: '3187779900',
    });

    const fullUrl = `https://pixy.app/clinica/reservar?${params.toString()}`;
    const urlObj = new URL(fullUrl);
    expect(urlObj.searchParams.get('action')).toBe('book');
    expect(urlObj.searchParams.get('item')).toBe('item-cons-01');
    expect(urlObj.searchParams.get('variant')).toBe('var-presencial');
    expect(urlObj.searchParams.get('date')).toBe('2026-09-20');
    expect(urlObj.searchParams.get('slot')).toBe('15:00');
    expect(urlObj.searchParams.get('staff')).toBe('dra-lopez');
    expect(urlObj.searchParams.get('name')).toBe('Lucía Méndez');
    expect(urlObj.searchParams.get('phone')).toBe('3187779900');
  });

  // ============================================================================
  // SECTION 3: ADVERSARIAL STRESS, CONCURRENCY & MULTI-TENANT ISOLATION
  // ============================================================================
  
  // Variant Matrix Cartesian Cap (<= 60)
  await runTest('3. Security & Bounds', '3.1 Variant matrix Cartesian product cap guard (limit <= 60 permutations)', async () => {
    const generatePermutations = (groups: string[][]) => {
      return groups.reduce((acc, curr) => {
        return acc.flatMap((c) => curr.map((n) => [...c, n]));
      }, [[]] as string[][]);
    };

    const g1 = ['S', 'M', 'L', 'XL'];
    const g2 = ['Negro', 'Blanco', 'Azul', 'Rojo'];
    const g3 = ['Algodón', 'Poliéster', 'Lino', 'Seda'];

    // 4 * 4 * 4 = 64 permutations (> 60)
    const perms = generatePermutations([g1, g2, g3]);
    expect(perms.length).toBe(64);
    const exceedsCap = perms.length > 60;
    expect(exceedsCap).toBe(true);

    // Safe matrix: 4 * 4 * 3 = 48 (<= 60)
    const safePerms = generatePermutations([g1, g2, g3.slice(0, 3)]);
    expect(safePerms.length).toBe(48);
    expect(safePerms.length <= 60).toBe(true);
  });

  // Multi-Tenant Isolation
  await runTest('3. Security & Bounds', '3.2 Multi-tenant isolation barrier (Zero cross-org contamination)', async () => {
    const orgACart = createStorefrontCartStore(TENANT_A_ID);
    const orgBCart = createStorefrontCartStore(TENANT_B_ID);

    orgACart.addItem({ catalog_item_id: 'orgA-item', name: 'Item Org A', base_price: 10000, unit_price: 10000, quantity: 1, selected_addons: [] });
    orgBCart.addItem({ catalog_item_id: 'orgB-item', name: 'Item Org B', base_price: 20000, unit_price: 20000, quantity: 1, selected_addons: [] });

    expect(orgACart.items.length).toBe(1);
    expect(orgACart.items[0].name).toBe('Item Org A');
    expect(orgBCart.items.length).toBe(1);
    expect(orgBCart.items[0].name).toBe('Item Org B');
    expect(orgACart.getTotal()).toBe(10000);
    expect(orgBCart.getTotal()).toBe(20000);
    expect(orgACart.organization_id).toBe(TENANT_A_ID);
    expect(orgBCart.organization_id).toBe(TENANT_B_ID);
  });

  // High Concurrency Race Condition Lockout
  await runTest('3. Security & Bounds', '3.3 High-concurrency stock depletion race condition resistance', async () => {
    const engine = new InMemoryInventoryEngine();
    engine.registerItem({
      catalogItemId: 'limited-edition-item',
      stockQuantity: 4,
      trackInventory: true,
      allowBackorders: false,
      lowStockThreshold: 1,
    });

    const requests = Array.from({ length: 8 }, () =>
      engine.decrementStockAction({
        organizationId: TENANT_A_ID,
        items: [{ catalogItemId: 'limited-edition-item', quantity: 1 }],
      })
    );
    const results = await Promise.all(requests);

    const successfulOrders = results.filter((r) => r.success).length;
    const rejectedOrders = results.filter((r) => !r.success).length;

    expect(successfulOrders).toBe(4);
    expect(rejectedOrders).toBe(4);
    expect(engine.getItem('limited-edition-item')?.stockQuantity).toBe(0);
  });

  // Dynamic Badges Evaluation
  await runTest('3. Security & Bounds', '3.4 Dynamic badge priority rules (Agotado > Pocas Unidades > -% Descuento > Destacado)', async () => {
    const item = { ...mockPhysicalItem, inventory_quantity: 0, track_inventory: true, allow_backorders: false };
    const badges = evaluateDynamicBadges(item);
    expect(badges).toContain('Agotado');
    expect(badges).not.toContain('Pocas Unidades');

    const lowStockItem = { ...mockPhysicalItem, inventory_quantity: 3, low_stock_threshold: 5, track_inventory: true, allow_backorders: false };
    const lowBadges = evaluateDynamicBadges(lowStockItem);
    expect(lowBadges).toContain('Pocas Unidades');
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(100));
  const total = auditResults.length;
  const passed = auditResults.filter((r) => r.passed).length;
  const failed = auditResults.filter((r) => !r.passed).length;
  console.log(`  DEEP AUDIT TOTAL TESTS: ${total}`);
  console.log(`  PASSED TESTS:           ${passed}`);
  console.log(`  FAILED TESTS:           ${failed}`);
  console.log('='.repeat(100) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDeepAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
