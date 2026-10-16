import { describe, expect, it, vi } from 'vitest';
import {
  createLeaseAction,
  updateLeaseAction,
  terminateLeaseAction,
  getLeasesAction,
  getLeaseByIdAction,
  updatePropertyRentalStatusAction,
} from './leases';
import * as RentalsService from '../services/rentals-service';

vi.mock('../services/rentals-service', () => ({
  createLease: vi.fn(),
  updateLease: vi.fn(),
  terminateLease: vi.fn(),
  getLeases: vi.fn(),
  getLeaseById: vi.fn(),
  updatePropertyRentalStatusAction: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('leases server actions', () => {
  it('delegates updatePropertyRentalStatusAction to RentalsService', async () => {
    vi.mocked(RentalsService.updatePropertyRentalStatusAction).mockResolvedValueOnce({
      success: true,
      data: { propertyId: 'prop-123', rentalStatus: 'rented' },
    });

    const result = await updatePropertyRentalStatusAction('prop-123', 'rented');

    expect(RentalsService.updatePropertyRentalStatusAction).toHaveBeenCalledWith('prop-123', 'rented');
    expect(result.success).toBe(true);
  });

  it('validates propertyId in updatePropertyRentalStatusAction', async () => {
    const result = await updatePropertyRentalStatusAction('', 'rented');
    expect(result.success).toBe(false);
    expect(result.error).toContain('requerido');
  });

  it('handles permission denial gracefully from RentalsService', async () => {
    vi.mocked(RentalsService.createLease).mockResolvedValueOnce({
      success: false,
      error: 'Acceso denegado: Se requiere el permiso "rentals.contracts.manage".',
    });

    const result = await createLeaseAction({
      property_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      tenant_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      owner_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      monthly_rent: 1000000,
      admin_fee: 0,
      commission_percentage: 8,
      deposit_amount: 0,
      start_date: '2026-01-01',
      end_date: '2027-01-01',
      payment_day: 5,
      payout_day: 10,
      bank_payout_details: {
        bank: 'Bancolombia',
        account_type: 'savings',
        account_number: '123456789',
        account_holder: 'Juan Perez',
        id_number: '12345678',
      },
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('rentals.contracts.manage');
  });
});
