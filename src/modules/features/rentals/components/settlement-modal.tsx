"use client";

import React, { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  DollarSign,
  Landmark,
  Plus,
  Trash2,
  FileText,
  MessageCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Wrench,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "../services/settlement-calculator";
import { generateOwnerPayoutWhatsAppLink } from "../services/whatsapp-notifier";
import { addDeductionAction, recordOwnerPayoutAction } from "../actions/settlements";
import type {
  PropertyLeaseSettlement,
  SettlementDeduction,
  DeductionInput,
} from "../types/rentals.types";
import { cn } from "@/modules/infrastructure/utils/utils";

interface SettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: PropertyLeaseSettlement | null;
  onSuccess: (updatedSettlement: PropertyLeaseSettlement) => void;
  agencyName?: string;
}

export function SettlementModal({
  open,
  onOpenChange,
  settlement,
  onSuccess,
  agencyName = "Praxis Inmobiliaria",
}: SettlementModalProps) {
  const [isPending, startTransition] = useTransition();

  // Deduction Form state
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>("maintenance");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [deductionNotes, setDeductionNotes] = useState("");

  if (!settlement) return null;

  const lease = settlement.lease;
  const property = lease?.property;
  const owner = lease?.owner;
  const bankDetails = lease?.bank_payout_details;

  const propertyTitle = property?.name || "Inmueble en Arriendo";
  const ownerName = owner?.name || bankDetails?.account_holder || "Propietario";
  const ownerPhone = owner?.phone || "";
  const bankName = bankDetails?.bank || "Banco Destino";
  const accountNumber = bankDetails?.account_number || "Sin cuenta registrada";

  const deductionsList: SettlementDeduction[] = Array.isArray(settlement.deductions)
    ? settlement.deductions
    : [];

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!concept.trim()) {
      toast.error("El concepto de la deducción es requerido");
      return;
    }
    if (amount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    const newDeduction: DeductionInput = {
      concept: concept.trim(),
      amount: Number(amount),
      category: category as any,
      receipt_url: receiptUrl.trim() || undefined,
      notes: deductionNotes.trim() || undefined,
      date: new Date().toISOString().split("T")[0],
    };

    startTransition(async () => {
      try {
        const res = await addDeductionAction(settlement.id, newDeduction);
        if (res.success && res.data) {
          toast.success("Deducción agregada y liquidación recalculada exitosamente");
          onSuccess(res.data);
          // Reset deduction form
          setConcept("");
          setAmount(0);
          setCategory("maintenance");
          setReceiptUrl("");
          setDeductionNotes("");
          setShowAddDeduction(false);
        } else {
          toast.error(res.error || "Error al agregar la deducción");
        }
      } catch (err: any) {
        console.error("Error adding deduction:", err);
        toast.error("Error inesperado al agregar la deducción");
      }
    });
  };

  const handleRecordPayout = () => {
    startTransition(async () => {
      try {
        const res = await recordOwnerPayoutAction({
          settlement_id: settlement.id,
          paid_at: new Date().toISOString(),
          receipt_number: settlement.receipt_number || `REC-${Date.now()}`,
        });

        if (res.success && res.data) {
          toast.success("Dispersión al propietario registrada exitosamente");
          onSuccess(res.data);

          // Trigger WhatsApp notification link
          if (ownerPhone) {
            const waLink = generateOwnerPayoutWhatsAppLink({
              ownerName,
              ownerPhone,
              propertyTitle,
              period: settlement.period,
              rentAmount: settlement.rent_amount,
              commissionAmount: settlement.commission_amount,
              vatAmount: settlement.vat_amount,
              adminFeeAmount: settlement.admin_fee_amount,
              adminPaidBy: lease?.admin_paid_by || "agency",
              deductionsAmount: res.data.deductions_amount || 0,
              netOwnerPayout: res.data.net_owner_payout || 0,
              bankName,
              accountNumber,
              statementPdfUrl: res.data.statement_pdf_url || undefined,
              agencyName,
            });
            window.open(waLink, "_blank");
          }
        } else {
          toast.error(res.error || "Error al registrar la dispersión");
        }
      } catch (err: any) {
        console.error("Error recording payout:", err);
        toast.error("Error inesperado al registrar la dispersión");
      }
    });
  };

  const handleSendWhatsAppStatement = () => {
    if (!ownerPhone) {
      toast.error("El propietario no tiene un teléfono registrado para WhatsApp");
      return;
    }

    const waLink = generateOwnerPayoutWhatsAppLink({
      ownerName,
      ownerPhone,
      propertyTitle,
      period: settlement.period,
      rentAmount: settlement.rent_amount,
      commissionAmount: settlement.commission_amount,
      vatAmount: settlement.vat_amount,
      adminFeeAmount: settlement.admin_fee_amount,
      adminPaidBy: lease?.admin_paid_by || "agency",
      deductionsAmount: settlement.deductions_amount || 0,
      netOwnerPayout: settlement.net_owner_payout || 0,
      bankName,
      accountNumber,
      statementPdfUrl: settlement.statement_pdf_url || undefined,
      agencyName,
    });

    window.open(waLink, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-3xl overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-brand-pink/10 text-brand-pink">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>Liquidación Periodo {settlement.period}</span>
                  {settlement.owner_payout_status === "paid" ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                      PAGADO AL PROPIETARIO
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold">
                      PENDIENTE DE DISPERSIÓN
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {propertyTitle} • Propietario: {ownerName}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Financial Breakdown Table */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 overflow-hidden bg-zinc-50/40 dark:bg-zinc-900/40">
            <div className="p-4 bg-zinc-100/60 dark:bg-zinc-800/40 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Desglose Financiero Liquidado
              </span>
              {settlement.receipt_number && (
                <span className="text-[11px] font-mono text-zinc-500">
                  Nº {settlement.receipt_number}
                </span>
              )}
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-zinc-200/40 dark:border-white/5">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Canon de Arrendamiento Recaudado:</span>
                <span className="font-bold text-zinc-900 dark:text-white font-mono text-sm">
                  {formatCOP(settlement.rent_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-zinc-200/40 dark:border-white/5">
                <span className="text-zinc-600 dark:text-zinc-400">
                  - Comisión de Agencia ({lease?.commission_percentage ?? 8}%):
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                  -{formatCOP(settlement.commission_amount)}
                </span>
              </div>

              {settlement.vat_amount > 0 && (
                <div className="flex items-center justify-between py-1 border-b border-zinc-200/40 dark:border-white/5">
                  <span className="text-zinc-600 dark:text-zinc-400">- IVA sobre Comisión (19%):</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                    -{formatCOP(settlement.vat_amount)}
                  </span>
                </div>
              )}

              {settlement.admin_fee_amount > 0 && lease?.admin_paid_by === "agency" && (
                <div className="flex items-center justify-between py-1 border-b border-zinc-200/40 dark:border-white/5">
                  <span className="text-zinc-600 dark:text-zinc-400">- Pago Administración a Copropiedad:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                    -{formatCOP(settlement.admin_fee_amount)}
                  </span>
                </div>
              )}

              {settlement.deductions_amount > 0 && (
                <div className="flex items-center justify-between py-1 border-b border-zinc-200/40 dark:border-white/5">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    - Deducciones por Mantenimiento / Reparaciones:
                  </span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                    -{formatCOP(settlement.deductions_amount)}
                  </span>
                </div>
              )}

              {/* Net Payout Highlight */}
              <div className="flex items-center justify-between pt-3 mt-1 text-sm bg-brand-pink/5 dark:bg-brand-pink/10 p-3 rounded-xl border border-brand-pink/20">
                <span className="font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                  Neto a Transferir al Propietario:
                </span>
                <span className="font-black text-brand-pink font-mono text-base">
                  {formatCOP(settlement.net_owner_payout)}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Destination Box */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-white/10 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-brand-pink" />
                Cuenta Bancaria de Destino
              </span>
              <p className="font-bold text-zinc-900 dark:text-white">
                {bankName} • {bankDetails?.account_type === "checking" ? "Corriente" : "Ahorros"} Nº {accountNumber}
              </p>
              <p className="text-[11px] text-zinc-500">
                Titular: {bankDetails?.account_holder || ownerName} (CC/NIT: {bankDetails?.id_number || "N/A"})
              </p>
            </div>
          </div>

          {/* Itemized Deductions Inspector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-brand-pink" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Deducciones y Mantenimiento ({deductionsList.length})
                </h3>
              </div>

              {!showAddDeduction && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddDeduction(true)}
                  className="rounded-xl h-8 px-3 text-xs font-semibold gap-1 text-brand-pink border-brand-pink/30 hover:bg-brand-pink/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar Deducción
                </Button>
              )}
            </div>

            {/* Existing Deductions List */}
            {deductionsList.length === 0 && !showAddDeduction ? (
              <div className="p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                No hay deducciones de mantenimiento registradas para este periodo.
              </div>
            ) : (
              <div className="space-y-2">
                {deductionsList.map((ded, idx) => (
                  <div
                    key={ded.id || idx}
                    className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-white">{ded.concept}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                          {ded.category || "Mantenimiento"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span>{ded.date || "Fecha no especificada"}</span>
                        {ded.notes && <span>• {ded.notes}</span>}
                        {ded.receipt_url && (
                          <a
                            href={ded.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-pink hover:underline inline-flex items-center gap-0.5 font-semibold"
                          >
                            Ver Factura <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <span className="font-bold font-mono text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                      -{formatCOP(Number(ded.amount) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add Deduction Form Drawer/Card */}
            {showAddDeduction && (
              <form
                onSubmit={handleAddDeduction}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-brand-pink/30 space-y-4 animate-in fade-in duration-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    Nueva Deducción / Reparación
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddDeduction(false)}
                    className="h-7 text-xs text-zinc-400"
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Concepto *
                    </Label>
                    <Input
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      placeholder="Ej: Reparación motobomba / plomería"
                      className="rounded-xl h-9 text-xs border-zinc-200 dark:border-zinc-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Monto Deducción (COP) *
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={5000}
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder="Ej: 150000"
                      className="rounded-xl h-9 text-xs font-mono font-bold border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      Categoría
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="rounded-xl h-9 text-xs border-zinc-200 dark:border-zinc-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="maintenance" className="text-xs">Mantenimiento General</SelectItem>
                        <SelectItem value="repair" className="text-xs">Reparación / Daño</SelectItem>
                        <SelectItem value="utility" className="text-xs">Servicios Públicos Pendientes</SelectItem>
                        <SelectItem value="legal" className="text-xs">Gastos Legales / Póliza</SelectItem>
                        <SelectItem value="tax" className="text-xs">Impuestos / Retenciones</SelectItem>
                        <SelectItem value="other" className="text-xs">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      URL Factura / Comprobante
                    </Label>
                    <Input
                      value={receiptUrl}
                      onChange={(e) => setReceiptUrl(e.target.value)}
                      placeholder="https://storage.pixy.app/facturas/..."
                      className="rounded-xl h-9 text-xs border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    Notas adicionales
                  </Label>
                  <Input
                    value={deductionNotes}
                    onChange={(e) => setDeductionNotes(e.target.value)}
                    placeholder="Detalles sobre técnico, garantía de arreglo, etc."
                    className="rounded-xl h-9 text-xs border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl h-9 text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Guardar Deducción
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendWhatsAppStatement}
            className="rounded-xl text-xs font-bold gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <MessageCircle className="h-4 w-4" />
            Reenviar Extracto WhatsApp
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cerrar
            </Button>

            {settlement.owner_payout_status !== "paid" && (
              <Button
                type="button"
                disabled={isPending}
                onClick={handleRecordPayout}
                className="rounded-xl text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1.5 shadow-md shadow-brand-pink/20"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Marcar como Pagado & Enviar Extracto
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
