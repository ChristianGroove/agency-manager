// ==============================================================================
// PIXY RENTFLOW PRO — WHATSAPP NOTIFICATION ENGINE
// Module: module_rentals (Real Estate Space)
// Path: src/modules/features/rentals/services/whatsapp-notifier.ts
// ==============================================================================

import { normalizePhone } from '@/modules/infrastructure/utils/normalize-phone';
import { formatCOP } from './settlement-calculator';
import type {
  TenantPaymentReminderParams,
  OwnerPayoutNotificationParams,
} from '../types/rentals.types';

/**
 * Generate 1-click WhatsApp payment reminder link for tenants
 * Includes breakdown of rent + admin, due date, and online payment link (PSE / Wompi)
 */
export function generateTenantPaymentWhatsAppLink(params: TenantPaymentReminderParams): string {
  const totalDue = params.adminPaidBy === 'agency'
    ? (params.monthlyRent || 0) + (params.adminFee || 0)
    : (params.monthlyRent || 0);

  const agencyHeader = params.agencyName ? `🏢 *${params.agencyName}*` : '🏢 *Gestión Inmobiliaria*';

  const lines = [
    `${agencyHeader} - Recordatorio de Pago`,
    ``,
    `Hola *${params.tenantName}*, te recordamos que el canon de arrendamiento para el periodo *${params.period}* del inmueble *${params.propertyTitle}* está próximo a vencer.`,
    ``,
    `💰 *Valor Canon:* ${formatCOP(params.monthlyRent)}`,
    params.adminFee > 0 && params.adminPaidBy === 'agency'
      ? `🏢 *Administración:* ${formatCOP(params.adminFee)}`
      : null,
    `💳 *Total a Pagar:* *${formatCOP(totalDue)}*`,
    `📅 *Fecha Límite:* Día ${params.paymentDay} de este mes`,
    ``,
    params.paymentLink
      ? `🔗 *Paga en línea aquí (PSE / Wompi / Tarjeta):*\n${params.paymentLink}`
      : `🏦 Puedes realizar tu transferencia y enviarnos el comprobante por este medio.`,
    ``,
    `¡Agradecemos tu puntualidad! ✨`,
  ].filter((line): line is string => line !== null);

  const message = lines.join('\n');
  const cleanPhone = normalizePhone(params.tenantPhone || '', 'CO');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate 1-click WhatsApp monthly statement and payout confirmation link for landlords
 * Includes full itemized breakdown (Rent, Commission, VAT, Admin, Deductions, Net Payout) and bank account info
 */
export function generateOwnerPayoutWhatsAppLink(params: OwnerPayoutNotificationParams): string {
  const agencyHeader = params.agencyName ? `🏠 *${params.agencyName}*` : '🏠 *Gestión Inmobiliaria*';

  const lines = [
    `${agencyHeader} - Liquidación de Arrendamiento`,
    ``,
    `Apreciado(a) *${params.ownerName}*, hemos procesado la liquidación de su inmueble *${params.propertyTitle}* correspondiente al periodo *${params.period}*.`,
    ``,
    `📊 *Resumen Financiero:*`,
    `• Canon Recaudado: ${formatCOP(params.rentAmount)}`,
    `• Comisión Agencia: -${formatCOP(params.commissionAmount)}`,
    params.vatAmount > 0 ? `• IVA Comisión (19%): -${formatCOP(params.vatAmount)}` : null,
    params.adminPaidBy === 'agency' && params.adminFeeAmount > 0
      ? `• Pago Administración: -${formatCOP(params.adminFeeAmount)}`
      : null,
    params.deductionsAmount > 0
      ? `• Deducciones / Mantenimiento: -${formatCOP(params.deductionsAmount)}`
      : null,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💵 *Neto Transferido:* *${formatCOP(params.netOwnerPayout)}*`,
    `🏦 *Cuenta Destino:* ${params.bankName} - Nº ${params.accountNumber}`,
    ``,
    params.statementPdfUrl
      ? `📄 *Descarga tu extracto detallado:*\n${params.statementPdfUrl}`
      : null,
    ``,
    `Gracias por confiar en nuestra gestión patrimonial. 🌟`,
  ].filter((line): line is string => line !== null);

  const message = lines.join('\n');
  const cleanPhone = normalizePhone(params.ownerPhone || '', 'CO');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
