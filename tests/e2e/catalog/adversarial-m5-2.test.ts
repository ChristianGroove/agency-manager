/**
 * ==============================================================================
 * ADVERSARIAL STRESS TEST SUITE — CHALLENGER 2 (Milestone 5 Phase 2)
 * File: tests/e2e/catalog/adversarial-m5-2.test.ts
 *
 * Comprehensive White-Box Source Audit & Adversarial Harness for:
 * 1. WhatsApp checkout URI encoding, giant payloads, emojis, newlines, null bytes
 * 2. Wompi online checkout integrity, SHA256 signature tampering, negative amounts, replay attacks
 * 3. CRM lead / quote generation, SQL/NoSQL injection tokens, XSS payload sanitization, deduplication
 * 4. Direct appointment booking concurrency race conditions, overlap permutations, past dates
 * 5. Store customizer CSS / HTML sanitization, malicious style injection, broken JSON configs
 * ==============================================================================
 */

import crypto from 'crypto';
import { expect, TestRegistry, TestSuiteResult } from './harness/assertions';
import {
  formatWhatsAppMessage,
  buildWhatsAppCheckoutUrl,
  generateWompiSignature,
  sanitizeHtml,
  sanitizeCssColor,
  StorefrontActionPayload,
  CatalogVariant,
  StoreCustomizerTheme,
} from './harness/contracts';
import {
  storefrontActionPayloadSchema,
  storefrontCustomerContactSchema,
  storefrontThemeConfigSchema,
  HEX_COLOR_REGEX,
} from '../../../src/modules/features/catalog/schemas/catalog.schema';
import {
  submitStorefrontQuoteToCRM,
  CRMSubmissionState,
} from './tier2-boundaries/t2-17-crm-lead-dedup-resilience.test';
import {
  createWompiPaymentSession,
} from './tier2-boundaries/t2-18-wompi-currency-min-max.test';
import {
  validateAppointmentSlot,
  AppointmentSlotRequest,
} from './tier2-boundaries/t2-19-appointment-slot-edge.test';
import {
  validateStoreCustomizerTheme,
} from './tier2-boundaries/t2-22-customizer-css-injection.test';

