"use client";

import React from "react";
import { KeyRound, DollarSign, AlertCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
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
      subtext: `${totalLeasesCount} en sistema`,
      icon: KeyRound,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      id: "expected-revenue",
      title: "Recaudo Estimado",
      value: formatCOP(monthlyExpectedRevenue),
      subtext: "Canon + admon gestionada",
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      id: "delinquency",
      title: "Mora / Cartera",
      value: formatCOP(delinquencySum),
      subtext: lateCount > 0 ? `${lateCount} inquilino(s) en mora` : "Al día",
      icon: AlertCircle,
      color: lateCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400",
      bgColor: lateCount > 0 ? "bg-rose-50 dark:bg-rose-500/10" : "bg-zinc-100 dark:bg-zinc-800/40",
    },
    {
      id: "pending-payouts",
      title: "Liquidaciones Pendientes",
      value: formatCOP(pendingPayoutSum),
      subtext: `${pendingPayoutCount} desembolsos`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const IconComponent = kpi.icon;
        return (
          <Card
            key={kpi.id}
            className="glass-card p-4 sm:p-5 group hover:-translate-y-1 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={cn("p-2.5 sm:p-3 rounded-xl shrink-0 group-hover:scale-105 transition-transform", kpi.bgColor)}>
                <IconComponent className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                  {kpi.value}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                  {kpi.title}
                </p>
                {kpi.subtext && (
                  <p className="text-[11px] text-muted-foreground/70 truncate">
                    {kpi.subtext}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
