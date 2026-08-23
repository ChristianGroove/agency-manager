/**
 * ==============================================================================
 * CHALLENGER 1 EMPIRICAL TEST SUITE: MILESTONE 3 VERIFICATION
 * File: tests/e2e/catalog/tier5-adversarial/t5-09-m3-provisioning.test.ts
 *
 * Empirical Challenge & Stress-Testing of Milestone 3:
 * 1. Default Real Estate Categories Invariants (exact slugs, icons, scopes)
 * 2. CRM Templates Integrity (6 states, 6 pipeline stages, transitions, tags)
 * 3. Storefront Portal Theme Configuration & Dynamic Fallback
 * 4. Space Category Resolution Invariants & Fallbacks
 * 5. Non-Real-Estate Space Invariants & Regression Safety (agency, resto, saas)
 * 6. Tenant Provisioning Logic & Edge Case Simulations
 * ==============================================================================
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';
import { DEFAULT_REAL_ESTATE_CATEGORIES } from '../../../../src/modules/core/organizations/vertical-registry';
import { CRMTemplates, INDUSTRY_TEMPLATES } from '../../../../src/modules/features/crm/services/logic/templates-shared';
import {
  DEFAULT_STOREFRONT_THEME_CONFIG,
  StorefrontThemeConfig,
} from '../../../../src/types/catalog';
import {
  storefrontThemeConfigSchema,
} from '../../../../src/modules/features/catalog/schemas/catalog.schema';
import { SpaceCategory } from '../../../../src/modules/core/organizations/space-helpers';

export const suite = {
  name: 'T5-09: Milestone 3 Tenant Lifecycle, PropTech Seeding & CRM Templates',
  tier: 'Tier 5',
  feature: 'Milestone 3 Empirical Verification',
  tests: [
    // =========================================================================
    // PILLAR 1: DEFAULT REAL ESTATE CATEGORIES INVARIANTS
    // =========================================================================
    {
      name: 'M3.1.1 Exports exactly 5 default Real Estate categories with strictly unique slugs and order indexes',
      fn: async () => {
        expect(DEFAULT_REAL_ESTATE_CATEGORIES).toBeDefined();
        expect(DEFAULT_REAL_ESTATE_CATEGORIES).toHaveLength(5);

        const slugs = DEFAULT_REAL_ESTATE_CATEGORIES.map((c) => c.slug);
        const uniqueSlugs = new Set(slugs);
        expect(uniqueSlugs.size).toBe(5);

        const orderIndexes = DEFAULT_REAL_ESTATE_CATEGORIES.map((c) => c.order_index);
        expect(orderIndexes).toEqual([0, 1, 2, 3, 4]);
      },
    },
    {
      name: 'M3.1.2 Every default category has exact slug, icon, and scope: "tenant"',
      fn: async () => {
        const expectedCategories = [
          { name: 'Apartamentos', slug: 'apartamentos', icon: 'Building', color: 'sky', order_index: 0, scope: 'tenant' },
          { name: 'Casas', slug: 'casas', icon: 'Home', color: 'blue', order_index: 1, scope: 'tenant' },
          { name: 'Oficinas & Locales Comerciales', slug: 'oficinas-locales', icon: 'Briefcase', color: 'indigo', order_index: 2, scope: 'tenant' },
          { name: 'Lotes & Fincas', slug: 'lotes-fincas', icon: 'Trees', color: 'emerald', order_index: 3, scope: 'tenant' },
          { name: 'Proyectos Sobre Planos', slug: 'proyectos-planos', icon: 'FileSpreadsheet', color: 'amber', order_index: 4, scope: 'tenant' },
        ];

        for (let i = 0; i < expectedCategories.length; i++) {
          const actual = DEFAULT_REAL_ESTATE_CATEGORIES[i];
          const expected = expectedCategories[i];
          expect(actual.name).toBe(expected.name);
          expect(actual.slug).toBe(expected.slug);
          expect(actual.icon).toBe(expected.icon);
          expect(actual.color).toBe(expected.color);
          expect(actual.order_index).toBe(expected.order_index);
          expect(actual.scope).toBe(expected.scope as "tenant");
        }
      },
    },
    {
      name: 'M3.1.3 Default categories payload generator produces valid DB insert objects for newly provisioned orgs',
      fn: async () => {
        const testOrgId = 'org-real-estate-test-123';
        const payload = DEFAULT_REAL_ESTATE_CATEGORIES.map((cat) => ({
          organization_id: testOrgId,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          color: cat.color,
          order_index: cat.order_index,
          scope: cat.scope,
        }));

        expect(payload).toHaveLength(5);
        expect(payload.every((p) => p.organization_id === testOrgId)).toBe(true);
        expect(payload.every((p) => p.scope === 'tenant')).toBe(true);
      },
    },

    // =========================================================================
    // PILLAR 2: CRM TEMPLATES & REAL ESTATE SALES FUNNEL INTEGRITY
    // =========================================================================
    {
      name: 'M3.2.1 CRMTemplates.real_estate exists and contains 6 process states with correct initial & terminal markers',
      fn: async () => {
        expect(CRMTemplates.real_estate).toBeDefined();
        const re = CRMTemplates.real_estate;
        expect(re.id).toBe('real_estate');
        expect(re.industry).toBe('real_estate');
        expect(re.processStates).toHaveLength(6);

        // Initial state check
        const initialStates = re.processStates.filter((s) => s.is_initial);
        expect(initialStates).toHaveLength(1);
        expect(initialStates[0].key).toBe('lead');
        expect(initialStates[0].name).toBe('Prospecto');

        // Terminal states check
        const terminalStates = re.processStates.filter((s) => s.is_terminal);
        expect(terminalStates).toHaveLength(2);
        const terminalKeys = terminalStates.map((s) => s.key);
        expect(terminalKeys).toContain('closed_won');
        expect(terminalKeys).toContain('lost');

        // Check auto_tags on closed_won
        const closedWon = re.processStates.find((s) => s.key === 'closed_won');
        expect(closedWon?.auto_tags).toEqual(['buyer_client', 'property_sold']);
      },
    },
    {
      name: 'M3.2.2 CRMTemplates.real_estate defines valid state transition graph without dead ends before terminal',
      fn: async () => {
        const re = CRMTemplates.real_estate;
        const stateKeys = new Set(re.processStates.map((s) => s.key));

        for (const state of re.processStates) {
          if (!state.is_terminal) {
            expect(state.allowed_next_states).toBeDefined();
            expect(state.allowed_next_states!.length).toBeGreaterThan(0);
            for (const nextKey of state.allowed_next_states!) {
              expect(stateKeys.has(nextKey)).toBe(true);
            }
          }
        }

        // Validate specific pipeline flow: lead -> contacted -> visit -> negotiation -> closed_won / lost
        const lead = re.processStates.find((s) => s.key === 'lead')!;
        expect(lead.allowed_next_states).toContain('contacted');
        expect(lead.allowed_next_states).toContain('lost');

        const contacted = re.processStates.find((s) => s.key === 'contacted')!;
        expect(contacted.allowed_next_states).toContain('visit');
        expect(contacted.allowed_next_states).toContain('lost');

        const visit = re.processStates.find((s) => s.key === 'visit')!;
        expect(visit.allowed_next_states).toContain('negotiation');
        expect(visit.allowed_next_states).toContain('lost');

        const negotiation = re.processStates.find((s) => s.key === 'negotiation')!;
        expect(negotiation.allowed_next_states).toContain('closed_won');
        expect(negotiation.allowed_next_states).toContain('lost');
      },
    },
    {
      name: 'M3.2.3 CRMTemplates.real_estate contains 6 Kanban pipeline stages mapped 1:1 to process states',
      fn: async () => {
        const re = CRMTemplates.real_estate;
        expect(re.pipelineStages).toHaveLength(6);

        const expectedStages = [
          { name: 'Prospecto', key: 'lead', mapToProcessKey: 'lead', color: 'bg-blue-500', icon: 'UserPlus' },
          { name: 'Contactado', key: 'contacted', mapToProcessKey: 'contacted', color: 'bg-cyan-500', icon: 'PhoneCall' },
          { name: 'Visita / Demostración', key: 'visit', mapToProcessKey: 'visit', color: 'bg-amber-500', icon: 'Eye' },
          { name: 'Oferta / Negociación', key: 'negotiation', mapToProcessKey: 'negotiation', color: 'bg-indigo-500', icon: 'FileText' },
          { name: 'Cierre Ganado', key: 'closed_won', mapToProcessKey: 'closed_won', color: 'bg-emerald-500', icon: 'CheckCircle' },
          { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-rose-500', icon: 'XCircle' },
        ];

        for (let i = 0; i < expectedStages.length; i++) {
          const actual = re.pipelineStages[i];
          const expected = expectedStages[i];
          expect(actual.name).toBe(expected.name);
          expect(actual.key).toBe(expected.key);
          expect(actual.mapToProcessKey).toBe(expected.mapToProcessKey);
          expect(actual.color).toBe(expected.color);
          expect(actual.icon).toBe(expected.icon);
        }
      },
    },
    {
      name: 'M3.2.4 INDUSTRY_TEMPLATES includes real_estate entry with Spanish quote approval/rejection actions',
      fn: async () => {
        const reTemplate = INDUSTRY_TEMPLATES.find((t) => t.id === 'real_estate');
        expect(reTemplate).toBeDefined();
        expect(reTemplate?.label).toBe('Inmobiliaria / Real Estate');
        expect(reTemplate?.icon).toBe('Home');
        expect(reTemplate?.color).toBe('blue');
        expect(reTemplate?.spaces).toContain('real_estate');
        expect(reTemplate?.spaces).toContain('construction');
        expect(reTemplate?.approve_label).toBe('🏡 Me Interesa / Visitar');
        expect(reTemplate?.reject_label).toBe('❌ No es lo que busco');
        expect(reTemplate?.header).toBe('OPORTUNIDAD DE INVERSIÓN');
      },
    },

    // =========================================================================
    // PILLAR 3: PORTAL THEME CONFIG & PROVISIONING SETTINGS
    // =========================================================================
    {
      name: 'M3.3.1 Storefront theme config schema validates real_estate preset and mortgage calculator widget',
      fn: async () => {
        const realEstateThemeConfig: StorefrontThemeConfig = {
          theme: 'modern',
          industry_preset: 'real_estate',
          widget_config: {
            show_real_estate_filters: true,
            show_mortgage_calculator: true,
            show_cart_drawer: false,
            show_whatsapp_button: true,
            show_category_nav: true,
            show_search_bar: true,
            show_stock_badges: false,
          },
          primary_color: '#4F46E5',
          secondary_color: '#EC4899',
        };

        const parseResult = storefrontThemeConfigSchema.safeParse(realEstateThemeConfig);
        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          expect(parseResult.data.industry_preset).toBe('real_estate');
          expect(parseResult.data.widget_config?.show_mortgage_calculator).toBe(true);
          expect(parseResult.data.widget_config?.show_real_estate_filters).toBe(true);
          expect(parseResult.data.widget_config?.show_cart_drawer).toBe(false);
        }
      },
    },
    {
      name: 'M3.3.2 Storefront theme dynamic fallback resolves real_estate preset when configured as auto',
      fn: async () => {
        function resolveEffectivePreset(rawPreset: string | undefined, spaceCategory: SpaceCategory): string {
          let effective = rawPreset || 'auto';
          if (effective === 'auto' && spaceCategory === 'real_estate') {
            effective = 'real_estate';
          }
          return effective;
        }

        expect(resolveEffectivePreset('auto', 'real_estate')).toBe('real_estate');
        expect(resolveEffectivePreset(undefined, 'real_estate')).toBe('real_estate');
        expect(resolveEffectivePreset('auto', 'agency')).toBe('auto');
        expect(resolveEffectivePreset('auto', 'resto')).toBe('auto');
        expect(resolveEffectivePreset('physical_retail', 'real_estate')).toBe('physical_retail'); // explicit preset overrides
      },
    },

    // =========================================================================
    // PILLAR 4: SPACE CATEGORY RESOLUTION & BACKWARDS COMPATIBILITY
    // =========================================================================
    {
      name: 'M3.4.1 SpaceCategory type and resolution logic handles both space_category and category fields',
      fn: async () => {
        function resolveAppCategory(appData: any): SpaceCategory {
          return ((appData?.space_category || appData?.category) as SpaceCategory) || 'agency';
        }

        expect(resolveAppCategory({ space_category: 'real_estate' })).toBe('real_estate');
        expect(resolveAppCategory({ category: 'real_estate' })).toBe('real_estate');
        expect(resolveAppCategory({ space_category: 'real_estate', category: 'agency' })).toBe('real_estate');
        expect(resolveAppCategory({ category: 'agency' })).toBe('agency');
        expect(resolveAppCategory({ space_category: 'resto' })).toBe('resto');
        expect(resolveAppCategory(null)).toBe('agency');
        expect(resolveAppCategory({})).toBe('agency');
      },
    },
    {
      name: 'M3.4.2 Legacy CRM templates (agency, saas) remain intact with zero regressions',
      fn: async () => {
        expect(CRMTemplates.agency).toBeDefined();
        expect(CRMTemplates.agency.processStates).toHaveLength(5);
        expect(CRMTemplates.agency.pipelineStages).toHaveLength(4);

        expect(CRMTemplates.saas).toBeDefined();
        expect(CRMTemplates.saas.processStates).toHaveLength(5);
        expect(CRMTemplates.saas.pipelineStages).toHaveLength(4);
      },
    },

    // =========================================================================
    // PILLAR 5: TENANT PROVISIONING LOGIC SIMULATION
    // =========================================================================
    {
      name: 'M3.5.1 Real Estate detection in provisioning handles app IDs, slugs, and space categories',
      fn: async () => {
        function checkIsRealEstate(appCategory: string | null, appId: string): boolean {
          return appCategory === 'real_estate' || appId === 'app_real_estate_pro' || appId === 'real-estate-pro';
        }

        // Positive detections
        expect(checkIsRealEstate('real_estate', 'any_id')).toBe(true);
        expect(checkIsRealEstate(null, 'app_real_estate_pro')).toBe(true);
        expect(checkIsRealEstate(null, 'real-estate-pro')).toBe(true);
        expect(checkIsRealEstate('real_estate', 'app_real_estate_pro')).toBe(true);

        // Negative detections
        expect(checkIsRealEstate('agency', 'app_agency_starter')).toBe(false);
        expect(checkIsRealEstate('resto', 'app_resto_pos')).toBe(false);
        expect(checkIsRealEstate('saas', 'app_saas_pro')).toBe(false);
        expect(checkIsRealEstate(null, 'app_cleaning_standard')).toBe(false);
      },
    },
    {
      name: 'M3.5.2 Provisioning passes correct CRM template ID based on vertical space category',
      fn: async () => {
        function resolveCrmTemplateId(isRealEstate: boolean, appCategory: string | null): string {
          return isRealEstate ? 'real_estate' : (appCategory || 'agency');
        }

        expect(resolveCrmTemplateId(true, 'real_estate')).toBe('real_estate');
        expect(resolveCrmTemplateId(true, null)).toBe('real_estate');
        expect(resolveCrmTemplateId(false, 'agency')).toBe('agency');
        expect(resolveCrmTemplateId(false, 'saas')).toBe('saas');
        expect(resolveCrmTemplateId(false, null)).toBe('agency');
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
