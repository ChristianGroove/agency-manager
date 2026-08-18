/**
 * Tier 1 Test Suite: Customizer Primary CTA & Per-Item Overrides
 * Covers Global Primary CTA Configuration, Per-Item CTA Overrides,
 * Precedence Resolution, and Fallback Routing.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
} from '../harness/assertions';
import {
  resolveEffectiveCTA,
} from '../harness/contracts';

export const suite = {
  name: 'T1-00D: Customizer Global CTA & Per-Item Overrides',
  tier: 'Tier 1',
  feature: 'F11 & F12: Store Customizer Global Primary CTA & Granular Item Overrides',
  tests: [
    {
      name: 'Global Primary CTA settings resolution across all standard actions',
      fn: () => {
        const themeCart = { primary_cta: 'cart' };
        const themeQuote = { primary_cta: 'quote' };
        const themeBooking = { primary_cta: 'booking' };
        const themeBuy = { primary_cta: 'buy' };
        const themeWhatsApp = { primary_cta: 'whatsapp' };

        const itemDefault = { cta_type: null };

        assertEqual(resolveEffectiveCTA(itemDefault, themeCart), 'cart');
        assertEqual(resolveEffectiveCTA(itemDefault, themeQuote), 'quote');
        assertEqual(resolveEffectiveCTA(itemDefault, themeBooking), 'booking');
        assertEqual(resolveEffectiveCTA(itemDefault, themeBuy), 'buy');
        assertEqual(resolveEffectiveCTA(itemDefault, themeWhatsApp), 'whatsapp');
      },
    },
    {
      name: 'Per-item CTA override takes strict precedence over global theme CTA',
      fn: () => {
        // Global theme is set to 'cart' (retail store)
        const globalTheme = { primary_cta: 'cart' };

        // 1. Physical item defaults to global cart
        const physicalItem = { cta_type: null };
        assertEqual(resolveEffectiveCTA(physicalItem, globalTheme), 'cart');

        // 2. High-ticket custom item overrides to 'quote'
        const enterpriseItem = { cta_type: 'quote' };
        assertEqual(resolveEffectiveCTA(enterpriseItem, globalTheme), 'quote');

        // 3. Workshop service item overrides to 'booking'
        const serviceItem = { cta_type: 'booking' };
        assertEqual(resolveEffectiveCTA(serviceItem, globalTheme), 'booking');

        // 4. Fast direct checkout overrides to 'buy' (Wompi direct)
        const flashItem = { cta_type: 'buy' };
        assertEqual(resolveEffectiveCTA(flashItem, globalTheme), 'buy');

        // 5. Direct chat consultation overrides to 'whatsapp'
        const advisoryItem = { cta_type: 'whatsapp' };
        assertEqual(resolveEffectiveCTA(advisoryItem, globalTheme), 'whatsapp');
      },
    },
    {
      name: 'Legacy alias mapping for CTA types (e.g. add_to_cart -> cart, appointment -> booking)',
      fn: () => {
        const globalTheme = { primary_cta: 'whatsapp' };

        const legacyCartItem = { cta_type: 'add_to_cart' };
        assertEqual(resolveEffectiveCTA(legacyCartItem, globalTheme), 'cart');

        const legacyAppointmentItem = { cta_type: 'appointment' };
        assertEqual(resolveEffectiveCTA(legacyAppointmentItem, globalTheme), 'booking');

        const legacyGlobalTheme = { primary_cta: 'add_to_cart' };
        assertEqual(resolveEffectiveCTA({ cta_type: null }, legacyGlobalTheme), 'cart');
      },
    },
    {
      name: 'Fallback to whatsapp default when no theme or item CTA is defined',
      fn: () => {
        const itemEmpty = { cta_type: undefined };
        assertEqual(resolveEffectiveCTA(itemEmpty, null), 'whatsapp');
        assertEqual(resolveEffectiveCTA(itemEmpty, { primary_cta: undefined }), 'whatsapp');
      },
    },
  ],
};
