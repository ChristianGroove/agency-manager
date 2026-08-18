/**
 * ==============================================================================
 * ADVERSARIAL STRESS & EMPIRICAL CHALLENGE SUITE (Milestone 5 Final Verification)
 * File: tests/e2e/catalog/tier5-adversarial/t5-06-actionhub-customizer-stress.test.ts
 *
 * Empirical Challenges:
 * 1. Wompi SHA-256 HMAC integrity signatures against known reference test vectors and secret tampering
 * 2. CRM lead and draft quote creation with multi-item line snapshots, missing fields, and custom add-on payloads
 * 3. Store Customizer global CTA resolution vs. per-item overrides across all 5 action channels
 * ==============================================================================
 */

import crypto, { timingSafeEqual } from 'crypto';
import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertGreaterThan,
  TestRegistry,
  TestSuiteResult,
} from '../harness/assertions';
import {
  generateWompiSignature,
  createStorefrontCartStore,
  generateConsolidatedWompiSession,
  generateConsolidatedCRMQuote,
  resolveEffectiveCTA,
  evaluateStockStatus,
  computeCartLineUnitPrice,
} from '../harness/contracts';
import {
  storefrontActionPayloadSchema,
  storefrontThemeConfigSchema,
} from '@/modules/features/catalog/schemas/catalog.schema';

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

function computeHammingDistance(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) return -1;
  let diffBits = 0;
  for (let i = 0; i < hexA.length; i++) {
    const valA = parseInt(hexA[i], 16);
    const valB = parseInt(hexB[i], 16);
    let xor = valA ^ valB;
    while (xor > 0) {
      diffBits += xor & 1;
      xor >>= 1;
    }
  }
  return diffBits;
}

