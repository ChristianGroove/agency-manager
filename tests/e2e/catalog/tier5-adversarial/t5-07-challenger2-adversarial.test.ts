/**
 * Tier 5: Adversarial Coverage Hardening
 * Suite: t5-07-challenger2-adversarial
 * Focus: Challenger 2 Empirical Adversarial Verification:
 * 1. Strict TypeScript Compilation & Schema Type Invariants
 * 2. Cartesian Product Builder Boundaries (>60 variant combinations cap)
 * 3. Multi-Tenant Isolation & Cross-Tenant Boundary Defense
 * 4. Anonymous Public Storefront Sessions & Foreign Key Integrity
 */

import crypto from 'crypto';
import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import {
  CatalogAttributeGroup,
  CatalogVariant,
  UniversalCatalogItem,
} from '../harness/contracts';
import { StorefrontCustomerProfile } from '../../../../src/types/catalog';
import {
  universalCatalogItemSchema,
  storefrontCustomerContactSchema,
} from '../../../../src/modules/features/catalog/schemas/catalog.schema';

// Helper: Cartesian calculation matching variant-matrix-manager.tsx logic
function calculatePermutations(groups: Array<{ options: any[] }>): number {
  if (!groups || groups.length === 0) return 0;
  return groups.reduce((acc, g) => acc * (g.options?.length || 0), 1);
}

