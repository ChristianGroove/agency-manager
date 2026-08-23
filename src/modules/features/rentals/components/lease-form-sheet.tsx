"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  DollarSign,
  Landmark,
  ShieldCheck,
  Calendar,
  Save,
  Loader2,
  FileText,
  Percent,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { createLeaseAction, updateLeaseAction } from "../actions/leases";
import { formatCOP } from "../services/settlement-calculator";
import type {
  PropertyLease,
  CreateLeaseInput,
  AdminPaidBy,
  LeaseStatus,
  GuaranteeType,
} from "../types/rentals.types";
import { cn } from "@/modules/infrastructure/utils/utils";

interface LeaseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease?: PropertyLease | null;
  properties: any[];
  contacts: any[];
  onSuccess: (savedLease: PropertyLease) => void;
}

const COLOMBIAN_BANKS = [
  "Bancolombia",
  "Davivienda",
  "Banco de Bogotá",
  "BBVA Colombia",
  "Banco de Occidente",
  "Banco Popular",
  "Banco Caja Social",
  "Banco AV Villas",
  "Banco Itaú",
  "Scotiabank Colpatria",
  "Nequi",
  "Daviplata",
  "Lulo Bank",
  "Nu Colombia",
  "Otro",
];

export function LeaseFormSheet({
  open,
  onOpenChange,
  lease,
  properties = [],
  contacts = [],
  onSuccess,
}: LeaseFormSheetProps) {
  const [isPending, startTransition] = useTransition();

  // Active form section tab
  const [activeSection, setActiveSection] = useState<"parties" | "financials" | "banking" | "guarantee">("parties");

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Form state
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [coSignerId, setCoSignerId] = useState<string | null>(null);

  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [adminFee, setAdminFee] = useState<number>(0);
  const [adminPaidBy, setAdminPaidBy] = useState<AdminPaidBy>("agency");
  const [commissionPercentage, setCommissionPercentage] = useState<number>(8.0);
  const [vatOnCommission, setVatOnCommission] = useState<boolean>(true);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentDay, setPaymentDay] = useState<number>(5);
  const [payoutDay, setPayoutDay] = useState<number>(10);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [status, setStatus] = useState<LeaseStatus>("active");

  const [bank, setBank] = useState<string>("Bancolombia");
  const [accountType, setAccountType] = useState<string>("savings");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");
  const [idNumber, setIdNumber] = useState<string>("");

  const [guaranteeType, setGuaranteeType] = useState<GuaranteeType>("insurance");
  const [guaranteeProvider, setGuaranteeProvider] = useState<string>("Seguros Bolívar");
  const [policyNumber, setPolicyNumber] = useState<string>("");
  const [coveragePercentage, setCoveragePercentage] = useState<number>(100);
  const [notes, setNotes] = useState<string>("");

  // Reset or initialize form data when sheet opens
  useEffect(() => {
    if (!open) return;

    if (lease) {
      setPropertyId(lease.property_id || "");
      setTenantId(lease.tenant_id || "");
      setOwnerId(lease.owner_id || "");
      setCoSignerId(lease.co_signer_id || null);

      setMonthlyRent(Number(lease.monthly_rent) || 0);
      setAdminFee(Number(lease.admin_fee) || 0);
      setAdminPaidBy(lease.admin_paid_by || "agency");
      setCommissionPercentage(Number(lease.commission_percentage) ?? 8.0);
      setVatOnCommission(lease.vat_on_commission ?? true);
      setDepositAmount(Number(lease.deposit_amount) || 0);
      setPaymentDay(Number(lease.payment_day) || 5);
      setPayoutDay(Number(lease.payout_day) || 10);
      setStartDate(lease.start_date ? lease.start_date.split("T")[0] : "");
      setEndDate(lease.end_date ? lease.end_date.split("T")[0] : "");
      setStatus(lease.status || "active");

      const bankDetails = lease.bank_payout_details || {};
      setBank(bankDetails.bank || "Bancolombia");
      setAccountType(bankDetails.account_type || "savings");
      setAccountNumber(bankDetails.account_number || "");
      setAccountHolder(bankDetails.account_holder || "");
      setIdNumber(bankDetails.id_number || "");

      setGuaranteeType(lease.guarantee_type || "insurance");
      const gDetails = lease.guarantee_details || {};
      setGuaranteeProvider(gDetails.provider || gDetails.company_name || "");
      setPolicyNumber(gDetails.policy_number || "");
      setCoveragePercentage(Number(gDetails.coverage_percentage) || 100);
      setNotes(lease.notes || "");
    } else {
      // Defaults for new lease
      setPropertyId(properties[0]?.id || "");
      setTenantId("");
      setOwnerId("");
      setCoSignerId(null);

      const today = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(today.getFullYear() + 1);

      setMonthlyRent(0);
      setAdminFee(0);
      setAdminPaidBy("agency");
      setCommissionPercentage(8.0);
      setVatOnCommission(true);
      setDepositAmount(0);
      setPaymentDay(5);
      setPayoutDay(10);
      setStartDate(today.toISOString().split("T")[0]);
      setEndDate(nextYear.toISOString().split("T")[0]);
      setStatus("active");

      setBank("Bancolombia");
      setAccountType("savings");
      setAccountNumber("");
      setAccountHolder("");
      setIdNumber("");

      setGuaranteeType("insurance");
      setGuaranteeProvider("Seguros Bolívar");
      setPolicyNumber("");
      setCoveragePercentage(100);
      setNotes("");
    }
    setErrors({});
    setActiveSection("parties");
  }, [open, lease, properties]);

  // When property changes, auto-fill base price if empty
  const handlePropertyChange = (newPropertyId: string) => {
    setPropertyId(newPropertyId);
    clearError("propertyId");
    const selectedProp = properties.find((p) => p.id === newPropertyId);
    if (selectedProp) {
      if (monthlyRent === 0 && selectedProp.base_price) {
        setMonthlyRent(Number(selectedProp.base_price));
        clearError("monthlyRent");
      }
      if (selectedProp.real_estate_details?.admin_fee && adminFee === 0) {
        setAdminFee(Number(selectedProp.real_estate_details.admin_fee));
      }
    }
  };

  // When owner changes, try to auto-fill bank details from owner metadata if available
  const handleOwnerChange = (newOwnerId: string) => {
    setOwnerId(newOwnerId);
    clearError("ownerId");
    const selectedOwner = contacts.find((c) => c.id === newOwnerId);
    if (selectedOwner) {
      if (!accountHolder) {
        setAccountHolder(selectedOwner.name || "");
        clearError("accountHolder");
      }
      const meta = selectedOwner.metadata || {};
      if (meta.bank_details) {
        if (meta.bank_details.bank) {
          setBank(meta.bank_details.bank);
          clearError("bank");
        }
        if (meta.bank_details.account_type) setAccountType(meta.bank_details.account_type);
        if (meta.bank_details.account_number) {
          setAccountNumber(meta.bank_details.account_number);
          clearError("accountNumber");
        }
        if (meta.bank_details.id_number) {
          setIdNumber(meta.bank_details.id_number);
          clearError("idNumber");
        }
      }
    }
  };

  const validateStep = (current: "parties" | "financials" | "banking" | "guarantee"): boolean => {
    const newErrors: Record<string, string> = { ...errors };
    let isValid = true;

    if (current === "parties") {
      delete newErrors.propertyId;
      delete newErrors.tenantId;
      delete newErrors.ownerId;

      if (!propertyId) {
        newErrors.propertyId = "Selecciona un inmueble del catálogo";
        isValid = false;
      }
      if (!tenantId) {
        newErrors.tenantId = "Selecciona el inquilino arrendatario";
        isValid = false;
      }
      if (!ownerId) {
        newErrors.ownerId = "Selecciona el propietario arrendador";
        isValid = false;
      }
    } else if (current === "financials") {
      delete newErrors.monthlyRent;
      delete newErrors.startDate;
      delete newErrors.endDate;

      if (monthlyRent <= 0) {
        newErrors.monthlyRent = "El canon mensual debe ser mayor a $ 0 COP";
        isValid = false;
      }
      if (!startDate) {
        newErrors.startDate = "Ingresa la fecha de inicio del contrato";
        isValid = false;
      }
      if (!endDate) {
        newErrors.endDate = "Ingresa la fecha de finalización";
        isValid = false;
      }
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        newErrors.endDate = "La fecha de fin debe ser posterior a la de inicio";
        isValid = false;
      }
    } else if (current === "banking") {
      delete newErrors.bank;
      delete newErrors.accountNumber;
      delete newErrors.accountHolder;
      delete newErrors.idNumber;

      if (!bank) {
        newErrors.bank = "Selecciona el banco de destino";
        isValid = false;
      }
      if (!accountNumber.trim()) {
        newErrors.accountNumber = "Ingresa el número de cuenta bancaria";
        isValid = false;
      }
      if (!accountHolder.trim()) {
        newErrors.accountHolder = "Ingresa el nombre del titular de la cuenta";
        isValid = false;
      }
      if (!idNumber.trim()) {
        newErrors.idNumber = "Ingresa el documento / NIT del titular";
        isValid = false;
      }
    }

    setErrors(newErrors);
    if (!isValid) {
      toast.error("Por favor completa los campos requeridos destacados en rojo");
    }
    return isValid;
  };

  const handleNextSection = () => {
    if (activeSection === "parties") {
      if (validateStep("parties")) setActiveSection("financials");
    } else if (activeSection === "financials") {
      if (validateStep("financials")) setActiveSection("banking");
    } else if (activeSection === "banking") {
      if (validateStep("banking")) setActiveSection("guarantee");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!propertyId) newErrors.propertyId = "Selecciona un inmueble del catálogo";
    if (!tenantId) newErrors.tenantId = "Selecciona el inquilino arrendatario";
    if (!ownerId) newErrors.ownerId = "Selecciona el propietario arrendador";

    if (monthlyRent <= 0) newErrors.monthlyRent = "El canon mensual debe ser mayor a $ 0 COP";
    if (!startDate) newErrors.startDate = "Ingresa la fecha de inicio del contrato";
    if (!endDate) newErrors.endDate = "Ingresa la fecha de finalización";
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      newErrors.endDate = "La fecha de fin debe ser posterior a la fecha de inicio";
    }

    if (!bank) newErrors.bank = "Selecciona el banco de destino";
    if (!accountNumber.trim()) newErrors.accountNumber = "Ingresa el número de cuenta bancaria";
    if (!accountHolder.trim()) newErrors.accountHolder = "Ingresa el nombre del titular";
    if (!idNumber.trim()) newErrors.idNumber = "Ingresa el documento / NIT";

    setErrors(newErrors);

    if (newErrors.propertyId || newErrors.tenantId || newErrors.ownerId) {
      setActiveSection("parties");
      toast.error("Completa los datos del inmueble e involucrados");
      return;
    }
    if (newErrors.monthlyRent || newErrors.startDate || newErrors.endDate) {
      setActiveSection("financials");
      toast.error("Completa los términos financieros del contrato");
      return;
    }
    if (newErrors.bank || newErrors.accountNumber || newErrors.accountHolder || newErrors.idNumber) {
      setActiveSection("banking");
      toast.error("Completa los datos bancarios para las liquidaciones");
      return;
    }

    const payload: CreateLeaseInput = {
      property_id: propertyId,
      tenant_id: tenantId,
      owner_id: ownerId,
      co_signer_id: coSignerId || null,
      monthly_rent: Number(monthlyRent),
      admin_fee: Number(adminFee) || 0,
      admin_paid_by: adminPaidBy,
      commission_percentage: Number(commissionPercentage) || 8.0,
      vat_on_commission: vatOnCommission,
      deposit_amount: Number(depositAmount) || 0,
      payment_day: Number(paymentDay) || 5,
      payout_day: Number(payoutDay) || 10,
      start_date: startDate,
      end_date: endDate,
      status: status,
      guarantee_type: guaranteeType,
      guarantee_details: {
        provider: guaranteeProvider,
        company_name: guaranteeProvider,
        policy_number: policyNumber,
        coverage_percentage: Number(coveragePercentage) || 100,
        status: "active",
      },
      bank_payout_details: {
        bank,
        account_type: accountType,
        account_number: accountNumber,
        account_holder: accountHolder,
        id_number: idNumber,
      },
      notes: notes || null,
    };

    startTransition(async () => {
      try {
        let res;
        if (lease?.id) {
          res = await updateLeaseAction(lease.id, payload);
        } else {
          res = await createLeaseAction(payload);
        }

        if (res.success && res.data) {
          toast.success(
            lease ? "Contrato actualizado exitosamente" : "Contrato de arrendamiento creado exitosamente"
          );
          onSuccess(res.data);
          onOpenChange(false);
        } else {
          toast.error(res.error || "Error al procesar el contrato");
        }
      } catch (err: any) {
        console.error("Error saving lease:", err);
        toast.error("Error inesperado al guardar el contrato");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[760px] w-full p-0 flex flex-col bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden"
      >
        <SheetHeader className="p-6 pb-4 border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-pink/10 text-brand-pink">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <SheetTitle className="text-xl font-bold text-zinc-900 dark:text-white">
                {lease ? "Editar Contrato de Arrendamiento" : "Nuevo Contrato de Arrendamiento"}
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Configuración completa del arrendatario, propietario, canon, comisiones y datos de dispersión bancaria.
              </SheetDescription>
            </div>
          </div>

          {/* Section Navigation Pills */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSection("parties")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all relative",
                activeSection === "parties"
                  ? "bg-brand-pink text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span>1. Partes & Inmueble</span>
              {!!(errors.propertyId || errors.tenantId || errors.ownerId) && (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("financials")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all relative",
                activeSection === "financials"
                  ? "bg-brand-pink text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60"
              )}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>2. Términos Financieros</span>
              {!!(errors.monthlyRent || errors.startDate || errors.endDate) && (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("banking")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all relative",
                activeSection === "banking"
                  ? "bg-brand-pink text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60"
              )}
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>3. Datos Bancarios</span>
              {!!(errors.bank || errors.accountNumber || errors.accountHolder || errors.idNumber) && (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("guarantee")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all",
                activeSection === "guarantee"
                  ? "bg-brand-pink text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/60"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>4. Garantía & Póliza</span>
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: PARTIES & PROPERTY */}
          {activeSection === "parties" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Property Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-brand-pink" />
                  Inmueble / Propiedad *
                </Label>
                <Select value={propertyId} onValueChange={handlePropertyChange}>
                  <SelectTrigger
                    className={cn(
                      "rounded-xl h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50",
                      errors.propertyId && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                    )}
                  >
                    <SelectValue placeholder="Seleccionar inmueble del catálogo..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-72">
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs py-2.5">
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-zinc-900 dark:text-white">{p.name}</span>
                          <span className="text-[11px] text-zinc-500">
                            {p.real_estate_details?.neighborhood || p.real_estate_details?.city || "Inmueble"} • Canon Base: {formatCOP(Number(p.base_price) || 0)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.propertyId ? (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.propertyId}
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Selecciona el inmueble del catálogo. El canon base y la administración se auto-completarán.
                  </p>
                )}
              </div>

              {/* Tenant Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Arrendatario / Inquilino (Lead CRM) *
                </Label>
                <Select value={tenantId} onValueChange={(val) => { setTenantId(val); clearError("tenantId"); }}>
                  <SelectTrigger
                    className={cn(
                      "rounded-xl h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50",
                      errors.tenantId && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                    )}
                  >
                    <SelectValue placeholder="Seleccionar inquilino registrado..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-72">
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs py-2">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-bold text-zinc-900 dark:text-white">{c.name}</span>
                          <span className="text-[11px] text-zinc-500 font-mono">{c.phone || c.email || "Sin contacto"}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tenantId ? (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.tenantId}
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Contacto arrendatario para el envío de recordatorios de cobro y links PSE por WhatsApp.
                  </p>
                )}
              </div>

              {/* Landlord Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-amber-500" />
                  Propietario / Arrendador *
                </Label>
                <Select value={ownerId} onValueChange={handleOwnerChange}>
                  <SelectTrigger
                    className={cn(
                      "rounded-xl h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50",
                      errors.ownerId && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                    )}
                  >
                    <SelectValue placeholder="Seleccionar propietario registrado..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-72">
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs py-2">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-bold text-zinc-900 dark:text-white">{c.name}</span>
                          <span className="text-[11px] text-zinc-500 font-mono">{c.phone || c.email || "Sin contacto"}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ownerId ? (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.ownerId}
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Propietario titular para liquidaciones mensuales y reportes de rentabilidad.
                  </p>
                )}
              </div>

              {/* Co-signer (Optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-zinc-400" />
                  Coarrendatario / Fiador (Opcional)
                </Label>
                <Select
                  value={coSignerId || "none"}
                  onValueChange={(val) => setCoSignerId(val === "none" ? null : val)}
                >
                  <SelectTrigger className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <SelectValue placeholder="Sin coarrendatario" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-72">
                    <SelectItem value="none" className="text-xs py-2 text-zinc-400">
                      Ninguno (Garantía directa o con aseguradora)
                    </SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs py-2">
                        <span className="font-semibold text-zinc-900 dark:text-white">{c.name}</span>
                        <span className="ml-2 text-[11px] text-zinc-500">({c.phone || "Sin tel"})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lease Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  Estado del Contrato
                </Label>
                <Select value={status} onValueChange={(val: LeaseStatus) => setStatus(val)}>
                  <SelectTrigger className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="active" className="text-xs py-2 font-semibold text-emerald-600">
                      ● Activo (En vigencia)
                    </SelectItem>
                    <SelectItem value="pending" className="text-xs py-2 font-semibold text-amber-700 dark:text-amber-400">
                      ● Pendiente (En firma / legalización)
                    </SelectItem>
                    <SelectItem value="expired" className="text-xs py-2 font-semibold text-zinc-600">
                      ● Vencido (Finalizado)
                    </SelectItem>
                    <SelectItem value="defaulted" className="text-xs py-2 font-semibold text-rose-600">
                      ● En Mora / Incumplido
                    </SelectItem>
                    <SelectItem value="terminated" className="text-xs py-2 font-semibold text-gray-500">
                      ● Terminado (Inmueble desocupado)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* SECTION 2: FINANCIAL TERMS */}
          {activeSection === "financials" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Monthly Rent */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Canon de Arrendamiento Mensual (COP) *
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input
                      type="number"
                      min={0}
                      step={10000}
                      value={monthlyRent || ""}
                      onChange={(e) => {
                        setMonthlyRent(Number(e.target.value));
                        clearError("monthlyRent");
                      }}
                      placeholder="Ej: 2500000"
                      className={cn(
                        "rounded-xl pl-9 h-11 border-zinc-200 dark:border-zinc-800 font-mono font-bold",
                        errors.monthlyRent && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                      )}
                    />
                  </div>
                  {errors.monthlyRent ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.monthlyRent}
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-500 font-medium">{formatCOP(monthlyRent)}</p>
                  )}
                </div>

                {/* Admin Fee */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Cuota de Administración (COP)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input
                      type="number"
                      min={0}
                      step={5000}
                      value={adminFee || ""}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      placeholder="Ej: 300000"
                      className="rounded-xl pl-9 h-11 border-zinc-200 dark:border-zinc-800 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 font-medium">{formatCOP(adminFee)}</p>
                </div>
              </div>

              {/* Admin Paid By */}
              <div className="space-y-2 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-white/10">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  Gestión del Pago de Administración
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setAdminPaidBy("agency")}
                    className={cn(
                      "p-3 rounded-xl text-left border transition-all text-xs",
                      adminPaidBy === "agency"
                        ? "border-brand-pink bg-brand-pink/10 text-brand-pink font-bold shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
                    )}
                  >
                    <span className="block font-bold">Recauda y Paga la Agencia</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                      Se cobra al inquilino y la agencia gira a la administración
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminPaidBy("tenant")}
                    className={cn(
                      "p-3 rounded-xl text-left border transition-all text-xs",
                      adminPaidBy === "tenant"
                        ? "border-brand-pink bg-brand-pink/10 text-brand-pink font-bold shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
                    )}
                  >
                    <span className="block font-bold">Paga Inquilino Directo</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                      El inquilino consigna directo a la copropiedad
                    </span>
                  </button>
                </div>
              </div>

              {/* Commission Rate & VAT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-white/10">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-brand-pink" />
                    Comisión Inmobiliaria (%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={commissionPercentage}
                    onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                    className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 font-mono font-bold"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Comisión estimada: {formatCOP((monthlyRent * commissionPercentage) / 100)}
                  </p>
                </div>

                <div className="space-y-1.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                        IVA 19% sobre Comisión
                      </Label>
                      <p className="text-[11px] text-zinc-500">
                        Grava el 19% estatutario sobre la comisión
                      </p>
                    </div>
                    <Switch
                      checked={vatOnCommission}
                      onCheckedChange={setVatOnCommission}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono font-medium">
                    {vatOnCommission
                      ? `IVA: ${formatCOP(((monthlyRent * commissionPercentage) / 100) * 0.19)}`
                      : "Exento de IVA"}
                  </p>
                </div>
              </div>

              {/* Payment & Payout Days */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Día Límite de Pago Inquilino
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={paymentDay}
                    onChange={(e) => setPaymentDay(Number(e.target.value))}
                    className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500">Día {paymentDay} de cada mes</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Día de Giro a Propietario
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={payoutDay}
                    onChange={(e) => setPayoutDay(Number(e.target.value))}
                    className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500">Día {payoutDay} de cada mes</p>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                      Fecha de Inicio *
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        clearError("startDate");
                      }}
                      className={cn(
                        "rounded-xl h-11 border-zinc-200 dark:border-zinc-800",
                        errors.startDate && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                      )}
                    />
                    {errors.startDate && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.startDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                      Fecha de Finalización *
                    </Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        clearError("endDate");
                      }}
                      className={cn(
                        "rounded-xl h-11 border-zinc-200 dark:border-zinc-800",
                        errors.endDate && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                      )}
                    />
                    {errors.endDate && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.endDate}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Vigencia legal del contrato. Ley 820 de 2003 estipula preaviso de no renovación con 90 días de antelación.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: BANKING DETAILS */}
          {activeSection === "banking" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                💡 Estos datos se utilizan para realizar las transferencias mensuales y generar el comprobante de liquidación del propietario.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Banco Destino *
                  </Label>
                  <Select
                    value={bank}
                    onValueChange={(val) => {
                      setBank(val);
                      clearError("bank");
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "rounded-xl h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50",
                        errors.bank && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-72">
                      {COLOMBIAN_BANKS.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs py-2">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.bank && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.bank}
                    </p>
                  )}
                </div>

                {/* Account Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Tipo de Cuenta *
                  </Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="savings" className="text-xs py-2">
                        Cuenta de Ahorros
                      </SelectItem>
                      <SelectItem value="checking" className="text-xs py-2">
                        Cuenta Corriente
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Account Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  Número de Cuenta *
                </Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    clearError("accountNumber");
                  }}
                  placeholder="Ej: 245-098765-12"
                  className={cn(
                    "rounded-xl h-11 border-zinc-200 dark:border-zinc-800 font-mono font-bold",
                    errors.accountNumber && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                  )}
                />
                {errors.accountNumber && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.accountNumber}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Account Holder */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Titular de la Cuenta *
                  </Label>
                  <Input
                    value={accountHolder}
                    onChange={(e) => {
                      setAccountHolder(e.target.value);
                      clearError("accountHolder");
                    }}
                    placeholder="Nombre completo o Razón Social"
                    className={cn(
                      "rounded-xl h-11 border-zinc-200 dark:border-zinc-800",
                      errors.accountHolder && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                    )}
                  />
                  {errors.accountHolder && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.accountHolder}
                    </p>
                  )}
                </div>

                {/* ID Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Número de Documento / Cédula / NIT *
                  </Label>
                  <Input
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value);
                      clearError("idNumber");
                    }}
                    placeholder="Ej: 1020304050"
                    className={cn(
                      "rounded-xl h-11 border-zinc-200 dark:border-zinc-800 font-mono",
                      errors.idNumber && "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/10"
                    )}
                  />
                  {errors.idNumber && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.idNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: GUARANTEE & NOTES */}
          {activeSection === "guarantee" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Guarantee Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  Mecanismo de Respaldo / Garantía
                </Label>
                <Select value={guaranteeType} onValueChange={(val: GuaranteeType) => setGuaranteeType(val)}>
                  <SelectTrigger className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="insurance" className="text-xs py-2">
                      🛡️ Póliza de Aseguradora (Seguros Bolívar / El Libertador / Suramericana)
                    </SelectItem>
                    <SelectItem value="bond" className="text-xs py-2">
                      🤝 Fianza Colectiva / Entidad Afianzadora
                    </SelectItem>
                    <SelectItem value="deposit" className="text-xs py-2">
                      💰 Depósito en Garantía
                    </SelectItem>
                    <SelectItem value="promissory_note" className="text-xs py-2">
                      📝 Pagaré en Blanco con Carta de Instrucciones
                    </SelectItem>
                    <SelectItem value="direct" className="text-xs py-2">
                      🤝 Garantía Directa / Fiador Personal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Guarantee Provider */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Aseguradora / Entidad
                  </Label>
                  <Input
                    value={guaranteeProvider}
                    onChange={(e) => setGuaranteeProvider(e.target.value)}
                    placeholder="Ej: Seguros Bolívar"
                    className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                {/* Policy Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Nº de Póliza / Radicado
                  </Label>
                  <Input
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="Ej: POL-2026-98765"
                    className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 font-mono"
                  />
                </div>
              </div>

              {/* Coverage Percentage */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  Porcentaje de Cobertura (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={coveragePercentage}
                  onChange={(e) => setCoveragePercentage(Number(e.target.value))}
                  className="rounded-xl h-11 border-zinc-200 dark:border-zinc-800 font-mono"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  Notas y Cláusulas Especiales
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre inventario, cláusula penal, prórrogas automáticas..."
                  className="rounded-xl border-zinc-200 dark:border-zinc-800 min-h-[100px] text-xs"
                />
              </div>
            </div>
          )}

          {/* Sheet Footer Actions */}
          <SheetFooter className="pt-4 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeSection !== "parties" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeSection === "guarantee") setActiveSection("banking");
                    else if (activeSection === "banking") setActiveSection("financials");
                    else if (activeSection === "financials") setActiveSection("parties");
                  }}
                  className="rounded-xl text-xs font-semibold"
                >
                  Anterior
                </Button>
              )}
              {activeSection !== "guarantee" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNextSection}
                  className="rounded-xl text-xs font-semibold text-brand-pink border-brand-pink/30 hover:bg-brand-pink/10"
                >
                  Siguiente
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1.5 shadow-md shadow-brand-pink/20"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {lease ? "Guardar Cambios" : "Crear Contrato"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