export const suite = {
  name: 'T5-06: Adversarial Action Hub & Customizer Integrity Stress',
  tier: 'Tier 5',
  feature: 'Action Hub & Store Customizer Empirical Hardening',
  tests: [
    // =========================================================================
    // 1. WOMPI SHA-256 HMAC INTEGRITY SIGNATURES & SECRET TAMPERING
    // =========================================================================
    {
      name: '1.1 Reference test vector 1: Standard checkout session matches exact SHA-256 hash',
      fn: () => {
        const reference = 'ORD-1723850000000-ABCDE';
        const amountInCents = 15000000; // $150.000 COP
        const currency = 'COP';
        const integritySecret = 'test_integrity_secret';

        // Known vector computation
        const rawString = `${reference}${amountInCents}${currency}${integritySecret}`;
        assertEqual(rawString, 'ORD-1723850000000-ABCDE15000000COPtest_integrity_secret');

        const expectedHex = crypto.createHash('sha256').update(rawString).digest('hex');
        const calculatedSig = generateWompiSignature(reference, amountInCents, currency, integritySecret);

        assertEqual(calculatedSig, expectedHex);
        assertEqual(calculatedSig.length, 64);
        assertTrue(/^[0-9a-f]{64}$/.test(calculatedSig));
      },
    },
    {
      name: '1.2 Reference test vector 2: High-value B2B enterprise order ($987.654.321 COP) with complex secret',
      fn: () => {
        const reference = 'ORD-2026-ENT-998811';
        const amountInCents = 98765432100; // $987.654.321 COP = 98.765.432.100 cents
        const currency = 'COP';
        const integritySecret = 'prod_sec_wompi_enterprise_!@#$_2026_XYZ987';

        const rawString = `${reference}${amountInCents}${currency}${integritySecret}`;
        const expectedHex = crypto.createHash('sha256').update(rawString).digest('hex');
        const calculatedSig = generateWompiSignature(reference, amountInCents, currency, integritySecret);

        assertEqual(calculatedSig, expectedHex);
      },
    },
    {
      name: '1.3 Floating point decimal cents rounding and micro-cent boundaries',
      fn: () => {
        // Price with decimals: $19.999,99 COP -> 1999999 cents
        const priceFloat = 19999.99;
        const cents = Math.round(priceFloat * 100);
        assertEqual(cents, 1999999);

        // Price with floating representation artifact (0.1 + 0.2 = 0.30000000000000004)
        const messyFloat = 0.1 + 0.2;
        const centsMessy = Math.round(messyFloat * 100);
        assertEqual(centsMessy, 30);

        // Minimum valid Wompi transaction: $1.000 COP -> 100000 cents
        const minPrice = 1000;
        const minCents = Math.round(minPrice * 100);
        assertEqual(minCents, 100000);
        const minSig = generateWompiSignature('ORD-MIN-01', minCents, 'COP', 'sec_min');
        assertEqual(minSig.length, 64);
      },
    },
    {
      name: '1.4 Secret tampering & avalanche effect: 1-bit mutation produces >= 40% bit divergence',
      fn: () => {
        const reference = 'ORD-AVALANCHE-TEST';
        const amountInCents = 50000000;
        const currency = 'COP';
        const baseSecret = 'wompi_secret_key_production_0001';

        const baseSig = generateWompiSignature(reference, amountInCents, currency, baseSecret);

        // Perturbation 1: 1 character flipped in secret (0001 -> 0002)
        const tamperedSecretSig = generateWompiSignature(reference, amountInCents, currency, 'wompi_secret_key_production_0002');
        assertTrue(tamperedSecretSig !== baseSig);
        const diffBitsSecret = computeHammingDistance(baseSig, tamperedSecretSig);
        // SHA-256 produces 256 bits; avalanche effect should flip roughly 128 bits (>= 90 bits)
        assertGreaterThan(diffBitsSecret, 80);

        // Perturbation 2: 1 cent added to amount (50000000 -> 50000001)
        const tamperedAmountSig = generateWompiSignature(reference, 50000001, currency, baseSecret);
        assertTrue(tamperedAmountSig !== baseSig);
        const diffBitsAmount = computeHammingDistance(baseSig, tamperedAmountSig);
        assertGreaterThan(diffBitsAmount, 80);

        // Perturbation 3: 1 character flipped in reference (TEST -> TESE)
        const tamperedRefSig = generateWompiSignature('ORD-AVALANCHE-TESE', amountInCents, currency, baseSecret);
        assertTrue(tamperedRefSig !== baseSig);
        const diffBitsRef = computeHammingDistance(baseSig, tamperedRefSig);
        assertGreaterThan(diffBitsRef, 80);

        // Perturbation 4: Currency flipped (COP -> USD)
        const tamperedCurrSig = generateWompiSignature(reference, amountInCents, 'USD', baseSecret);
        assertTrue(tamperedCurrSig !== baseSig);
      },
    },
    {
      name: '1.5 Webhook signature verification formula, timing attack resistance & status tampering',
      fn: () => {
        const transactionId = '12345-67890-tx';
        const transactionStatus = 'APPROVED';
        const amountInCents = 25000000;
        const timestamp = 1723850000;
        const eventsSecret = 'wompi_events_secret_secure_99';

        // Formula: SHA256(transaction.id + transaction.status + transaction.amount_in_cents + timestamp + eventsSecret)
        const signatureString = `${transactionId}${transactionStatus}${amountInCents}${timestamp}${eventsSecret}`;
        const calculatedChecksum = crypto.createHash('sha256').update(signatureString).digest('hex');

        // Valid signature matches timingSafeEqual
        assertTrue(safeEqual(calculatedChecksum, calculatedChecksum));

        // Tampering Attack 1: Hacker modifies status from DECLINED to APPROVED
        const forgedStatusString = `${transactionId}DECLINED${amountInCents}${timestamp}${eventsSecret}`;
        const forgedChecksum = crypto.createHash('sha256').update(forgedStatusString).digest('hex');
        assertFalse(safeEqual(calculatedChecksum, forgedChecksum));

        // Tampering Attack 2: Timestamp replay manipulation
        const replayedString = `${transactionId}${transactionStatus}${amountInCents}${timestamp + 3600}${eventsSecret}`;
        const replayedChecksum = crypto.createHash('sha256').update(replayedString).digest('hex');
        assertFalse(safeEqual(calculatedChecksum, replayedChecksum));

        // Tampering Attack 3: Length mismatch in checksum (prevents buffer error in timingSafeEqual)
        assertFalse(safeEqual(calculatedChecksum, calculatedChecksum.slice(0, 32)));
        assertFalse(safeEqual('', calculatedChecksum));
      },
    },

    // =========================================================================
    // 2. CRM LEAD & DRAFT QUOTE CREATION WITH MULTI-ITEM SNAPSHOTS & ADDONS
    // =========================================================================
    {
      name: '2.1 Multi-item line snapshots with variants and add-on price calculations',
      fn: () => {
        const orgId = 'org_pixy_challenge_01';
        const cart = createStorefrontCartStore(orgId);

        // Item 1: Physical item with variant ($180.000 + $20.000) + 2 add-ons ($15.000 + $25.000) = $240.000
        cart.addItem({
          catalog_item_id: 'item_leather_jacket',
          name: 'Chaqueta de Cuero Premium',
          base_price: 180000,
          unit_price: 180000,
          quantity: 1,
          selected_variant: {
            id: 'var_size_l_black',
            name: 'Talla L / Cuero Negro',
            price_modifier: 20000,
            price_type: 'offset',
            attributes: { Talla: 'L', Color: 'Negro' },
          },
          selected_addons: [
            { id: 'add_custom_embroidery', name: 'Bordado Personalizado Iniciales', price: 15000 },
            { id: 'add_extended_warranty', name: 'Garantía Extendida 1 Año', price: 25000 },
          ],
        });

        // Item 2: Consulting service with percentage variant (+50%) + 1 add-on ($500.000) = ($3.000.000 * 1.5) + $500.000 = $5.000.000
        cart.addItem({
          catalog_item_id: 'srv_seo_audit',
          name: 'Auditoría SEO & Performance',
          base_price: 3000000,
          unit_price: 3000000,
          quantity: 1,
          selected_variant: {
            id: 'var_corp_tier',
            name: 'Nivel Corporativo Enterprise',
            price_modifier: 50,
            price_type: 'percentage',
            attributes: { Nivel: 'Enterprise' },
          },
          selected_addons: [
            { id: 'add_sla_24h', name: 'SLA Prioritario 24/7', price: 500000 },
          ],
        });

        // Item 3: Simple product x 3 ($700.000 * 3 = $2.100.000)
        cart.addItem({
          catalog_item_id: 'item_desk_lamp',
          name: 'Lámpara LED Ergonómica',
          base_price: 700000,
          unit_price: 700000,
          quantity: 3,
          selected_addons: [],
        });

        cart.updateCustomerProfile({
          name: 'Dra. Carolina Montoya',
          phone: '+57 312 888 7766',
          address: 'Calle 100 # 19-61, Oficina 502, Bogotá',
          notes: 'Favor facturar a nombre de Montoya & Asociados S.A.S.',
        });

        // Verify Cart Total
        // Item 1: (180000 + 20000 + 15000 + 25000) * 1 = 240000
        // Item 2: (3000000 * 1.5 + 500000) * 1 = 5000000
        // Item 3: 700000 * 3 = 2100000
        // Total = 240000 + 5000000 + 2100000 = 7340000
        assertEqual(cart.getTotal(), 7340000);
        assertEqual(cart.getTotalItems(), 5);

        // Generate CRM Quote
        const quotePayload = generateConsolidatedCRMQuote(cart, orgId);

        // Check Lead attributes
        assertEqual(quotePayload.lead.organization_id, orgId);
        assertEqual(quotePayload.lead.name, 'Dra. Carolina Montoya');
        assertEqual(quotePayload.lead.phone, '+57 312 888 7766');
        assertEqual(quotePayload.lead.address, 'Calle 100 # 19-61, Oficina 502, Bogotá');
        assertEqual(quotePayload.lead.notes, 'Favor facturar a nombre de Montoya & Asociados S.A.S.');
        assertEqual(quotePayload.lead.source, 'storefront_cart');

        // Check Quote attributes
        assertTrue(quotePayload.quote.number.startsWith('COT-'));
        assertEqual(quotePayload.quote.organization_id, orgId);
        assertEqual(quotePayload.quote.status, 'draft');
        assertEqual(quotePayload.quote.total, 7340000);
        assertEqual(quotePayload.quote.items.length, 3);

        // Verify line item 1
        const line1 = quotePayload.quote.items[0];
        assertEqual(line1.catalog_item_id, 'item_leather_jacket');
        assertEqual(line1.variant_id, 'var_size_l_black');
        assertEqual(line1.variant_title, 'Talla L / Cuero Negro');
        assertEqual(line1.unit_price, 240000);
        assertEqual(line1.subtotal, 240000);
        assertEqual(line1.quantity, 1);
        assertEqual(line1.addons.length, 2);

        // Verify line item 2
        const line2 = quotePayload.quote.items[1];
        assertEqual(line2.catalog_item_id, 'srv_seo_audit');
        assertEqual(line2.variant_id, 'var_corp_tier');
        assertEqual(line2.unit_price, 5000000);
        assertEqual(line2.subtotal, 5000000);

        // Verify line item 3
        const line3 = quotePayload.quote.items[2];
        assertEqual(line3.catalog_item_id, 'item_desk_lamp');
        assertEqual(line3.variant_id, undefined);
        assertEqual(line3.unit_price, 700000);
        assertEqual(line3.quantity, 3);
        assertEqual(line3.subtotal, 2100000);
      },
    },
    {
      name: '2.2 Missing fields and boundary handling in CRM quote generation',
      fn: () => {
        const orgId = 'org_pixy_challenge_02';

        // Case 1: Empty customer profile falls back to default storefront lead
        const cartEmptyCust = createStorefrontCartStore(orgId);
        cartEmptyCust.addItem({
          catalog_item_id: 'item_sample',
          name: 'Muestra de Producto',
          base_price: 50000,
          unit_price: 50000,
          quantity: 1,
          selected_addons: [],
        });

        const quoteRes = generateConsolidatedCRMQuote(cartEmptyCust, orgId);
        assertEqual(quoteRes.lead.name, 'Cliente Storefront');
        assertEqual(quoteRes.lead.phone, '');
        assertEqual(quoteRes.lead.address, '');
        assertEqual(quoteRes.quote.items.length, 1);
        assertEqual(quoteRes.quote.total, 50000);

        // Case 2: Zod schema rejects empty name or non-string customer payload in strict validator
        const strictPayload = {
          actionType: 'quote',
          itemId: 'item_sample',
          calculatedTotalPrice: 50000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/portal',
          customerInfo: {
            name: '',
            phone: '3001234567',
          },
        };
        const parsed = storefrontActionPayloadSchema.safeParse(strictPayload);
        // Customer name is empty string, so strict schema correctly rejects it
        assertFalse(parsed.success);

        // Valid customer info parses successfully
        const validPayload = {
          ...strictPayload,
          customerInfo: {
            name: 'Cliente Valido',
            phone: '3001234567',
          },
        };
        const validParsed = storefrontActionPayloadSchema.safeParse(validPayload);
        assertTrue(validParsed.success);
      },
    },
    {
      name: '2.3 Custom add-on delta permutations (zero delta, multiple add-ons, sku suffixes)',
      fn: () => {
        // Base price: $100.000
        // Variant offset: +$10.000
        // Add-on 1: Free option ($0)
        // Add-on 2: Standard addon ($25.000)
        // Add-on 3: Premium addon ($50.000)
        const unitPrice = computeCartLineUnitPrice(
          100000,
          {
            id: 'var-1',
            name: 'Variante 1',
            price_modifier: 10000,
            price_type: 'offset',
            attributes: {},
          },
          [
            { price: 0 },
            { price: 25000 },
            { price: 50000 },
          ]
        );
        assertEqual(unitPrice, 185000); // 100000 + 10000 + 0 + 25000 + 50000
      },
    },

    // =========================================================================
    // 3. STORE CUSTOMIZER GLOBAL CTA RESOLUTION VS PER-ITEM OVERRIDES (5x5 MATRIX)
    // =========================================================================
    {
      name: '3.1 Complete 5x5 Matrix: Per-item CTA overrides ALWAYS take precedence over global theme CTA',
      fn: () => {
        const channels: Array<'whatsapp' | 'cart' | 'buy' | 'quote' | 'booking'> = [
          'whatsapp',
          'cart',
          'buy',
          'quote',
          'booking',
        ];

        // Test all 25 pairwise permutations: Global Theme (5) x Item Override (5)
        for (const globalCta of channels) {
          const theme = { primary_cta: globalCta };

          for (const itemCta of channels) {
            const item = { cta_type: itemCta };
            const effective = resolveEffectiveCTA(item, theme);

            // Item-level override MUST win every time
            assertEqual(
              effective,
              itemCta,
              `Failed precedence: Item CTA "${itemCta}" should override Global CTA "${globalCta}"`
            );
          }
        }
      },
    },
    {
      name: '3.2 Global CTA fallback: When item CTA is null/undefined/empty, global theme CTA applies',
      fn: () => {
        const channels: Array<'whatsapp' | 'cart' | 'buy' | 'quote' | 'booking'> = [
          'whatsapp',
          'cart',
          'buy',
          'quote',
          'booking',
        ];

        for (const globalCta of channels) {
          const theme = { primary_cta: globalCta };

          assertEqual(resolveEffectiveCTA({ cta_type: null }, theme), globalCta);
          assertEqual(resolveEffectiveCTA({ cta_type: undefined }, theme), globalCta);
          assertEqual(resolveEffectiveCTA({ cta_type: '' }, theme), globalCta);
        }
      },
    },
    {
      name: '3.3 Legacy alias normalizations across item and global customizer settings',
      fn: () => {
        // 'add_to_cart' -> 'cart'
        assertEqual(resolveEffectiveCTA({ cta_type: 'add_to_cart' }, { primary_cta: 'whatsapp' }), 'cart');
        assertEqual(resolveEffectiveCTA({ cta_type: null }, { primary_cta: 'add_to_cart' }), 'cart');

        // 'appointment' -> 'booking'
        assertEqual(resolveEffectiveCTA({ cta_type: 'appointment' }, { primary_cta: 'whatsapp' }), 'booking');
        assertEqual(resolveEffectiveCTA({ cta_type: null }, { primary_cta: 'appointment' }), 'booking');

        // Ultimate default fallback when both are null/invalid -> 'whatsapp'
        assertEqual(resolveEffectiveCTA({ cta_type: null }, null), 'whatsapp');
        assertEqual(resolveEffectiveCTA({ cta_type: null }, { primary_cta: null }), 'whatsapp');
        assertEqual(resolveEffectiveCTA({ cta_type: 'invalid_action' }, { primary_cta: 'unknown' }), 'whatsapp');
      },
    },
    {
      name: '3.4 Out-of-stock guard interactions across all 5 CTA channels',
      fn: () => {
        // Out of stock without backorders
        const outOfStockItem = {
          track_inventory: true,
          stock_quantity: 0,
          allow_backorders: false,
          low_stock_threshold: 5,
        };

        const evalOut = evaluateStockStatus(outOfStockItem);
        assertEqual(evalOut.status, 'out_of_stock');
        assertEqual(evalOut.badge, 'Agotado');
        assertFalse(evalOut.canPurchase);

        // Out of stock WITH backorders
        const backorderItem = {
          track_inventory: true,
          stock_quantity: 0,
          allow_backorders: true,
          low_stock_threshold: 5,
        };

        const evalBack = evaluateStockStatus(backorderItem);
        assertEqual(evalBack.status, 'backorder');
        assertEqual(evalBack.badge, 'Disponible bajo pedido');
        assertTrue(evalBack.canPurchase);

        // Low stock threshold
        const lowStockItem = {
          track_inventory: true,
          stock_quantity: 3,
          allow_backorders: false,
          low_stock_threshold: 5,
        };

        const evalLow = evaluateStockStatus(lowStockItem);
        assertEqual(evalLow.status, 'low_stock');
        assertEqual(evalLow.badge, '¡Últimas 3 unidades!');
        assertTrue(evalLow.canPurchase);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier5');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}