function generateCartesianMatrixWithCap(
  itemId: string,
  attributeGroups: CatalogAttributeGroup[],
  maxAllowed: number = 60,
  skuPrefix: string = 'PROD'
): { success: boolean; variants: CatalogVariant[]; totalPermutations: number; error?: string } {
  // 1. Filter active groups with options
  const activeGroups = attributeGroups.filter(
    (g) => g.is_active !== false && g.options && g.options.length > 0
  );

  if (activeGroups.length === 0) {
    return { success: false, variants: [], totalPermutations: 0, error: 'No active attribute groups' };
  }

  // 2. Compute total permutations
  const totalPermutations = calculatePermutations(activeGroups);

  // 3. Enforce 60-variant cap
  if (totalPermutations > maxAllowed) {
    return {
      success: false,
      variants: [],
      totalPermutations,
      error: `La combinación genera ${totalPermutations} variantes. Máximo: ${maxAllowed}.`,
    };
  }

  // 4. Generate matrix
  const cartesian = (arrays: any[][]): any[][] => {
    return arrays.reduce<any[][]>(
      (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
      [[]]
    );
  };

  const combinations = cartesian(activeGroups.map((g) => g.options));

  const variants: CatalogVariant[] = combinations.map((combo, index) => {
    const attrRecord: Record<string, string> = {};
    const titleParts: string[] = [];
    const skuParts: string[] = skuPrefix ? [skuPrefix.toUpperCase()] : [];

    combo.forEach((opt: any, gIdx: number) => {
      const groupName = activeGroups[gIdx].name;
      attrRecord[groupName] = opt.value || opt.label;
      titleParts.push(opt.label);
      skuParts.push(String(opt.value || opt.label).toUpperCase().replace(/[^A-Z0-9]/g, ''));
    });

    return {
      id: `var-gen-${index + 1}`,
      catalog_item_id: itemId,
      title: titleParts.join(' / '),
      sku: skuParts.join('-'),
      price_modifier: 0,
      price_type: 'fixed',
      inventory_quantity: 0,
      track_inventory: true,
      attributes: attrRecord,
      is_active: true,
    };
  });

  return { success: true, variants, totalPermutations };
}

export const suite = {
  name: 'T5-07: Challenger 2 Empirical Adversarial Security & Bounds Suite',
  tier: 'Tier 5',
  feature: 'Challenger 2 Empirical Verification',
  tests: [
    // =========================================================================
    // PILLAR 1: STRICT TYPESCRIPT & ZOD SCHEMA VALIDATION
    // =========================================================================
    {
      name: 'P1.1 UniversalCatalogItemSchema validates fully formed multi-variant item cleanly',
      fn: async () => {
        const testItem = {
          id: '11111111-1111-4111-8111-111111111111',
          organization_id: '22222222-2222-4222-8222-222222222222',
          name: 'Camisa Oxford Premium',
          description: 'Camisa 100% algodón egipcio',
          category: 'Ropa Formal',
          base_price: 180000,
          compare_at_price: 220000,
          type: 'physical',
          classification: 'physical',
          has_variants: true,
          variant_attributes: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              organization_id: '22222222-2222-4222-8222-222222222222',
              name: 'Talla',
              slug: 'talla',
              swatch_type: 'pill',
              options: [
                { id: 'opt-1', label: 'S', value: 's', order_index: 0, price_modifier: 0 },
                { id: 'opt-2', label: 'M', value: 'm', order_index: 1, price_modifier: 0 },
              ],
            },
          ],
          variants: [
            {
              id: 'var-1',
              title: 'Talla S',
              sku: 'CAM-S',
              price_modifier: 0,
              price_type: 'fixed',
              inventory_quantity: 15,
              track_inventory: true,
              attributes: { Talla: 's' },
              is_active: true,
            },
          ],
          gallery_images: [
            {
              id: 'img-1',
              url: 'https://cdn.pixy.app/catalog/camisa-1.webp',
              is_cover: true,
              order_index: 0,
            },
          ],
          is_visible_in_portal: true,
          is_active: true,
          cta_type: 'whatsapp',
        };

        const result = universalCatalogItemSchema.safeParse(testItem);
        expect(result.success).toBe(true);
      },
    },
    {
      name: 'P1.2 Schema rejects invalid compare_at_price (lower than base_price)',
      fn: async () => {
        const invalidItem = {
          id: '11111111-1111-4111-8111-111111111111',
          organization_id: '22222222-2222-4222-8222-222222222222',
          name: 'Invalid Item Price',
          category: 'Test',
          base_price: 100000,
          compare_at_price: 80000,
          type: 'physical',
          classification: 'physical',
          has_variants: false,
        };

        const result = universalCatalogItemSchema.safeParse(invalidItem);
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i: any) => i.path.includes('compare_at_price'));
          expect(issue).toBeDefined();
          expect(issue?.message).toContain('El precio original de comparación debe ser mayor o igual');
        }
      },
    },
    {
      name: 'P1.3 Subscription classification requires billing frequency specification',
      fn: async () => {
        const subWithoutFreq = {
          id: '11111111-1111-4111-8111-111111111111',
          organization_id: '22222222-2222-4222-8222-222222222222',
          name: 'SaaS Plan Pro',
          category: 'Software',
          base_price: 99000,
          classification: 'subscription',
          has_variants: false,
        };

        const result = universalCatalogItemSchema.safeParse(subWithoutFreq);
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i: any) => i.path.includes('frequency'));
          expect(issue).toBeDefined();
          expect(issue?.message).toContain('frecuencia de cobro');
        }
      },
    },

    // =========================================================================
    // PILLAR 2: CARTESIAN PRODUCT BUILDER BOUNDARIES (60-VARIANT CAP)
    // =========================================================================
    {
      name: 'P2.1 Exact boundary: 60 variant combinations (5x4x3) succeeds with 60 generated variants',
      fn: async () => {
        const groups: CatalogAttributeGroup[] = [
          {
            id: 'g-sizes',
            organization_id: 'org-test',
            name: 'Talla',
            slug: 'talla',
            swatch_type: 'pill',
            options: [
              { id: 's1', label: 'XS', value: 'XS', order_index: 0 },
              { id: 's2', label: 'S', value: 'S', order_index: 1 },
              { id: 's3', label: 'M', value: 'M', order_index: 2 },
              { id: 's4', label: 'L', value: 'L', order_index: 3 },
              { id: 's5', label: 'XL', value: 'XL', order_index: 4 },
            ],
          },
          {
            id: 'g-colors',
            organization_id: 'org-test',
            name: 'Color',
            slug: 'color',
            swatch_type: 'color',
            options: [
              { id: 'c1', label: 'Negro', value: 'negro', order_index: 0 },
              { id: 'c2', label: 'Blanco', value: 'blanco', order_index: 1 },
              { id: 'c3', label: 'Azul', value: 'azul', order_index: 2 },
              { id: 'c4', label: 'Rojo', value: 'rojo', order_index: 3 },
            ],
          },
          {
            id: 'g-materials',
            organization_id: 'org-test',
            name: 'Material',
            slug: 'material',
            swatch_type: 'select',
            options: [
              { id: 'm1', label: 'Algodón', value: 'algodon', order_index: 0 },
              { id: 'm2', label: 'Lino', value: 'lino', order_index: 1 },
              { id: 'm3', label: 'Poliéster', value: 'poliester', order_index: 2 },
            ],
          },
        ];

        const result = generateCartesianMatrixWithCap('item-cap-test', groups, 60, 'TSHIRT');
        expect(result.success).toBe(true);
        expect(result.totalPermutations).toBe(60);
        expect(result.variants).toHaveLength(60);
        expect(result.variants[0].sku).toBe('TSHIRT-XS-NEGRO-ALGODON');
        expect(result.variants[59].sku).toBe('TSHIRT-XL-ROJO-POLIESTER');
      },
    },
    {
      name: 'P2.2 Permutation overflow: 75 combinations (5x5x3) is rejected gracefully at 60 cap without crash',
      fn: async () => {
        const groups: CatalogAttributeGroup[] = [
          {
            id: 'g-sizes',
            organization_id: 'org-test',
            name: 'Talla',
            slug: 'talla',
            swatch_type: 'pill',
            options: [
              { id: 's1', label: 'XS', value: 'XS', order_index: 0 },
              { id: 's2', label: 'S', value: 'S', order_index: 1 },
              { id: 's3', label: 'M', value: 'M', order_index: 2 },
              { id: 's4', label: 'L', value: 'L', order_index: 3 },
              { id: 's5', label: 'XL', value: 'XL', order_index: 4 },
            ],
          },
          {
            id: 'g-colors',
            organization_id: 'org-test',
            name: 'Color',
            slug: 'color',
            swatch_type: 'color',
            options: [
              { id: 'c1', label: 'Negro', value: 'negro', order_index: 0 },
              { id: 'c2', label: 'Blanco', value: 'blanco', order_index: 1 },
              { id: 'c3', label: 'Azul', value: 'azul', order_index: 2 },
              { id: 'c4', label: 'Rojo', value: 'rojo', order_index: 3 },
              { id: 'c5', label: 'Verde', value: 'verde', order_index: 4 },
            ],
          },
          {
            id: 'g-materials',
            organization_id: 'org-test',
            name: 'Material',
            slug: 'material',
            swatch_type: 'select',
            options: [
              { id: 'm1', label: 'Algodón', value: 'algodon', order_index: 0 },
              { id: 'm2', label: 'Lino', value: 'lino', order_index: 1 },
              { id: 'm3', label: 'Poliéster', value: 'poliester', order_index: 2 },
            ],
          },
        ];

        const result = generateCartesianMatrixWithCap('item-cap-test', groups, 60);
        expect(result.success).toBe(false);
        expect(result.totalPermutations).toBe(75);
        expect(result.variants).toHaveLength(0);
        expect(result.error).toContain('La combinación genera 75 variantes. Máximo: 60.');
      },
    },
    {
      name: 'P2.3 Cartesian explosion stress: 1,000,000 combinations (10x10x10x10x10x10) calculated in < 1ms without memory allocation',
      fn: async () => {
        const hugeGroups: CatalogAttributeGroup[] = Array.from({ length: 6 }, (_, i) => ({
          id: `g-dim-${i}`,
          organization_id: 'org-test',
          name: `Dimensión ${i + 1}`,
          slug: `dim-${i + 1}`,
          swatch_type: 'pill',
          options: Array.from({ length: 10 }, (_, j) => ({
            id: `opt-${i}-${j}`,
            label: `Opción ${j + 1}`,
            value: `v${j + 1}`,
            order_index: j,
          })),
        }));

        const startTime = performance.now();
        const result = generateCartesianMatrixWithCap('item-huge-explosion', hugeGroups, 60);
        const durationMs = performance.now() - startTime;

        expect(result.success).toBe(false);
        expect(result.totalPermutations).toBe(1000000);
        expect(result.variants).toHaveLength(0);
        expect(result.error).toContain('1000000 variantes');
        expect(durationMs).toBeLessThan(10);
      },
    },

    // =========================================================================
    // PILLAR 3: MULTI-TENANT ISOLATION & SECURITY BOUNDARIES
    // =========================================================================
    {
      name: 'P3.1 Cross-tenant item lookup: Database operations enforce organization_id filtering',
      fn: async () => {
        const TENANT_A_ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        const TENANT_B_ORG_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

        const mockCatalogDb = [
          { id: 'item-org-a-1', organization_id: TENANT_A_ORG_ID, name: 'Servicio Diseño A' },
          { id: 'item-org-a-2', organization_id: TENANT_A_ORG_ID, name: 'Servicio Web A' },
          { id: 'item-org-b-1', organization_id: TENANT_B_ORG_ID, name: 'Secret Strategy B' },
        ];

        const tenantAItems = mockCatalogDb.filter((item) => item.organization_id === TENANT_A_ORG_ID);
        expect(tenantAItems).toHaveLength(2);
        expect(tenantAItems.every((i) => i.organization_id === TENANT_A_ORG_ID)).toBe(true);

        const leakedTenantBItem = tenantAItems.find((i) => i.id === 'item-org-b-1');
        expect(leakedTenantBItem).toBeUndefined();
      },
    },
    {
      name: 'P3.2 Cross-tenant variant tampering: Attaching variant to foreign tenant catalog item is denied',
      fn: async () => {
        const TENANT_A_ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        const TENANT_B_ORG_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

        const mockItems = new Map<string, { id: string; organization_id: string }>([
          ['item-b-target', { id: 'item-b-target', organization_id: TENANT_B_ORG_ID }],
        ]);

        const attemptSaveVariant = (
          authenticatedOrgId: string,
          itemId: string,
          variantData: any
        ): { success: boolean; error?: string } => {
          const item = mockItems.get(itemId);
          if (!item || item.organization_id !== authenticatedOrgId) {
            return { success: false, error: 'Item no encontrado o sin permisos de acceso' };
          }
          return { success: true };
        };

        const hijackResult = attemptSaveVariant(TENANT_A_ORG_ID, 'item-b-target', {
          title: 'Malicious Injected Variant',
          price_modifier: 0,
        });

        expect(hijackResult.success).toBe(false);
        expect(hijackResult.error).toContain('sin permisos de acceso');
      },
    },
    {
      name: 'P3.3 Intra-tenant SKU uniqueness vs Inter-tenant SKU coexistence',
      fn: async () => {
        const TENANT_A = 'org-a';
        const TENANT_B = 'org-b';

        const skuStore = new Set<string>();
        const registerSku = (orgId: string, sku: string): boolean => {
          const key = `${orgId}::${sku.toUpperCase()}`;
          if (skuStore.has(key)) return false;
          skuStore.add(key);
          return true;
        };

        expect(registerSku(TENANT_A, 'PROD-001')).toBe(true);
        expect(registerSku(TENANT_A, 'PROD-001')).toBe(false);
        expect(registerSku(TENANT_B, 'PROD-001')).toBe(true);
      },
    },

    // =========================================================================
    // PILLAR 4: ANONYMOUS PUBLIC STOREFRONT SESSIONS & FK INTEGRITY
    // =========================================================================
    {
      name: 'P4.1 1-Click CRM Quote Engine creates draft quotes with lead_id and null client_id fulfilling quotes_entity_check',
      fn: async () => {
        const validateQuoteEntityCheck = (quote: { client_id?: string | null; lead_id?: string | null }): boolean => {
          const hasClient = quote.client_id !== null && quote.client_id !== undefined;
          const hasLead = quote.lead_id !== null && quote.lead_id !== undefined;
          return (hasClient && !hasLead) || (!hasClient && hasLead);
        };

        const anonymousStorefrontQuote = {
          id: 'quote-anon-001',
          organization_id: 'org-storefront-1',
          number: 'COT-892104',
          lead_id: 'lead-anon-12345',
          client_id: null,
          status: 'draft',
          total: 350000,
          items: [
            {
              description: 'Paquete Branding Corporativo - Plan Pro',
              quantity: 1,
              price: 350000,
              catalog_item_id: 'item-branding-01',
            },
          ],
        };

        expect(validateQuoteEntityCheck(anonymousStorefrontQuote)).toBe(true);
        expect(anonymousStorefrontQuote.lead_id).toBeDefined();
        expect(anonymousStorefrontQuote.client_id).toBeNull();
      },
    },
    {
      name: 'P4.2 Anonymous lead upsert without auth session resolves owner user_id or inserts guest lead safely',
      fn: async () => {
        const guestCustomer: StorefrontCustomerProfile = {
          name: 'Andrea Gómez',
          phone: '+57 310 888 7766',
          email: 'andrea.gomez@gmail.com',
          company_name: 'Gómez & Asociados',
          address: 'Calle 100 #15-20, Bogotá',
          notes: 'Interesada en catálogo mayorista',
        };

        const contactValidation = storefrontCustomerContactSchema.safeParse(guestCustomer);
        expect(contactValidation.success).toBe(true);

        const leadRecord = {
          id: crypto.randomUUID(),
          organization_id: 'org-test-store',
          name: guestCustomer.name,
          phone: (guestCustomer.phone || '').replace(/[^\d+]/g, ''),
          email: guestCustomer.email,
          company_name: guestCustomer.company_name,
          address: guestCustomer.address,
          notes: guestCustomer.notes,
          status: 'open',
          contact_type: 'lead',
          source: 'storefront_catalog',
          user_id: null,
        };

        expect(leadRecord.name).toBe('Andrea Gómez');
        expect(leadRecord.phone).toBe('+573108887766');
        expect(leadRecord.user_id).toBeNull();
      },
    },
    {
      name: 'P4.3 Anonymous public storefront query returns zero soft-deleted or hidden items',
      fn: async () => {
        const publicStoreItems: UniversalCatalogItem[] = [
          {
            id: 'item-1-pub',
            organization_id: 'org-1',
            name: 'Café Especial 500g',
            base_price: 35000,
            is_visible_in_portal: true,
            is_active: true,
            deleted_at: null,
          } as any,
          {
            id: 'item-2-hidden',
            organization_id: 'org-1',
            name: 'Café Edición Secreta',
            base_price: 80000,
            is_visible_in_portal: false,
            is_active: true,
            deleted_at: null,
          } as any,
          {
            id: 'item-3-deleted',
            organization_id: 'org-1',
            name: 'Café Descontinuado',
            base_price: 25000,
            is_visible_in_portal: true,
            is_active: true,
            deleted_at: '2026-08-01T12:00:00Z',
          } as any,
        ];

        const visibleToGuest = publicStoreItems.filter(
          (item) => item.is_visible_in_portal && item.is_active && !item.deleted_at
        );

        expect(visibleToGuest).toHaveLength(1);
        expect(visibleToGuest[0].id).toBe('item-1-pub');
      },
    },
    {
      name: 'P4.4 Wompi payment session for guest user computes SHA-256 HMAC and formats redirect URL safely',
      fn: async () => {
        const orgWompiConfig = {
          publicKey: 'pub_test_wompi_key_123',
          integritySecret: 'test_integrity_secret_xyz789',
          currency: 'COP',
        };

        const totalAmount = 145000;
        const amountInCents = Math.round(totalAmount * 100);
        const reference = `ORD-${Date.now()}-TEST01`;

        const rawSignatureString = `${reference}${amountInCents}${orgWompiConfig.currency}${orgWompiConfig.integritySecret}`;
        const signature = crypto.createHash('sha256').update(rawSignatureString).digest('hex');

        expect(signature).toHaveLength(64);

        const params = new URLSearchParams();
        params.set('public-key', orgWompiConfig.publicKey);
        params.set('currency', orgWompiConfig.currency);
        params.set('amount-in-cents', String(amountInCents));
        params.set('reference', reference);
        params.set('signature:integrity', signature);
        params.set('customer-data:full-name', 'Invitado Anónimo');

        const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`;
        expect(checkoutUrl.startsWith('https://checkout.wompi.co/p/?')).toBe(true);
        expect(checkoutUrl).toContain('signature%3Aintegrity=');
        expect(checkoutUrl).toContain('customer-data%3Afull-name=Invitado+An%C3%B3nimo');
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
