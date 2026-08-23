"use client";

import React from "react";
import { KeyRound, DollarSign, AlertCircle, Clock } from "lucide-react";
import { formatCOP } from "../services/settlement-calculator";
import type { PropertyLease, PropertyLeaseSettlement } from "../types/rentals.types";
import { cn } from "@/modules/infrastructure/utils/utils";

interface RentalsKPIsProps {
  leases: PropertyLease[];
  settlements: PropertyLeaseSettlement[];
}

export function RentalsKPIs({ leases = [], settlements = [] }: RentalsKPIsProps) {
  // 1. Total Active Leases
  const activeLeases = leases.filter((l) => l.status === "active");
  const totalActiveCount = activeLeases.length;
  const totalLeasesCount = leases.length;

  // 2. Monthly Expected Revenue (Gross collections for active leases)
  const monthlyExpectedRevenue = activeLeases.reduce((acc, l) => {
    const rent = Number(l.monthly_rent) || 0;
    const admin = l.admin_paid_by === "agency" ? Number(l.admin_fee) || 0 : 0;
    return acc + rent + admin;
  }, 0);

  // 3. Past-due / Delinquency Sum (Late tenant payments)
  const lateSettlements = settlements.filter((s) => s.tenant_payment_status === "late");
  const delinquencySum = lateSettlements.reduce((acc, s) => {
    return acc + (Number(s.gross_collected) || Number(s.rent_amount) || 0);
  }, 0);
  const lateCount = lateSettlements.length;

  // 4. Pending Owner Payouts
  const pendingPayoutSettlements = settlements.filter((s) => s.owner_payout_status === "pending");
  const pendingPayoutSum = pendingPayoutSettlements.reduce((acc, s) => {
    return acc + (Number(s.net_owner_payout) || 0);
  }, 0);
  const pendingPayoutCount = pendingPayoutSettlements.length;

  const kpis = [
    {
      id: "active-leases",
      title: "Contratos Activos",
      value: totalActiveCount.toString(),
      subtext: `${totalLeasesCount} contratos totales en sistema`,
      icon: KeyRound,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
    },
    {
      id: "expected-revenue",
      title: "Recaudo Mensual Estimado",
      value: formatCOP(monthlyExpectedRevenue),
      subtext: "Canon + admon gestionada",
      icon: DollarSign,
      color: "text-brand-pink",
      bgColor: "bg-brand-pink/10 dark:bg-brand-pink/20 border-brand-pink/20",
    },
    {
      id: "delinquency",
      title: "Mora / Cartera Vencida",
      value: formatCOP(delinquencySum),
      subtext: lateCount > 0 ? `${lateCount} inquilino(s) en mora` : "0 atrasos registrados",
      icon: AlertCircle,
      color: lateCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400",
      bgColor: lateCount > 0
        ? "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20"
        : "bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800",
    },
    {
      id: "pending-payouts",
      title: "Liquidaciones Pendientes",
      value: formatCOP(pendingPayoutSum),
      subtext: `${pendingPayoutCount} desembolsos a propietarios`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const IconComponent = kpi.icon;
        return (
          <div
            key={kpi.id}
            className="group relative overflow-hidden rounded-2xl p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 hover:border-brand-pink/30"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {kpi.title}
              </span>
              <div className={cn("p-2.5 rounded-xl border", kpi.bgColor)}>
                <IconComponent className={cn("h-5 w-5", kpi.color)} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {kpi.value}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                {kpi.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