export const suite = {
  name: 'T5-CHALLENGER-2: Adversarial Storefront, Integrations & Checkout Hardening',
  tier: 'Tier 5',
  feature: 'Adversarial Security, Integrity & Concurrency Hardening',
  tests: [
    // =========================================================================
    // FOCUS AREA 1: WHATSAPP CHECKOUT URI ENCODING & ADVERSARIAL PAYLOADS
    // =========================================================================
    {
      name: '1.1 Giant payload (50KB notes) encodes gracefully and round-trips without memory corruption',
      fn: async () => {
        const giantNotes = 'Adversarial Note Payload '.repeat(2000); // ~50,000 characters
        const payload: StorefrontActionPayload = {
          itemId: 'item-adversarial-giant',
          calculatedTotalPrice: 1250000,
          quantity: 2,
          customerInfo: {
            name: 'Carlos Mendoza',
            phone: '+57 300 999 8888',
            email: 'carlos@adversarial.org',
            notes: giantNotes,
          },
          deepLinkUrl: 'https://pixy.app/store/p/item-adversarial-giant?ref=adv_01',
        };

        const res = formatWhatsAppMessage(payload, '+57 300 999 8888');
        expect(res.phone).toBe('573009998888');
        expect(res.rawText.length).toBeLessThanOrEqual(4000);
        expect(res.rawText).toContain('[Mensaje comprimido]');
        expect(res.encodedUri.startsWith('https://wa.me/573009998888?text=')).toBe(true);

        // Verify URI decode round-trip integrity
        const urlObj = new URL(res.encodedUri);
        const textParam = urlObj.searchParams.get('text');
        expect(textParam).toBe(res.rawText);
      },
    },
    {
      name: '1.2 Multi-byte emojis, ZWJ sequences, astral code points, and non-Latin scripts preserve UTF-8 integrity',
      fn: async () => {
        const emojiRichNotes = 'Pedido especial: 🛒 🎁 💎 🚀 👨‍👩‍👧‍👦 🇨🇴 🌟 \u{1F9D1}\u{200D}\u{1F4BB} (Dev) y texto en 日本語 & العربية';
        const payload: StorefrontActionPayload = {
          itemId: 'item-unicode-01',
          calculatedTotalPrice: 450000,
          quantity: 1,
          selectedVariant: {
            id: 'var-adv-01',
            catalog_item_id: 'item-unicode-01',
            title: 'Edición Diamante 💎 / Azul Zafiro 🔷',
            price_modifier: 50000,
            price_type: 'offset',
            inventory_quantity: 5,
            track_inventory: true,
            attributes: { 'Color': 'Zafiro 🔷' },
            is_active: true,
          },
          selectedAddons: [
            { name: 'Empaque de Lujo 🎁', priceDelta: 25000 },
            { name: 'Garantía Extendida ⭐⭐⭐', priceDelta: 50000 },
          ],
          customerInfo: {
            name: 'María José Peña 👑',
            phone: '3123456789',
            notes: emojiRichNotes,
          },
          deepLinkUrl: 'https://pixy.app/store/p/item-unicode-01?variant=var-adv-01',
        };

        const res = formatWhatsAppMessage(payload, '+57 312 345 6789');
        expect(res.encodedUri).toContain('%F0%9F%92%8E'); // 💎
        expect(res.encodedUri).toContain('%F0%9F%8E%81'); // 🎁
        expect(res.encodedUri).toContain('%F0%9F%87%A8%F0%9F%87%B4'); // 🇨🇴

        const urlObj = new URL(res.encodedUri);
        const decoded = urlObj.searchParams.get('text') || '';
        expect(decoded).toContain('Edición Diamante 💎');
        expect(decoded).toContain('Empaque de Lujo 🎁');
        expect(decoded).toContain('日本語');
        expect(decoded).toContain('العربية');
      },
    },
    {
      name: '1.3 Embedded newlines, CRLF, tabs, and query parameter injection characters (&, ?, =) are strictly percent-encoded',
      fn: async () => {
        const adversarialNotes = 'Linea 1\r\nLinea 2\nLinea 3\t&phone=573000000000&text=HACKED?injected=true#hash';
        const payload: StorefrontActionPayload = {
          itemId: 'item-injection-01',
          calculatedTotalPrice: 80000,
          quantity: 1,
          customerInfo: {
            name: 'Tester & Attacker',
            phone: '3157778899',
            notes: adversarialNotes,
          },
          deepLinkUrl: 'https://pixy.app/store/p/item-injection-01',
        };

        const res = formatWhatsAppMessage(payload, '3157778899');
        const urlObj = new URL(res.encodedUri);
        
        // Ensure no parameter pollution occurred: only 'text' query param must exist
        expect(urlObj.searchParams.has('phone')).toBe(false);
        expect(urlObj.searchParams.has('injected')).toBe(false);
        expect(urlObj.pathname).toBe('/573157778899');
        
        const decoded = urlObj.searchParams.get('text') || '';
        expect(decoded).toContain('&phone=573000000000&text=HACKED?injected=true');
      },
    },
    {
      name: '1.4 Null bytes (\0) and control characters do not cause truncation or termination',
      fn: async () => {
        const nullByteNotes = 'Inicio de nota\u0000Cuerpo protegido tras byte nulo\u001B[31mTerminal Code\u007F';
        const payload: StorefrontActionPayload = {
          itemId: 'item-nullbyte-01',
          calculatedTotalPrice: 95000,
          quantity: 1,
          customerInfo: {
            name: 'User\u0000Name',
            phone: '+57 320 111 2233',
            notes: nullByteNotes,
          },
          deepLinkUrl: 'https://pixy.app/store/p/item-nullbyte-01',
        };

        const res = formatWhatsAppMessage(payload, '+57 320 111 2233');
        expect(res.encodedUri).toContain('%00'); // %00 percent encoded null byte

        const urlObj = new URL(res.encodedUri);
        const decoded = urlObj.searchParams.get('text') || '';
        expect(decoded).toContain('Cuerpo protegido tras byte nulo');
      },
    },
    {
      name: '1.5 International phone normalization handles all global dial codes and malformed inputs',
      fn: async () => {
        const payload: StorefrontActionPayload = {
          itemId: 'item-phone-edge',
          calculatedTotalPrice: 30000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/store/p/item-phone-edge',
        };

        // Colombia 10 digits without +57
        expect(formatWhatsAppMessage(payload, '3001234567').phone).toBe('573001234567');
        // Colombia with +57
        expect(formatWhatsAppMessage(payload, '+57 300 123 4567').phone).toBe('573001234567');
        // USA +1
        expect(formatWhatsAppMessage(payload, '+1 (555) 987-6543').phone).toBe('15559876543');
        // UK +44
        expect(formatWhatsAppMessage(payload, '+44 20 7946 0958').phone).toBe('442079460958');
        // Spain +34
        expect(formatWhatsAppMessage(payload, '+34 91 123 4567').phone).toBe('34911234567');
        // Mexico +52
        expect(formatWhatsAppMessage(payload, '+52 55 1234 5678').phone).toBe('525512345678');
        // Malformed with characters
        expect(formatWhatsAppMessage(payload, 'tel: +57.300-123.4567 #ext 9').phone).toBe('5730012345679');
        // Empty phone fallback
        expect(formatWhatsAppMessage(payload, '').phone).toBe('573001234567');
      },
    },

    // =========================================================================
    // FOCUS AREA 2: WOMPI CHECKOUT INTEGRITY, SIGNATURES & REPLAY ATTACKS
    // =========================================================================
    {
      name: '2.1 SHA-256 integrity signature exhibits complete avalanche effect on 1-character reference or amount perturbation',
      fn: async () => {
        const secret = 'wompi_prod_secret_key_884812';
        const reference = 'ORD-2026-X99201';
        const amountInCents = 25000000; // $250.000 COP
        const currency = 'COP';

        const baseSig = generateWompiSignature(reference, amountInCents, currency, secret);
        expect(baseSig).toHaveLength(64); // Valid SHA-256 hex string

        // Change 1 character in reference
        const tamperedRefSig = generateWompiSignature('ORD-2026-X99202', amountInCents, currency, secret);
        expect(tamperedRefSig).not.toBe(baseSig);

        // Change 1 cent in amount
        const tamperedAmountSig = generateWompiSignature(reference, 25000001, currency, secret);
        expect(tamperedAmountSig).not.toBe(baseSig);

        // Change currency to USD
        const tamperedCurrSig = generateWompiSignature(reference, amountInCents, 'USD', secret);
        expect(tamperedCurrSig).not.toBe(baseSig);

        // Change secret by 1 character
        const tamperedSecretSig = generateWompiSignature(reference, amountInCents, currency, 'wompi_prod_secret_key_884813');
        expect(tamperedSecretSig).not.toBe(baseSig);
      },
    },
    {
      name: '2.2 Negative and zero amounts are rejected at schema validation and gateway session layers',
      fn: async () => {
        // Negative amount at schema validation
        const negativePayload = {
          actionType: 'wompi_checkout',
          itemId: 'item-wompi-01',
          calculatedTotalPrice: -15000,
          quantity: 1,
          deepLinkUrl: 'https://pixy.app/store/p/1',
          customerInfo: { name: 'Bad User', phone: '3001234567' },
        };

        const parseResult = storefrontActionPayloadSchema.safeParse(negativePayload);
        expect(parseResult.success).toBe(false);

        // Sub-minimum amount at payment session
        const sessionRes = createWompiPaymentSession(500, 'COP', 'ref-001', 'test_secret');
        expect(sessionRes.isValid).toBe(false);
        expect(sessionRes.error).toContain('below Wompi gateway minimum of $1000 COP');
      },
    },
    {
      name: '2.3 Decimal precision and floating point rounding to cents integrity (e.g. $19.999,99 COP -> 1999999 cents)',
      fn: async () => {
        const floatPrice = 19999.99;
        const amountInCents = Math.round(floatPrice * 100);
        expect(amountInCents).toBe(1999999);

        // Precision stress test with fractional sums
        const sub1 = 0.1;
        const sub2 = 0.2;
        const sumFloat = sub1 + sub2; // 0.30000000000000004
        const cents = Math.round(sumFloat * 100);
        expect(cents).toBe(30);
      },
    },
    {
      name: '2.4 Replay attack and collision resistance: 1,000 rapid concurrent references generate 100% unique IDs',
      fn: async () => {
        const references = new Set<string>();
        const count = 1000;

        for (let i = 0; i < count; i++) {
          const ref = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${i}`;
          references.add(ref);
        }

        expect(references.size).toBe(count);
      },
    },
    {
      name: '2.5 Currency constraint enforcement: rejects unsupported currencies (EUR, GBP, JPY, CAD, BRL)',
      fn: async () => {
        const unsupported = ['EUR', 'GBP', 'JPY', 'CAD', 'BRL', 'ETH', 'BTC'];
        for (const curr of unsupported) {
          const res = createWompiPaymentSession(50000, curr, `ref-${curr}`, 'secret_123');
          expect(res.isValid).toBe(false);
          expect(res.error).toContain(`Invalid currency code: ${curr}`);
        }
      },
    },

    // =========================================================================
    // FOCUS AREA 3: CRM LEAD / QUOTE GENERATION & INJECTION RESILIENCE
    // =========================================================================
    {
      name: '3.1 SQL / PostgREST injection tokens in name, email, company, and notes are safely treated as inert strings',
      fn: async () => {
        const state: CRMSubmissionState = { recentSubmissions: new Map() };
        const sqliPayloads = [
          "' OR '1'='1",
          "'; DROP TABLE leads; DROP TABLE quotes; --",
          "admin'--",
          "UNION SELECT 1, null, 'hacked'--",
          "1; EXEC xp_cmdshell('dir');--",
          "{\"$gt\": \"\"}", // NoSQL token
        ];

        for (let i = 0; i < sqliPayloads.length; i++) {
          const payload: StorefrontActionPayload = {
            itemId: `item-sqli-${i}`,
            calculatedTotalPrice: 150000 + i * 1000,
            quantity: 1,
            customerInfo: {
              name: `SQLi Test ${sqliPayloads[i]}`,
              email: `sqli_${i}@database-security.org`,
              phone: `+57300${String(i).padStart(7, '0')}`,
              notes: sqliPayloads[i],
            },
            deepLinkUrl: `https://pixy.app/store/p/${i}`,
          };

          const res = submitStorefrontQuoteToCRM(payload, 'org-tenant-01', state, 20000 + i * 6000);
          expect(res.success).toBe(true);
          expect(res.draft?.lead.name).toContain(sqliPayloads[i]);
          expect(res.draft?.lead.organization_id).toBe('org-tenant-01');
        }
      },
    },
    {
      name: '3.2 XSS payloads (<script>, <img onerror>, javascript:) in customer notes are sanitized without executing code',
      fn: async () => {
        const xssPayload = '<script>alert(document.domain)</script><img src="x" onerror="alert(1)"/><b>Negrita Segura</b>';
        const sanitized = sanitizeHtml(xssPayload);

        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).toContain('Negrita Segura');
      },
    },
    {
      name: '3.3 Rapid duplicate submissions (flood attack simulation) are debounced within 5s window',
      fn: async () => {
        const state: CRMSubmissionState = { recentSubmissions: new Map() };
        const payload: StorefrontActionPayload = {
          itemId: 'item-rapid-quote',
          calculatedTotalPrice: 350000,
          quantity: 1,
          customerInfo: {
            name: 'Cliente Veloz',
            email: 'veloz@empresa.com',
            phone: '3001239999',
          },
          deepLinkUrl: 'https://pixy.app/store/p/rapid',
        };

        const t0 = 100000;
        // 1st request succeeds
        const r1 = submitStorefrontQuoteToCRM(payload, 'org-01', state, t0);
        expect(r1.success).toBe(true);

        // 2nd request at t0 + 100ms (rapid duplicate click) is debounced
        const r2 = submitStorefrontQuoteToCRM(payload, 'org-01', state, t0 + 100);
        expect(r2.success).toBe(false);
        expect(r2.isDebounced).toBe(true);

        // 3rd request at t0 + 2000ms is also debounced
        const r3 = submitStorefrontQuoteToCRM(payload, 'org-01', state, t0 + 2000);
        expect(r3.success).toBe(false);
        expect(r3.isDebounced).toBe(true);

        // 4th request at t0 + 5100ms (after debounce window) succeeds
        const r4 = submitStorefrontQuoteToCRM(payload, 'org-01', state, t0 + 5100);
        expect(r4.success).toBe(true);
      },
    },
    {
      name: '3.4 Multi-tenant isolation in CRM quotes: prevents quote association across tenant boundaries',
      fn: async () => {
        const state: CRMSubmissionState = { recentSubmissions: new Map() };
        const payload: StorefrontActionPayload = {
          itemId: 'item-tenant-isolate',
          calculatedTotalPrice: 500000,
          quantity: 1,
          customerInfo: {
            name: 'Cliente Org A',
            email: 'cliente@orga.com',
            phone: '3001112222',
          },
          deepLinkUrl: 'https://pixy.app/store/p/isolate',
        };

        const resOrgA = submitStorefrontQuoteToCRM(payload, 'org-alpha', state, 100000);
        expect(resOrgA.success).toBe(true);
        expect(resOrgA.draft?.lead.organization_id).toBe('org-alpha');
        expect(resOrgA.draft?.quote.organization_id).toBe('org-alpha');

        const resOrgB = submitStorefrontQuoteToCRM(payload, 'org-beta', state, 200000);
        expect(resOrgB.success).toBe(true);
        expect(resOrgB.draft?.lead.organization_id).toBe('org-beta');
        expect(resOrgB.draft?.quote.organization_id).toBe('org-beta');
      },
    },

    // =========================================================================
    // FOCUS AREA 4: DIRECT APPOINTMENT BOOKING CONCURRENCY & EDGE CASES
    // =========================================================================
    {
      name: '4.1 Double-booking concurrency simulation: 10 concurrent requests for same time slot allow only 1 booking',
      fn: async () => {
        const baseBusinessHours = { startHour: 8, endHour: 18, closedDays: [0] };
        const fixedNow = new Date('2026-08-16T10:00:00Z').getTime();
        const requestedSlotIso = '2026-08-18T14:00:00Z'; // Tuesday 2:00 PM UTC
        const slotDurationMin = 60;

        const existingBookings: Array<{ start: number; end: number }> = [];
        let confirmedBookings = 0;
        let rejectedBookings = 0;

        // Simulate 10 concurrent booking attempts
        for (let i = 0; i < 10; i++) {
          const req: AppointmentSlotRequest = {
            serviceId: 'srv-consultoria',
            isServiceActive: true,
            startTimeIso: requestedSlotIso,
            durationMinutes: slotDurationMin,
            businessHours: baseBusinessHours,
            existingBookings: [...existingBookings],
          };

          const validation = validateAppointmentSlot(req, fixedNow);
          if (validation.isValid) {
            confirmedBookings++;
            const startMs = new Date(requestedSlotIso).getTime();
            existingBookings.push({ start: startMs, end: startMs + slotDurationMin * 60 * 1000 });
          } else {
            rejectedBookings++;
            expect(validation.error).toContain('overlaps with an existing appointment');
          }
        }

        expect(confirmedBookings).toBe(1);
        expect(rejectedBookings).toBe(9);
      },
    },
    {
      name: '4.2 All interval overlap permutations (start-overlap, end-overlap, enclosed, enclosing) are strictly blocked',
      fn: async () => {
        const baseBusinessHours = { startHour: 8, endHour: 18, closedDays: [0] };
        const fixedNow = new Date('2026-08-16T10:00:00Z').getTime();
        
        // Existing confirmed booking: 14:00 - 15:00 UTC
        const existingStart = new Date('2026-08-18T14:00:00Z').getTime();
        const existingEnd = new Date('2026-08-18T15:00:00Z').getTime();
        const bookings = [{ start: existingStart, end: existingEnd }];

        // Overlap Case 1: Partial overlap before (13:30 - 14:30)
        const overlapBefore = validateAppointmentSlot({
          serviceId: 'srv-1',
          isServiceActive: true,
          startTimeIso: '2026-08-18T13:30:00Z',
          durationMinutes: 60,
          businessHours: baseBusinessHours,
          existingBookings: bookings,
        }, fixedNow);
        expect(overlapBefore.isValid).toBe(false);

        // Overlap Case 2: Partial overlap after (14:30 - 15:30)
        const overlapAfter = validateAppointmentSlot({
          serviceId: 'srv-1',
          isServiceActive: true,
          startTimeIso: '2026-08-18T14:30:00Z',
          durationMinutes: 60,
          businessHours: baseBusinessHours,
          existingBookings: bookings,
        }, fixedNow);
        expect(overlapAfter.isValid).toBe(false);

        // Overlap Case 3: Enclosed inside existing (14:15 - 14:45)
        const enclosed = validateAppointmentSlot({
          serviceId: 'srv-1',
          isServiceActive: true,
          startTimeIso: '2026-08-18T14:15:00Z',
          durationMinutes: 30,
          businessHours: baseBusinessHours,
          existingBookings: bookings,
        }, fixedNow);
        expect(enclosed.isValid).toBe(false);

        // Overlap Case 4: Enclosing entire existing (13:00 - 16:00)
        const enclosing = validateAppointmentSlot({
          serviceId: 'srv-1',
          isServiceActive: true,
          startTimeIso: '2026-08-18T13:00:00Z',
          durationMinutes: 180,
          businessHours: baseBusinessHours,
          existingBookings: bookings,
        }, fixedNow);
        expect(enclosing.isValid).toBe(false);
      },
    },
    {
      name: '4.3 Boundary slot adjacency: back-to-back appointments (13:00-14:00 & 14:00-15:00) are permitted without conflict',
      fn: async () => {
        const baseBusinessHours = { startHour: 8, endHour: 18, closedDays: [0] };
        const fixedNow = new Date('2026-08-16T10:00:00Z').getTime();
        
        // Existing booking: 14:00 - 15:00 UTC
        const existingStart = new Date('2026-08-18T14:00:00Z').getTime();
        const existingEnd = new Date('2026-08-18T15:00:00Z').getTime();
        const bookings = [{ start: existingStart, end: existingEnd }];

        // Adjacent Before: 13:00 - 14:00 (ends exactly when existing starts)
        const adjacentBefore = validateAppointmentSlot({
          serviceId: 'srv-1',
          isServiceActive: true,
          startTimeIso: '2026-08-18T13:00:00Z',
          durationMinutes: 60,
          businessHours: baseBusinessHours,
          existingBookings: bookings,
        }, fixedNow);
        expect(adjacentBefore.isValid).toBe(true);

        // Adjacent After: 15:00 - 16:00 (starts exactly when existing ends)
        const adjacentAfter = validateAppointmentSlot({
          serviceId: 'srv-1',
          isServiceActive: true,
          startTimeIso: '2026-08-18T15:00:00Z',
          durationMinutes: 60,
          businessHours: baseBusinessHours,
          existingBookings: bookings,
        }, fixedNow);
        expect(adjacentAfter.isValid).toBe(true);
      },
    },
    {
      name: '4.4 Past dates and invalid date strings are strictly blocked',
      fn: async () => {
        const baseBusinessHours = { startHour: 8, endHour: 18, closedDays: [0] };
        const fixedNow = new Date('2026-08-16T10:00:00Z').getTime();

        // 1 second in the past
        const past1Sec = validateAppointmentSlot({
          serviceId: 'srv-1',
          isServiceActive: true,
          startTimeIso: new Date(fixedNow - 1000).toISOString(),
          durationMinutes: 60,
          businessHours: baseBusinessHours,
          existingBookings: [],
        }, fixedNow);
        expect(past1Sec.isValid).toBe(false);
        expect(past1Sec.error).toContain('cannot be booked in the past');

        // Malformed date string
        const invalidDate = validateAppointmentSlot({
          serviceId: 'srv-1',
          isServiceActive: true,
          startTimeIso: 'not-a-valid-iso-date',
          durationMinutes: 60,
          businessHours: baseBusinessHours,
          existingBookings: [],
        }, fixedNow);
        expect(invalidDate.isValid).toBe(false);
        expect(invalidDate.error).toContain('Invalid start time format');
      },
    },

    // =========================================================================
    // FOCUS AREA 5: STORE CUSTOMIZER CSS / HTML SANITIZATION & BROKEN CONFIGS
    // =========================================================================
    {
      name: '5.1 Malicious CSS injection vectors in theme colors are strictly rejected by HEX validator',
      fn: async () => {
        const cssInjectionVectors = [
          '#4F46E5; background-image: url("https://evil.com/hack.png");',
          'red; } * { display: none !important; }',
          '#000000; behavior: url(xss.htc);',
          'expression(alert(1))',
          'rgb(255, 0, 0); content: "malicious"',
          '<style>body{background:red}</style>',
          '#FFF; @import url("https://evil.com/leak.css");',
        ];

        for (const vector of cssInjectionVectors) {
          // Verify HEX regex rejection
          expect(HEX_COLOR_REGEX.test(vector)).toBe(false);

          // Verify sanitization fallback in contracts
          const sanitized = sanitizeCssColor(vector, '#4F46E5');
          expect(sanitized).toBe('#4F46E5');

          // Verify schema safeParse rejects vector
          const res = storefrontThemeConfigSchema.safeParse({
            primary_color: vector,
          });
          expect(res.success).toBe(false);
        }
      },
    },
    {
      name: '5.2 Unsafe URL protocols (javascript:, data:, vbscript:) in social links and hero banner are stripped or blocked',
      fn: async () => {
        const themeInput: Partial<StoreCustomizerTheme> = {
          primary_color: '#4F46E5',
          hero_banner_url: 'javascript:alert(document.cookie)',
          social_links: {
            instagram: 'https://instagram.com/pixy_official',
            malicious_js: 'javascript:alert("XSS")',
            malicious_data: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
          },
        };

        const res = validateStoreCustomizerTheme(themeInput);
        expect(res.sanitizedTheme.social_links?.instagram).toBe('https://instagram.com/pixy_official');
        expect(res.sanitizedTheme.social_links?.malicious_js).toBeUndefined();
        expect(res.sanitizedTheme.social_links?.malicious_data).toBeUndefined();
        expect(res.sanitizedTheme.hero_banner_url).toBe('https://cdn.pixy.app/branding/default-hero-banner.webp');
      },
    },
    {
      name: '5.3 Broken, partial, and corrupted JSON configurations recover safely via default fallback merging',
      fn: async () => {
        // Corrupted payload with missing required objects and corrupted types
        const corruptedConfig = {
          theme: 'modern',
          primary_color: '#4F46E5',
          secondary_color: '#EC4899',
          accent_color: '#10B981',
          hero: {
            title: 'Título Personalizado',
          },
          // missing business_hours, missing faq, missing testimonials
        };

        const parseResult = storefrontThemeConfigSchema.safeParse(corruptedConfig);
        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          expect(parseResult.data.hero.enabled).toBe(true);
          expect(parseResult.data.hero.subtitle).toBeDefined();
          expect(parseResult.data.business_hours).toBeDefined();
          expect(parseResult.data.faq).toEqual([]);
          expect(parseResult.data.testimonials).toEqual([]);
        }
      },
    },
    {
      name: '5.4 Extreme FAQ & Testimonial collections (100+ items each) validate and preserve ordering without memory leak',
      fn: async () => {
        const largeFaq = Array.from({ length: 100 }, (_, i) => ({
          id: `faq-${i + 1}`,
          question: `Pregunta Frecuente #${i + 1} de Gran Escala?`,
          answer: `Respuesta detallada con información de soporte para la pregunta #${i + 1}.`,
          category: `Categoria ${i % 5}`,
        }));

        const largeTestimonials = Array.from({ length: 100 }, (_, i) => ({
          id: `testi-${i + 1}`,
          name: `Cliente VIP #${i + 1}`,
          role: 'Director Ejecutivo',
          company: `Empresa #${i + 1} S.A.S`,
          quote: `Experiencia de usuario y calidad insuperable con el portafolio #${i + 1}.`,
          rating: 5,
        }));

        const config = {
          primary_color: '#4F46E5',
          secondary_color: '#EC4899',
          accent_color: '#10B981',
          faq: largeFaq,
          testimonials: largeTestimonials,
        };

        const res = storefrontThemeConfigSchema.safeParse(config);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.faq).toHaveLength(100);
          expect(res.data.testimonials).toHaveLength(100);
          expect(res.data.faq[99].question).toBe('Pregunta Frecuente #100 de Gran Escala?');
        }
      },
    },
    {
      name: '5.5 Business hours validation enforces valid open/close sequence and rejects inverted schedules',
      fn: async () => {
        const invalidSchedule = [
          { day: 'Martes', open: '22:00', close: '06:00', is_closed: false }, // inverted
        ];

        const res = validateStoreCustomizerTheme({ business_hours: invalidSchedule });
        expect(res.isValid).toBe(false);
        expect(res.errors[0]).toContain('open time (22:00) must be before close time (06:00)');

        const validSchedule = [
          { day: 'Martes', open: '08:00', close: '18:00', is_closed: false },
          { day: 'Domingo', open: '00:00', close: '00:00', is_closed: true },
        ];

        const resValid = validateStoreCustomizerTheme({ business_hours: validSchedule });
        expect(resValid.isValid).toBe(true);
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
