import { afterEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@/modules/core/iam/actions/permissions';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  requirePermission: vi.fn().mockResolvedValue(undefined),
  getCurrentOrganizationId: vi.fn().mockResolvedValue('test-org-123'),
  requireOrgRole: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/modules/core/database/supabase-server', () => ({
  createClient: mocks.createClient,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/modules/core/iam/services/role-service', () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock('@/modules/core/organizations/organization-actions', () => ({
  getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}));

vi.mock('@/modules/core/iam/services/org-roles', () => ({
  requireOrgRole: mocks.requireOrgRole,
}));

import {
  createLease,
  updateLease,
  terminateLease,
  getLeases,
  getLeaseById,
  generateMonthlySettlements,
  recordTenantPayment,
  recordOwnerPayout,
  addDeduction,
  getSettlements,
  updatePropertyRentalStatusAction,
} from './rentals-service';

afterEach(() => {
  vi.restoreAllMocks();
  mocks.requirePermission.mockReset();
  mocks.requirePermission.mockResolvedValue(undefined);
  mocks.getCurrentOrganizationId.mockReset();
  mocks.getCurrentOrganizationId.mockResolvedValue('test-org-123');
  mocks.requireOrgRole.mockReset();
  mocks.requireOrgRole.mockResolvedValue(undefined);
  mocks.createClient.mockReset();
});

describe('rentals-service IAM permission enforcement', () => {
  const setupMockSupabase = (customOverrides: Record<string, any> = {}) => {
    const defaultChain: any = {
      select: vi.fn(() => defaultChain),
      insert: vi.fn(() => defaultChain),
      update: vi.fn(() => defaultChain),
      delete: vi.fn(() => defaultChain),
      eq: vi.fn(() => defaultChain),
      in: vi.fn(() => defaultChain),
      is: vi.fn(() => defaultChain),
      order: vi.fn(() => defaultChain),
      single: vi.fn(async () => ({ data: { id: 'lease-1' }, error: null })),
      maybeSingle: vi.fn(async () => ({ data: { id: 'prop-1' }, error: null })),
      ...customOverrides,
    };
    mocks.createClient.mockResolvedValue({
      from: vi.fn(() => defaultChain),
    });
    return defaultChain;
  };

  describe('Contract management permissions (RENTALS.MANAGE_CONTRACTS)', () => {
    it('enforces PERMISSIONS.RENTALS.MANAGE_CONTRACTS on createLease', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.contracts.manage".'));

      const result = await createLease({
        property_id: 'prop-1',
        tenant_id: 'lead-tenant',
        owner_id: 'lead-owner',
        monthly_rent: 1000000,
        start_date: '2026-01-01',
        end_date: '2027-01-01',
      } as any);

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_CONTRACTS,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.contracts.manage');
    });

    it('enforces PERMISSIONS.RENTALS.MANAGE_CONTRACTS on updateLease', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.contracts.manage".'));

      const result = await updateLease('lease-1', { monthly_rent: 1200000 });

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_CONTRACTS,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.contracts.manage');
    });

    it('enforces PERMISSIONS.RENTALS.MANAGE_CONTRACTS on terminateLease', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.contracts.manage".'));

      const result = await terminateLease('lease-1', 'Terminado por mutuo acuerdo');

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_CONTRACTS,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.contracts.manage');
    });
  });

  describe('Settlement management permissions (RENTALS.MANAGE_SETTLEMENTS)', () => {
    it('enforces PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS on generateMonthlySettlements', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.settlements.manage".'));

      const result = await generateMonthlySettlements('2026-10');

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.settlements.manage');
    });

    it('enforces PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS on recordTenantPayment', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.settlements.manage".'));

      const result = await recordTenantPayment({ settlement_id: 'settle-1' });

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.settlements.manage');
    });

    it('enforces PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS on recordOwnerPayout', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.settlements.manage".'));

      const result = await recordOwnerPayout({ settlement_id: 'settle-1' });

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.settlements.manage');
    });

    it('enforces PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS on addDeduction', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.settlements.manage".'));

      const result = await addDeduction('settle-1', {
        concept: 'Plomería',
        amount: 50000,
      });

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.settlements.manage');
    });
  });

  describe('View permissions (RENTALS.VIEW)', () => {
    it('enforces PERMISSIONS.RENTALS.VIEW on getLeases', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.view".'));

      const result = await getLeases();

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.VIEW,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.view');
    });

    it('enforces PERMISSIONS.RENTALS.VIEW on getLeaseById', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.view".'));

      const result = await getLeaseById('lease-1');

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.VIEW,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.view');
    });

    it('enforces PERMISSIONS.RENTALS.VIEW on getSettlements', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.view".'));

      const result = await getSettlements();

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.VIEW,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.view');
    });
  });

  describe('Property status management permissions (RENTALS.MANAGE_PROPERTIES)', () => {
    it('enforces PERMISSIONS.RENTALS.MANAGE_PROPERTIES on updatePropertyRentalStatusAction', async () => {
      setupMockSupabase();
      mocks.requirePermission.mockRejectedValueOnce(new Error('Acceso denegado: Se requiere el permiso "rentals.properties.manage".'));

      const result = await updatePropertyRentalStatusAction('prop-1', 'rented');

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_PROPERTIES,
        'test-org-123'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('rentals.properties.manage');
    });

    it('allows updatePropertyRentalStatusAction when permission is granted', async () => {
      setupMockSupabase();

      const result = await updatePropertyRentalStatusAction('prop-1', 'available');

      expect(mocks.requirePermission).toHaveBeenCalledWith(
        PERMISSIONS.RENTALS.MANAGE_PROPERTIES,
        'test-org-123'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ propertyId: 'prop-1', rentalStatus: 'available' });
    });
  });
});
