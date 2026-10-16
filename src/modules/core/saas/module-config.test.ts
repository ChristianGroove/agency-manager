import { describe, expect, it } from 'vitest';
import { filterRoutesByModules } from './module-config';

describe('Sidebar filterRoutesByModules IAM V2 Security & Space Parity', () => {
    const allModules = [
        'core_crm',
        'core_clients',
        'module_messaging',
        'module_invoicing',
        'module_quotes',
        'module_rentals',
        'module_tasks',
        'module_attendance',
        'module_resto_orders',
        'module_resto_menu',
        'module_resto_staff',
        'module_cleaning',
    ];

    it('displays all subscribed modules to an owner regardless of granular permissions', () => {
        const routes = filterRoutesByModules(
            allModules,
            'owner',
            'client',
            'agency',
            { all: true }
        );

        const keys = routes.map(r => r.key);
        expect(keys).toContain('module_invoicing');
        expect(keys).toContain('module_quotes');
        expect(keys).toContain('module_tasks');
        expect(keys).toContain('crm_clients');
        expect(keys).toContain('crm_pipeline');
        // Rentals is space-restricted to real_estate, so it must NOT appear in agency
        expect(keys).not.toContain('module_rentals');
    });

    it('shows module_invoicing to a Member when invoicing.view is granted', () => {
        const routes = filterRoutesByModules(
            allModules,
            'member',
            'client',
            'agency',
            { 'invoicing.view': true }
        );

        const keys = routes.map(r => r.key);
        expect(keys).toContain('module_invoicing');
    });

    it('hides module_invoicing from a Member when invoicing.view is missing or false', () => {
        const routes = filterRoutesByModules(
            allModules,
            'member',
            'client',
            'agency',
            { 'invoicing.view': false, 'crm.leads.view': true }
        );

        const keys = routes.map(r => r.key);
        expect(keys).not.toContain('module_invoicing');
        expect(keys).toContain('crm_clients');
    });

    it('hides module_invoicing from an Administrator if invoicing.view is explicitly revoked', () => {
        const routes = filterRoutesByModules(
            allModules,
            'admin',
            'client',
            'agency',
            { 'invoicing.view': false, 'operations.tasks.view': true }
        );

        const keys = routes.map(r => r.key);
        // Granular permission check takes absolute priority over legacy admin role
        expect(keys).not.toContain('module_invoicing');
        expect(keys).toContain('module_tasks');
    });

    it('shows module_quotes to a user when quotes.view is true, and hides it when false', () => {
        const withQuotes = filterRoutesByModules(
            allModules,
            'member',
            'client',
            'agency',
            { 'quotes.view': true }
        );
        expect(withQuotes.map(r => r.key)).toContain('module_quotes');

        const withoutQuotes = filterRoutesByModules(
            allModules,
            'member',
            'client',
            'agency',
            { 'quotes.view': false }
        );
        expect(withoutQuotes.map(r => r.key)).not.toContain('module_quotes');
    });

    it('enforces Space boundaries: rentals only shows in real_estate vertical even if user has rentals.view', () => {
        // In agency vertical: hidden
        const agencyRoutes = filterRoutesByModules(
            allModules,
            'admin',
            'client',
            'agency',
            { 'rentals.view': true }
        );
        expect(agencyRoutes.map(r => r.key)).not.toContain('module_rentals');

        // In real_estate vertical: visible if rentals.view is true
        const realEstateRoutes = filterRoutesByModules(
            allModules,
            'member',
            'client',
            'real_estate',
            { 'rentals.view': true }
        );
        expect(realEstateRoutes.map(r => r.key)).toContain('module_rentals');

        // In real_estate vertical: hidden if rentals.view is false
        const realEstateRevoked = filterRoutesByModules(
            allModules,
            'admin',
            'client',
            'real_estate',
            { 'rentals.view': false }
        );
        expect(realEstateRevoked.map(r => r.key)).not.toContain('module_rentals');
    });

    it('hides any module completely if the tenant is not subscribed, even if the user has permission', () => {
        // Tenant only has crm subscribed
        const unsubscribedRoutes = filterRoutesByModules(
            ['core_clients', 'core_crm'],
            'owner',
            'client',
            'agency',
            { all: true, 'invoicing.view': true }
        );

        const keys = unsubscribedRoutes.map(r => r.key);
        expect(keys).toContain('crm_clients');
        expect(keys).not.toContain('module_invoicing');
        expect(keys).not.toContain('module_tasks');
        expect(keys).not.toContain('module_resto_orders');
    });
});
