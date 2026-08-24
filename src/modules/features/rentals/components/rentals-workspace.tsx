"use client";

import React, { useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  FileText,
  CreditCard,
  Receipt,
  RefreshCw,
  Plus,
  Building2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { RentalsKPIs } from "./rentals-kpis";
import { LeasesTab } from "./leases-tab";
import { CollectionsTab } from "./collections-tab";
import { SettlementsTab } from "./settlements-tab";
import { LeaseFormSheet } from "./lease-form-sheet";
import { SettlementModal } from "./settlement-modal";
import { getLeasesAction } from "../actions/leases";
import { getSettlementsAction } from "../actions/settlements";
import type {
  PropertyLease,
  PropertyLeaseSettlement,
} from "../types/rentals.types";
import { cn } from "@/modules/infrastructure/utils/utils";

export type RentalsTabKey = "leases" | "collections" | "settlements";

export interface RentalsWorkspaceProps {
  initialLeases: PropertyLease[];
  initialSettlements: PropertyLeaseSettlement[];
  properties: any[];
  contacts: any[];
  organization: {
    id: string;
    name: string;
    slug?: string | null;
    currency?: string;
  };
  userRole?: string;
  initialTab?: RentalsTabKey;
}

export function RentalsWorkspace({
  initialLeases = [],
  initialSettlements = [],
  properties = [],
  contacts = [],
  organization,
  userRole = "member",
  initialTab = "leases",
}: RentalsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Tab State with URL synchronization
  const [activeTab, setActiveTab] = useState<RentalsTabKey>(() => {
    const queryTab = searchParams.get("tab") as RentalsTabKey | null;
    if (queryTab === "collections" || queryTab === "settlements") return queryTab;
    return initialTab;
  });

  // Data state
  const [leases, setLeases] = useState<PropertyLease[]>(initialLeases);
  const [settlements, setSettlements] = useState<PropertyLeaseSettlement[]>(initialSettlements);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drawer / Sheet & Modal States
  const [isLeaseFormOpen, setIsLeaseFormOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<PropertyLease | null>(null);

  const [inspectingSettlement, setInspectingSettlement] = useState<PropertyLeaseSettlement | null>(null);

  const handleTabChange = (newTab: string) => {
    const tabKey = newTab as RentalsTabKey;
    setActiveTab(tabKey);
    startTransition(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabKey);
      window.history.replaceState({}, "", url.toString());
    });
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [leasesRes, settlementsRes] = await Promise.all([
        getLeasesAction(),
        getSettlementsAction(),
      ]);

      if (leasesRes.success && leasesRes.data) {
        setLeases(leasesRes.data);
      }
      if (settlementsRes.success && settlementsRes.data) {
        setSettlements(settlementsRes.data);
      }
      toast.success("Datos de arriendos y liquidaciones actualizados");
    } catch (err: any) {
      console.error("Rentals refresh error:", err);
      toast.error("Error al actualizar datos de arriendos");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleOpenCreateLease = () => {
    setEditingLease(null);
    setIsLeaseFormOpen(true);
  };

  const handleOpenEditLease = (lease: PropertyLease) => {
    setEditingLease(lease);
    setIsLeaseFormOpen(true);
  };

  const handleLeaseSaved = (savedLease: PropertyLease) => {
    setLeases((prev) => {
      const index = prev.findIndex((l) => l.id === savedLease.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedLease;
        return next;
      }
      return [savedLease, ...prev];
    });
    // Trigger server revalidation
    router.refresh();
  };

  const handleSettlementUpdated = (updatedSettlement: PropertyLeaseSettlement) => {
    setSettlements((prev) => {
      const index = prev.findIndex((s) => s.id === updatedSettlement.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updatedSettlement;
        return next;
      }
      return [updatedSettlement, ...prev];
    });

    if (inspectingSettlement?.id === updatedSettlement.id) {
      setInspectingSettlement(updatedSettlement);
    }
    router.refresh();
  };

  // Badges counts
  const activeLeasesCount = leases.filter((l) => l.status === "active").length;
  const latePaymentsCount = settlements.filter((s) => s.tenant_payment_status === "late").length;
  const pendingPayoutsCount = settlements.filter((s) => s.owner_payout_status === "pending").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* 1. Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-brand-pink/10 text-brand-pink shadow-sm">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                Gestión de Arriendos
              </h1>
              <Badge variant="outline" className="text-xs uppercase font-mono px-2.5 py-0.5">
                {organization.name}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Administración integral de contratos, recaudo de cánones por WhatsApp y liquidaciones a propietarios
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl h-9 px-3 text-xs font-semibold gap-1.5"
            title="Recargar datos"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-brand-pink")} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenCreateLease}
            className="rounded-xl h-9 px-4 text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white gap-1.5 shadow-md shadow-brand-pink/20"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Contrato</span>
          </Button>
        </div>
      </div>

      {/* 2. Key Performance Indicators (KPI Cards) */}
      <RentalsKPIs leases={leases} settlements={settlements} />

      {/* 3. Main Workspace Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-white/10">
          <TabsList className="grid grid-cols-3 max-w-xl w-full p-1 bg-zinc-100/80 dark:bg-white/5 backdrop-blur-sm border border-zinc-200/50 dark:border-white/10 rounded-2xl h-12">
            <TabsTrigger
              value="leases"
              className="rounded-xl text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-brand-pink data-[state=active]:shadow-sm flex items-center gap-1.5 transition-all"
            >
              <FileText className="h-4 w-4" />
              <span>Contratos Activos</span>
              {activeLeasesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">
                  {activeLeasesCount}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="collections"
              className="rounded-xl text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-brand-pink data-[state=active]:shadow-sm flex items-center gap-1.5 transition-all"
            >
              <CreditCard className="h-4 w-4" />
              <span>Control de Cobranza</span>
              {latePaymentsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-black animate-pulse">
                  {latePaymentsCount} mora
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="settlements"
              className="rounded-xl text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-brand-pink data-[state=active]:shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Receipt className="h-4 w-4" />
              <span>Liquidaciones Propietarios</span>
              {pendingPayoutsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-500/20 text-[10px] font-mono">
                  {pendingPayoutsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Contratos Activos */}
        <TabsContent value="leases" className="mt-0 outline-none">
          <LeasesTab
            leases={leases}
            onEditLease={handleOpenEditLease}
            onNewLease={handleOpenCreateLease}
            onLeaseUpdated={handleLeaseSaved}
          />
        </TabsContent>

        {/* Tab 2: Control de Cobranza */}
        <TabsContent value="collections" className="mt-0 outline-none">
          <CollectionsTab
            settlements={settlements}
            onSettlementUpdated={handleSettlementUpdated}
            onRefreshSettlements={handleRefresh}
            agencyName={organization.name}
          />
        </TabsContent>

        {/* Tab 3: Liquidaciones a Propietarios */}
        <TabsContent value="settlements" className="mt-0 outline-none">
          <SettlementsTab
            settlements={settlements}
            onInspectSettlement={(settlement) => setInspectingSettlement(settlement)}
            onSettlementUpdated={handleSettlementUpdated}
            agencyName={organization.name}
          />
        </TabsContent>
      </Tabs>

      {/* Slide Drawer for Creating/Editing Lease */}
      <LeaseFormSheet
        open={isLeaseFormOpen}
        onOpenChange={setIsLeaseFormOpen}
        lease={editingLease}
        properties={properties}
        contacts={contacts}
        onSuccess={handleLeaseSaved}
      />

      {/* Modal for Inspecting Monthly Settlement & Deductions */}
      <SettlementModal
        open={!!inspectingSettlement}
        onOpenChange={(open) => !open && setInspectingSettlement(null)}
        settlement={inspectingSettlement}
        onSuccess={handleSettlementUpdated}
        agencyName={organization.name}
      />
    </div>
  );
}
