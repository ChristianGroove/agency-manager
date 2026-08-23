"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  DollarSign,
  Plus,
  Loader2,
  Calendar,
  Building2,
  Users,
  ExternalLink,
  CreditCard,
  Banknote,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "../services/settlement-calculator";
import { generateTenantPaymentWhatsAppLink } from "../services/whatsapp-notifier";
import {
  recordTenantPaymentAction,
  generateMonthlySettlementsAction,
} from "../actions/settlements";
import type {
  PropertyLeaseSettlement,
  TenantPaymentStatus,
} from "../types/rentals.types";
import { cn } from "@/modules/infrastructure/utils/utils";

interface CollectionsTabProps {
  settlements: PropertyLeaseSettlement[];
  onSettlementUpdated: (updatedSettlement: PropertyLeaseSettlement) => void;
  onRefreshSettlements: () => void;
  agencyName?: string;
}

export function CollectionsTab({
  settlements = [],
  onSettlementUpdated,
  onRefreshSettlements,
  agencyName = "Praxis Inmobiliaria",
}: CollectionsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  // Payment Recording Modal State
  const [recordingSettlement, setRecordingSettlement] = useState<PropertyLeaseSettlement | null>(null);
  const [paidAt, setPaidAt] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("transfer_pse");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [isRecording, startRecording] = useTransition();

  // Generation Modal State
  const [isGenerating, startGeneration] = useTransition();
  const [targetPeriod, setTargetPeriod] = useState<string>(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`;
  });

  // Extract unique periods
  const periods = Array.from(new Set(settlements.map((s) => s.period).filter(Boolean))).sort().reverse();

  // Filter settlements
  const filteredSettlements = settlements.filter((s) => {
    // 1. Period filter
    if (periodFilter !== "all" && s.period !== periodFilter) {
      return false;
    }

    // 2. Status filter
    if (statusFilter !== "all" && s.tenant_payment_status !== statusFilter) {
      return false;
    }

    // 3. Search query
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();

    const tenantName = s.lease?.tenant?.name?.toLowerCase() || "";
    const propName = s.lease?.property?.name?.toLowerCase() || "";
    const phone = s.lease?.tenant?.phone?.toLowerCase() || "";
    const receipt = s.receipt_number?.toLowerCase() || "";

    return (
      tenantName.includes(query) ||
      propName.includes(query) ||
      phone.includes(query) ||
      receipt.includes(query)
    );
  });

  // Semáforo Counts
  const onTimeCount = settlements.filter((s) => s.tenant_payment_status === "paid").length;
  const pendingCount = settlements.filter((s) => s.tenant_payment_status === "pending").length;
  const lateCount = settlements.filter((s) => s.tenant_payment_status === "late").length;
  const lateSum = settlements
    .filter((s) => s.tenant_payment_status === "late")
    .reduce((acc, s) => acc + (Number(s.gross_collected) || Number(s.rent_amount) || 0), 0);

  const handleOpenRecordPayment = (settlement: PropertyLeaseSettlement) => {
    setRecordingSettlement(settlement);
    setPaidAt(new Date().toISOString().split("T")[0]);
    setPaymentProofUrl(settlement.payment_proof_url || "");
    setPaymentMethod("transfer_pse");
    setPaymentNotes("");
  };

  const handleConfirmRecordPayment = () => {
    if (!recordingSettlement) return;

    startRecording(async () => {
      try {
        const res = await recordTenantPaymentAction({
          settlement_id: recordingSettlement.id,
          paid_at: paidAt,
          payment_proof_url: paymentProofUrl.trim() || null,
          payment_method: paymentMethod,
          notes: paymentNotes.trim() || null,
        });

        if (res.success && res.data) {
          toast.success("Pago del inquilino registrado exitosamente");
          onSettlementUpdated(res.data);
          setRecordingSettlement(null);
        } else {
          toast.error(res.error || "Error al registrar el pago");
        }
      } catch (err: any) {
        console.error("Error recording payment:", err);
        toast.error("Error inesperado al registrar el pago");
      }
    });
  };

  const handleSendWhatsAppReminder = (settlement: PropertyLeaseSettlement) => {
    const lease = settlement.lease;
    const tenant = lease?.tenant;
    const property = lease?.property;

    if (!tenant?.phone) {
      toast.error("El inquilino no tiene un teléfono registrado para WhatsApp");
      return;
    }

    const waLink = generateTenantPaymentWhatsAppLink({
      tenantName: tenant.name || "Inquilino",
      tenantPhone: tenant.phone,
      propertyTitle: property?.name || "Inmueble",
      period: settlement.period,
      monthlyRent: settlement.rent_amount,
      adminFee: settlement.admin_fee_amount,
      adminPaidBy: lease?.admin_paid_by || "agency",
      paymentDay: lease?.payment_day || 5,
      paymentLink: `https://pixy.app/p/pay-${settlement.id.slice(0, 8)}`,
      agencyName,
    });

    window.open(waLink, "_blank");
  };

  const handleGeneratePeriodSettlements = () => {
    startGeneration(async () => {
      try {
        const res = await generateMonthlySettlementsAction(targetPeriod);
        if (res.success) {
          toast.success(`Liquidaciones generadas exitosamente para el periodo ${targetPeriod}`);
          onRefreshSettlements();
        } else {
          toast.error(res.error || "Error al generar liquidaciones del periodo");
        }
      } catch (err: any) {
        console.error("Error generating settlements:", err);
        toast.error("Error inesperado al generar liquidaciones");
      }
    });
  };

  const formatColombianDate = (dateStr?: string | null): string => {
    if (!dateStr) return "";
    try {
      const cleanStr = dateStr.split("T")[0];
      const parts = cleanStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return cleanStr;
        const dd = String(day).padStart(2, "0");
        const mm = String(month + 1).padStart(2, "0");
        return `${dd}/${mm}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr || "";
    }
  };

  const stepMonth = (currentPeriod: string, delta: number): string => {
    try {
      const [yearStr, monthStr] = currentPeriod.split("-");
      let y = parseInt(yearStr, 10);
      let m = parseInt(monthStr, 10);
      if (isNaN(y) || isNaN(m)) {
        const now = new Date();
        y = now.getFullYear();
        m = now.getMonth() + 1;
      }
      m += delta;
      if (m > 12) {
        y += 1;
        m = 1;
      } else if (m < 1) {
        y -= 1;
        m = 12;
      }
      return `${y}-${String(m).padStart(2, "0")}`;
    } catch {
      return currentPeriod;
    }
  };

  const getStatusBadge = (status: TenantPaymentStatus) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-bold">
            ● Al Día
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] font-bold">
            ● Por Vencer
          </Badge>
        );
      case "late":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] font-bold">
            ● En Mora
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20 text-[11px] font-bold">
            ● Abono Parcial
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Semáforo Pipeline Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Al Día (Pagados)
            </span>
            <div className="text-2xl font-black text-emerald-950 dark:text-emerald-200">
              {onTimeCount}
            </div>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
              Cánones recaudados oportunamente
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-600" />
              Por Vencer / En Plazo
            </span>
            <div className="text-2xl font-black text-blue-950 dark:text-blue-200">
              {pendingCount}
            </div>
            <p className="text-[10px] text-blue-700/80 dark:text-blue-400">
              Pendientes de cobro dentro del mes
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              En Mora / Cartera Vencida
            </span>
            <div className="text-2xl font-black text-rose-950 dark:text-rose-200">
              {formatCOP(lateSum)}
            </div>
            <p className="text-[10px] text-rose-700/80 dark:text-rose-400">
              {lateCount} inquilino(s) con fecha límite vencida
            </p>
          </div>
        </div>
      </div>

      {/* 2. Controls Bar (Search, Status Filter, Period Filter, Generate Period Button) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por inquilino, inmueble, teléfono o recibo..."
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
              <SelectValue placeholder="Semáforo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
              <SelectItem value="paid" className="text-xs font-semibold text-emerald-600">Al Día</SelectItem>
              <SelectItem value="pending" className="text-xs font-semibold text-blue-600">Por Vencer</SelectItem>
              <SelectItem value="late" className="text-xs font-semibold text-rose-600">En Mora</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-0.5 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTargetPeriod((prev) => stepMonth(prev, -1))}
                className="h-8 w-8 p-0 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                title="Mes anterior"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(e.target.value)}
                placeholder="YYYY-MM"
                className="w-20 h-8 rounded-none text-xs font-mono font-bold text-center border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 text-zinc-900 dark:text-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTargetPeriod((prev) => stepMonth(prev, 1))}
                className="h-8 w-8 p-0 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                title="Mes siguiente"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isGenerating}
              onClick={handleGeneratePeriodSettlements}
              className="rounded-xl h-10 px-3.5 text-xs font-bold border-brand-pink/30 hover:bg-brand-pink/10 text-brand-pink gap-1.5 shadow-sm"
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
              Generar Mes
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Settlements / Collections Table */}
      {filteredSettlements.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm space-y-3">
          <div className="p-3 w-fit mx-auto rounded-2xl bg-blue-500/10 text-blue-500">
            <CreditCard className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            No hay registros de recaudo para este filtro
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Puedes generar las liquidaciones del periodo actual con el botón &quot;Generar Mes&quot; arriba.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-zinc-200/80 dark:border-white/10 overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Inquilino & Teléfono</th>
                  <th className="py-3.5 px-4">Inmueble</th>
                  <th className="py-3.5 px-4">Periodo</th>
                  <th className="py-3.5 px-4">Total a Recaudar</th>
                  <th className="py-3.5 px-4">Día Límite</th>
                  <th className="py-3.5 px-4">Semáforo</th>
                  <th className="py-3.5 px-4 text-right">Acciones de Cobro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                {filteredSettlements.map((s) => {
                  const lease = s.lease;
                  const tenant = lease?.tenant;
                  const property = lease?.property;
                  const totalDue = Number(s.gross_collected) || Number(s.rent_amount) || 0;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-500" />
                          {tenant?.name || "Sin inquilino"}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {tenant?.phone || tenant?.email || "Sin contacto"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {property?.name || "Inmueble"}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {property?.real_estate_details?.neighborhood || "Ibagué"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                        {s.period}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white text-sm">
                        {formatCOP(totalDue)}
                        {s.admin_fee_amount > 0 && lease?.admin_paid_by === "agency" && (
                          <span className="block text-[10px] text-zinc-400 font-normal">
                            (Incluye Admon {formatCOP(s.admin_fee_amount)})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        Día {lease?.payment_day || 5} de cada mes
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(s.tenant_payment_status)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 1-Click WhatsApp Reminder */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendWhatsAppReminder(s)}
                            className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            title="Enviar cobro / link de pago por WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Recordar</span>
                          </Button>

                          {/* Record Payment Button */}
                          {s.tenant_payment_status !== "paid" ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleOpenRecordPayment(s)}
                              className="rounded-xl h-8 px-2.5 text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              Registrar Pago
                            </Button>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-mono px-2 py-0.5">
                              Pagado ({s.tenant_paid_at ? formatColombianDate(s.tenant_paid_at) : "OK"})
                            </Badge>
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

      {/* Record Tenant Payment Dialog */}
      <Dialog
        open={!!recordingSettlement}
        onOpenChange={(open) => !open && setRecordingSettlement(null)}
      >
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="p-2.5 w-fit rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Banknote className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-white">
              Registrar Pago de Canon
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Inquilino: <strong>{recordingSettlement?.lease?.tenant?.name}</strong> • Periodo:{" "}
              <strong>{recordingSettlement?.period}</strong> • Monto:{" "}
              <strong className="text-brand-pink">
                {formatCOP(
                  Number(recordingSettlement?.gross_collected) ||
                    Number(recordingSettlement?.rent_amount) ||
                    0
                )}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Fecha del Pago
              </Label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="rounded-xl h-10 border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Medio de Pago
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="rounded-xl h-10 border-zinc-200 dark:border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="transfer_pse" className="text-xs">
                    Transferencia Bancaria / PSE
                  </SelectItem>
                  <SelectItem value="wompi" className="text-xs">
                    Pasarela Wompi / Tarjeta de Crédito
                  </SelectItem>
                  <SelectItem value="nequi_daviplata" className="text-xs">
                    Nequi / Daviplata
                  </SelectItem>
                  <SelectItem value="cash" className="text-xs">
                    Efectivo en Oficina
                  </SelectItem>
                  <SelectItem value="consignation" className="text-xs">
                    Consignación en Corresponsal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                URL del Comprobante / Voucher (Opcional)
              </Label>
              <Input
                value={paymentProofUrl}
                onChange={(e) => setPaymentProofUrl(e.target.value)}
                placeholder="https://storage.pixy.app/comprobantes/..."
                className="rounded-xl h-10 border-zinc-200 dark:border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Notas adicionales
              </Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Número de aprobación, banco emisor, observaciones..."
                className="rounded-xl border-zinc-200 dark:border-zinc-800 min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRecordingSettlement(null)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isRecording}
              onClick={handleConfirmRecordPayment}
              className="rounded-xl text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1"
            >
              {isRecording ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Confirmar Recaudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
