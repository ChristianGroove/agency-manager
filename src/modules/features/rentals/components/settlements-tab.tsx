"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Receipt,
  Landmark,
  Building2,
  DollarSign,
  MessageCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Wrench,
  Eye,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "../services/settlement-calculator";
import { generateOwnerPayoutWhatsAppLink } from "../services/whatsapp-notifier";
import { recordOwnerPayoutAction } from "../actions/settlements";
import type {
  PropertyLeaseSettlement,
  OwnerPayoutStatus,
} from "../types/rentals.types";
import { cn } from "@/modules/infrastructure/utils/utils";

interface SettlementsTabProps {
  settlements: PropertyLeaseSettlement[];
  onInspectSettlement: (settlement: PropertyLeaseSettlement) => void;
  onSettlementUpdated: (updatedSettlement: PropertyLeaseSettlement) => void;
  agencyName?: string;
}

export function SettlementsTab({
  settlements = [],
  onInspectSettlement,
  onSettlementUpdated,
  agencyName = "Praxis Inmobiliaria",
}: SettlementsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [isProcessing, startProcessing] = useTransition();

  // Extract unique periods
  const periods = Array.from(new Set(settlements.map((s) => s.period).filter(Boolean))).sort().reverse();

  // Filter settlements
  const filteredSettlements = settlements.filter((s) => {
    // 1. Period filter
    if (periodFilter !== "all" && s.period !== periodFilter) {
      return false;
    }

    // 2. Status filter
    if (statusFilter !== "all" && s.owner_payout_status !== statusFilter) {
      return false;
    }

    // 3. Search query
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();

    const ownerName = s.lease?.owner?.name?.toLowerCase() || "";
    const propName = s.lease?.property?.name?.toLowerCase() || "";
    const bank = s.lease?.bank_payout_details?.bank?.toLowerCase() || "";
    const receipt = s.receipt_number?.toLowerCase() || "";

    return (
      ownerName.includes(query) ||
      propName.includes(query) ||
      bank.includes(query) ||
      receipt.includes(query)
    );
  });

  const handleQuickPayAndSendWhatsApp = (settlement: PropertyLeaseSettlement) => {
    const lease = settlement.lease;
    const owner = lease?.owner;
    const property = lease?.property;
    const bankDetails = lease?.bank_payout_details;

    startProcessing(async () => {
      try {
        const res = await recordOwnerPayoutAction({
          settlement_id: settlement.id,
          paid_at: new Date().toISOString(),
          receipt_number: settlement.receipt_number || `LIQ-${settlement.period.replace("-", "")}-${settlement.id.slice(0, 5).toUpperCase()}`,
        });

        if (res.success && res.data) {
          toast.success("Dispersión registrada exitosamente");
          onSettlementUpdated(res.data);

          // Open WhatsApp statement
          if (owner?.phone) {
            const waLink = generateOwnerPayoutWhatsAppLink({
              ownerName: owner.name || bankDetails?.account_holder || "Propietario",
              ownerPhone: owner.phone,
              propertyTitle: property?.name || "Inmueble",
              period: settlement.period,
              rentAmount: settlement.rent_amount,
              commissionAmount: settlement.commission_amount,
              vatAmount: settlement.vat_amount,
              adminFeeAmount: settlement.admin_fee_amount,
              adminPaidBy: lease?.admin_paid_by || "agency",
              deductionsAmount: res.data.deductions_amount || 0,
              netOwnerPayout: res.data.net_owner_payout || 0,
              bankName: bankDetails?.bank || "Banco Destino",
              accountNumber: bankDetails?.account_number || "Sin cuenta",
              statementPdfUrl: res.data.statement_pdf_url || undefined,
              agencyName,
            });
            window.open(waLink, "_blank");
          }
        } else {
          toast.error(res.error || "Error al procesar el pago");
        }
      } catch (err: any) {
        console.error("Error paying settlement:", err);
        toast.error("Error inesperado al procesar la liquidación");
      }
    });
  };

  const handleSendWhatsAppOnly = (settlement: PropertyLeaseSettlement) => {
    const lease = settlement.lease;
    const owner = lease?.owner;
    const property = lease?.property;
    const bankDetails = lease?.bank_payout_details;

    if (!owner?.phone) {
      toast.error("El propietario no tiene un teléfono registrado para WhatsApp");
      return;
    }

    const waLink = generateOwnerPayoutWhatsAppLink({
      ownerName: owner.name || bankDetails?.account_holder || "Propietario",
      ownerPhone: owner.phone,
      propertyTitle: property?.name || "Inmueble",
      period: settlement.period,
      rentAmount: settlement.rent_amount,
      commissionAmount: settlement.commission_amount,
      vatAmount: settlement.vat_amount,
      adminFeeAmount: settlement.admin_fee_amount,
      adminPaidBy: lease?.admin_paid_by || "agency",
      deductionsAmount: settlement.deductions_amount || 0,
      netOwnerPayout: settlement.net_owner_payout || 0,
      bankName: bankDetails?.bank || "Banco Destino",
      accountNumber: bankDetails?.account_number || "Sin cuenta",
      statementPdfUrl: settlement.statement_pdf_url || undefined,
      agencyName,
    });

    window.open(waLink, "_blank");
  };

  const getStatusBadge = (status: OwnerPayoutStatus) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-bold">
            ● Pagado
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] font-bold">
            ● Pendiente
          </Badge>
        );
      case "held":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] font-bold">
            ● Retenido
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Controls Bar (Search, Status Filter, Period Filter) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por propietario, inmueble, banco o número de liquidación..."
              className="rounded-xl pl-9 h-10 border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-xs"
            />
          </div>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[140px] rounded-xl h-10 text-xs border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">Todos los meses</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p} value={p} className="text-xs font-mono">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] rounded-xl h-10 text-xs border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80">
              <SelectValue placeholder="Estado Pago" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
              <SelectItem value="pending" className="text-xs font-semibold text-amber-600">Pendientes</SelectItem>
              <SelectItem value="paid" className="text-xs font-semibold text-emerald-600">Pagados</SelectItem>
              <SelectItem value="held" className="text-xs font-semibold text-rose-600">Retenidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2. Settlements Ledger Table */}
      {filteredSettlements.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm space-y-3">
          <div className="p-3 w-fit mx-auto rounded-2xl bg-amber-500/10 text-amber-500">
            <Receipt className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            No se encontraron liquidaciones de propietarios
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Las liquidaciones mensuales se calculan automáticamente al generar el periodo de facturación en la pestaña de cobranzas.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-zinc-200/80 dark:border-white/10 overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Inmueble & Propietario</th>
                  <th className="py-3.5 px-4">Periodo</th>
                  <th className="py-3.5 px-4">Canon Recaudado</th>
                  <th className="py-3.5 px-4">Comisión + IVA</th>
                  <th className="py-3.5 px-4">Deducciones</th>
                  <th className="py-3.5 px-4">Neto a Transferir</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                {filteredSettlements.map((s) => {
                  const lease = s.lease;
                  const owner = lease?.owner;
                  const property = lease?.property;
                  const bankDetails = lease?.bank_payout_details;
                  const totalAgencyFee = (Number(s.commission_amount) || 0) + (Number(s.vat_amount) || 0);
                  const deductionsCount = Array.isArray(s.deductions) ? s.deductions.length : 0;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 dark:text-white">
                          {property?.name || "Inmueble"}
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Landmark className="h-3 w-3 text-amber-500" />
                          <span>{owner?.name || bankDetails?.account_holder || "Propietario"}</span>
                          <span className="text-zinc-400 font-mono">({bankDetails?.bank || "Banco"})</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                        {s.period}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatCOP(Number(s.rent_amount) || 0)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-rose-600 dark:text-rose-400">
                        -{formatCOP(totalAgencyFee)}
                        <span className="block text-[10px] text-zinc-400 font-normal">
                          (Com {formatCOP(s.commission_amount)} + IVA {formatCOP(s.vat_amount)})
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {s.deductions_amount > 0 ? (
                          <div className="text-rose-600 dark:text-rose-400 font-semibold">
                            -{formatCOP(s.deductions_amount)}
                            <span className="block text-[10px] text-zinc-400 font-normal">
                              {deductionsCount} {deductionsCount === 1 ? "ítem" : "ítems"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">$ 0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-brand-pink text-sm">
                        {formatCOP(Number(s.net_owner_payout) || 0)}
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(s.owner_payout_status)}</td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect / Deductions Modal */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onInspectSettlement(s)}
                            className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1 hover:border-brand-pink/40 hover:text-brand-pink"
                            title="Ver extracto y administrar deducciones de mantenimiento"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Inspeccionar</span>
                          </Button>

                          {/* Quick Pay & Send WhatsApp */}
                          {s.owner_payout_status !== "paid" ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleQuickPayAndSendWhatsApp(s)}
                              className="rounded-xl h-8 px-2.5 text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Pagar & Enviar</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendWhatsAppOnly(s)}
                              className="rounded-xl h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Reenviar comprobante por WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
