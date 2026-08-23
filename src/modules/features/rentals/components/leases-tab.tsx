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
  Plus,
  KeyRound,
  Building2,
  Users,
  Landmark,
  Calendar,
  ShieldCheck,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  DollarSign,
  LayoutGrid,
  List,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "../services/settlement-calculator";
import { terminateLeaseAction } from "../actions/leases";
import type { PropertyLease, LeaseStatus } from "../types/rentals.types";
import { cn } from "@/modules/infrastructure/utils/utils";

interface LeasesTabProps {
  leases: PropertyLease[];
  onEditLease: (lease: PropertyLease) => void;
  onNewLease: () => void;
  onLeaseUpdated: (updatedLease: PropertyLease) => void;
}

export function LeasesTab({
  leases = [],
  onEditLease,
  onNewLease,
  onLeaseUpdated,
}: LeasesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Termination dialog state
  const [terminatingLease, setTerminatingLease] = useState<PropertyLease | null>(null);
  const [terminationNotes, setTerminationNotes] = useState("");
  const [isTerminating, startTermination] = useTransition();

  // Filter leases
  const filteredLeases = leases.filter((lease) => {
    // 1. Status filter
    if (statusFilter !== "all" && lease.status !== statusFilter) {
      return false;
    }

    // 2. Search query filter
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();

    const propName = lease.property?.name?.toLowerCase() || "";
    const neighborhood = lease.property?.real_estate_details?.neighborhood?.toLowerCase() || "";
    const city = lease.property?.real_estate_details?.city?.toLowerCase() || "";
    const tenantName = lease.tenant?.name?.toLowerCase() || "";
    const ownerName = lease.owner?.name?.toLowerCase() || "";
    const policy = lease.guarantee_details?.policy_number?.toLowerCase() || "";

    return (
      propName.includes(query) ||
      neighborhood.includes(query) ||
      city.includes(query) ||
      tenantName.includes(query) ||
      ownerName.includes(query) ||
      policy.includes(query)
    );
  });

  const handleConfirmTermination = () => {
    if (!terminatingLease) return;

    startTermination(async () => {
      try {
        const res = await terminateLeaseAction(terminatingLease.id, terminationNotes);
        if (res.success && res.data) {
          toast.success("Contrato terminado y propiedad liberada a disponible");
          onLeaseUpdated(res.data);
          setTerminatingLease(null);
          setTerminationNotes("");
        } else {
          toast.error(res.error || "Error al terminar el contrato");
        }
      } catch (err: any) {
        console.error("Error terminating lease:", err);
        toast.error("Error inesperado al terminar el contrato");
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

  const getDaysUntilExpiry = (endDateStr?: string | null): number | null => {
    if (!endDateStr) return null;
    try {
      const cleanStr = endDateStr.split("T")[0];
      const parts = cleanStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const endDate = new Date(year, month, day);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffMs = endDate.getTime() - todayStart.getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
    } catch {
      return null;
    }
    return null;
  };

  const isRenewalPreaviso = (lease: PropertyLease): boolean => {
    if (lease.status !== "active" || !lease.end_date) return false;
    const daysLeft = getDaysUntilExpiry(lease.end_date);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 90;
  };

  const getStatusBadge = (status: LeaseStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-bold">
            ● Activo
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20 text-[11px] font-bold">
            ● Pendiente
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 text-[11px] font-bold">
            ● Vencido
          </Badge>
        );
      case "defaulted":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] font-bold">
            ● En Mora
          </Badge>
        );
      case "terminated":
        return (
          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-[11px] font-bold">
            ● Terminado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGuaranteeLabel = (type: string) => {
    switch (type) {
      case "insurance":
        return "Póliza Aseguradora";
      case "bond":
        return "Fianza Colectiva";
      case "deposit":
        return "Depósito Garantía";
      case "promissory_note":
        return "Pagaré en Blanco";
      case "direct":
        return "Garantía Directa";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Controls Bar (Search, Status Filter, View Toggle, New Button) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por inmueble, inquilino, propietario, barrio..."
              className="rounded-xl pl-9 h-10 border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] rounded-xl h-10 text-xs border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
              <SelectItem value="active" className="text-xs font-semibold text-emerald-600">Activos</SelectItem>
              <SelectItem value="pending" className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pendientes</SelectItem>
              <SelectItem value="defaulted" className="text-xs font-semibold text-rose-600">En Mora</SelectItem>
              <SelectItem value="expired" className="text-xs font-semibold text-zinc-500">Vencidos</SelectItem>
              <SelectItem value="terminated" className="text-xs font-semibold text-gray-400">Terminados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-900 text-brand-pink shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="Vista en tarjetas"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-brand-pink shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="Vista en tabla"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            type="button"
            onClick={onNewLease}
            className="rounded-xl h-10 px-4 text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1.5 shadow-md shadow-brand-pink/20"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Contrato</span>
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {filteredLeases.length === 0 && (
        <div className="p-12 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm space-y-3">
          <div className="p-3 w-fit mx-auto rounded-2xl bg-brand-pink/10 text-brand-pink">
            <KeyRound className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            No se encontraron contratos de arrendamiento
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "Prueba cambiando los filtros de búsqueda o el estado seleccionado."
              : "Comienza vinculando un inmueble disponible con un inquilino y propietario."}
          </p>
          <Button
            type="button"
            onClick={onNewLease}
            className="rounded-xl text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear Primer Contrato
          </Button>
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === "grid" && filteredLeases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLeases.map((lease) => {
            const property = lease.property;
            const tenant = lease.tenant;
            const owner = lease.owner;
            const thumb =
              property?.images?.[0] ||
              property?.gallery_images?.[0]?.url ||
              "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80";

            return (
              <div
                key={lease.id}
                className="group relative overflow-hidden rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Property Image Header */}
                  <div className="relative h-40 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={thumb}
                      alt={property?.name || "Inmueble"}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Status & Preaviso badge on top right */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                      {getStatusBadge(lease.status)}
                      {isRenewalPreaviso(lease) && (
                        <Badge className="bg-amber-500/90 text-white dark:bg-amber-500/20 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20 text-[10px] font-bold shadow-sm backdrop-blur-md gap-1">
                          <AlertTriangle className="h-3 w-3 text-white dark:text-amber-400" />
                          Por Renovar (90 días)
                        </Badge>
                      )}
                    </div>

                    {/* Neighborhood tag on top left */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                        {property?.real_estate_details?.neighborhood || "Ibagué"}
                      </span>
                    </div>

                    {/* Property Title & Rent on bottom */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h4 className="font-bold text-sm leading-snug line-clamp-1">
                        {property?.name || "Inmueble en Arriendo"}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono text-base font-black text-white">
                          {formatCOP(Number(lease.monthly_rent) || 0)}
                          <span className="text-[10px] font-normal text-white/80">/mes</span>
                        </span>
                        {lease.admin_fee > 0 && (
                          <span className="text-[10px] text-white/90 font-medium">
                            +Admon: {formatCOP(Number(lease.admin_fee))} ({lease.admin_paid_by === "agency" ? "Agencia" : "Directo"})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body Details */}
                  <div className="p-4 space-y-3 text-xs">
                    {/* Tenant & Landlord rows */}
                    <div className="space-y-1.5 pb-3 border-b border-zinc-100 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-emerald-500" />
                          Inquilino:
                        </span>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {tenant?.name || "Sin inquilino"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Landmark className="h-3.5 w-3.5 text-amber-500" />
                          Propietario:
                        </span>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {owner?.name || "Sin propietario"}
                        </span>
                      </div>
                    </div>

                    {/* Financial Terms & Days */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <div>
                        <span className="block text-zinc-400">Comisión Agencia:</span>
                        <span className="font-bold text-zinc-900 dark:text-white font-mono">
                          {lease.commission_percentage}% {lease.vat_on_commission ? "(+IVA)" : ""}
                        </span>
                      </div>
                      <div>
                        <span className="block text-zinc-400">Día Límite / Giro:</span>
                        <span className="font-bold text-zinc-900 dark:text-white font-mono">
                          Día {lease.payment_day} / Día {lease.payout_day}
                        </span>
                      </div>
                    </div>

                    {/* Guarantee & Validity */}
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-brand-pink" />
                          {getGuaranteeLabel(lease.guarantee_type)}:
                        </span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {lease.guarantee_details?.provider || "Directa"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                        <span>Vigencia:</span>
                        <span className="font-mono font-medium">
                          {formatColombianDate(lease.start_date)} al {formatColombianDate(lease.end_date)}
                        </span>
                      </div>
                      {isRenewalPreaviso(lease) && (
                        <div className="pt-1 flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-400 font-bold border-t border-amber-300/40 dark:border-amber-500/20">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Preaviso Ley 820:
                          </span>
                          <span className="font-mono">Por Renovar (90 días)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Quick Actions */}
                <div className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditLease(lease)}
                    className="rounded-xl h-8 px-3 text-xs font-semibold gap-1 hover:border-brand-pink/40 hover:text-brand-pink"
                  >
                    <Edit3 className="h-3 w-3" />
                    Editar
                  </Button>

                  {lease.status !== "terminated" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTerminatingLease(lease)}
                      className="rounded-xl h-8 px-3 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Terminar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && filteredLeases.length > 0 && (
        <div className="rounded-3xl border border-zinc-200/80 dark:border-white/10 overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Inmueble</th>
                  <th className="py-3.5 px-4">Inquilino</th>
                  <th className="py-3.5 px-4">Propietario</th>
                  <th className="py-3.5 px-4">Canon Mensual</th>
                  <th className="py-3.5 px-4">Comisión</th>
                  <th className="py-3.5 px-4">Días Corte</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                {filteredLeases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                      <div>{lease.property?.name || "Inmueble"}</div>
                      <div className="text-[10px] font-normal text-zinc-400">
                        {lease.property?.real_estate_details?.neighborhood || "Ibagué"}
                        {lease.start_date && (
                          <span className="font-mono ml-1">
                            • {formatColombianDate(lease.start_date)} al {formatColombianDate(lease.end_date)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {lease.tenant?.name || "N/A"}
                      </div>
                      <div className="text-[10px] text-zinc-400">{lease.tenant?.phone || ""}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {lease.owner?.name || "N/A"}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {lease.bank_payout_details?.bank || ""}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                      {formatCOP(Number(lease.monthly_rent) || 0)}
                      {lease.admin_fee > 0 && (
                        <div className="text-[10px] text-zinc-400 font-normal">
                          +Admon {formatCOP(Number(lease.admin_fee))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {lease.commission_percentage}% {lease.vat_on_commission ? "+IVA" : ""}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      Pago: Día {lease.payment_day} • Giro: Día {lease.payout_day}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {getStatusBadge(lease.status)}
                        {isRenewalPreaviso(lease) && (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20 text-[9px] font-bold block w-fit whitespace-nowrap">
                            Por Renovar (90 días)
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditLease(lease)}
                          className="h-8 px-2 text-xs hover:text-brand-pink"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        {lease.status !== "terminated" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setTerminatingLease(lease)}
                            className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Termination Confirmation Dialog */}
      <Dialog
        open={!!terminatingLease}
        onOpenChange={(open) => !open && setTerminatingLease(null)}
      >
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="p-2.5 w-fit rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-white">
              ¿Terminar Contrato de Arrendamiento?
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Esta acción marcará el contrato como <strong>Terminado</strong> y actualizará el estado del inmueble{" "}
              <strong>&quot;{terminatingLease?.property?.name}&quot;</strong> a <strong>Disponible</strong> para nuevo arriendo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Motivo o acta de entrega de inmueble:
            </label>
            <Textarea
              value={terminationNotes}
              onChange={(e) => setTerminationNotes(e.target.value)}
              placeholder="Ej: Entrega a satisfacción con paz y salvo de servicios públicos y administración..."
              className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs min-h-[90px]"
            />
          </div>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTerminatingLease(null)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isTerminating}
              onClick={handleConfirmTermination}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1"
            >
              {isTerminating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Confirmar Terminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
