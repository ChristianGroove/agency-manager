// ==============================================================================
// PIXY EDU — TUITION BILLING & META WHATSAPP / WOMPI GATEWAY
// Module: module_school (School Space)
// Path: src/modules/features/school/services/tuition-billing-service.ts
// ==============================================================================

import crypto from 'crypto';
import type { SchoolTuitionInvoice, SchoolEnrollment } from '../types/school.types';

export interface TuitionCheckoutPayload {
  invoiceId: string;
  reference: string;
  amountInCents: number;
  currency: 'COP';
  signature: string;
  checkoutUrl: string;
}

export interface MetaWhatsAppHsmPayload {
  toPhoneNumber: string; // Colombian mobile format: e.g. "573001234567"
  templateName: string;
  languageCode: 'es_CO';
  components: Array<{
    type: 'header' | 'body' | 'button';
    sub_type?: 'url';
    index?: number;
    parameters: Array<{
      type: 'text';
      text: string;
    }>;
  }>;
}

/**
 * Sanitizes Colombian mobile phone numbers to official E.164 without '+'
 * e.g. "3001234567" -> "573001234567"
 */
export function formatColombianMobileNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('573')) {
    return digits;
  }
  return digits;
}

/**
 * Generates an SHA-256 HMAC integrity signature for Wompi payment sessions.
 * Standard format: Reference + AmountInCents + Currency + IntegritySecret
 */
export function generateWompiIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
): string {
  const rawString = `${reference}${amountInCents}${currency}${integritySecret}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

/**
 * Builds the official Meta WhatsApp Cloud API template payload for monthly tuition dispatch.
 */
export function buildMetaWhatsAppTuitionTemplate(params: {
  guardianPhone: string;
  guardianName: string;
  schoolName: string;
  studentName: string;
  monthName: string;
  amountCOP: number;
  wompiCheckoutUrl: string;
}): MetaWhatsAppHsmPayload {
  const formattedPhone = formatColombianMobileNumber(params.guardianPhone);
  const formattedAmount = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(params.amountCOP);

  return {
    toPhoneNumber: formattedPhone,
    templateName: 'pixy_edu_tuition_invoice_v1',
    languageCode: 'es_CO',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.guardianName },
          { type: 'text', text: params.schoolName },
          { type: 'text', text: params.studentName },
          { type: 'text', text: params.monthName },
          { type: 'text', text: formattedAmount },
          { type: 'text', text: params.wompiCheckoutUrl },
        ],
      },
    ],
  };
}

/**
 * Verifies whether a student has any pending tuition debt that locks
 * their official report card / bulletin download.
 */
export function evaluateTuitionClearance(invoices: SchoolTuitionInvoice[]): {
  isCleared: boolean;
  totalDebtAmount: number;
  overdueCount: number;
  unpaidInvoices: SchoolTuitionInvoice[];
} {
  const unpaid = invoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'late'
  );

  const totalDebt = unpaid.reduce((acc, curr) => acc + (curr.amount + curr.late_fee_amount), 0);
  const overdueCount = unpaid.filter((inv) => inv.status === 'late').length;

  return {
    isCleared: unpaid.length === 0,
    totalDebtAmount: totalDebt,
    overdueCount,
    unpaidInvoices: unpaid,
  };
}
