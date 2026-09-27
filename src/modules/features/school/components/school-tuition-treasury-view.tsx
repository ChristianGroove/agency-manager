"use client";

import React, { useState } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";
import {
  CreditCard,
  DollarSign,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Receipt,
  FileCheck,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SchoolTuitionTreasuryViewProps {
  brandColor?: string;
}

export function SchoolTuitionTreasuryView({
  brandColor = "#2563eb",
}: SchoolTuitionTreasuryViewProps) {
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  const [searchQuery, setSearchQuery] = useState("");

  const invoices = [
    {
      id: "inv-1",
      studentCode: "2026-001",
      studentName: "Santiago Gómez Rojas",
      guardianName: "Carlos Gómez (Padre)",
      concept: "Pensión Escolar - Septiembre 2026",
      amount: 680000,
      lateFee: 0,
      dueDate: "2026-09-05",
      status: "paid" as const,
      paymentMethod: "Wompi PSE (Bancolombia)",
      paidAt: "2026-09-03",
    },
    {
      id: "inv-2",
      studentCode: "2026-002",
      studentName: "Valentina Morales Castro",
      guardianName: "Diana Castro (Madre)",
      concept: "Pensión Escolar - Septiembre 2026",
      amount: 680000,
      lateFee: 0,
      dueDate: "2026-09-05",
      status: "paid" as const,
      paymentMethod: "Nequi Directo",
      paidAt: "2026-09-04",
    },
    {
      id: "inv-3",
      studentCode: "2026-003",
      studentName: "Mateo Herrera Quintero",
      guardianName: "Rodrigo Herrera (Padre)",
      concept: "Pensión Escolar - Septiembre 2026",
      amount: 680000,
      lateFee: 35000,
      dueDate: "2026-09-05",
      status: "late" as const,
      paymentMethod: "Pendiente",
    },
    {
      id: "inv-4",
      studentCode: "2026-004",
      studentName: "Isabella Restrepo López",
      guardianName: "Juliana López (Madre)",
      concept: "Pensión Escolar - Septiembre 2026",
      amount: 680000,
      lateFee: 0,
      dueDate: "2026-09-05",
      status: "paid" as const,
      paymentMethod: "Wompi Tarjeta Débito",
      paidAt: "2026-09-02",
    },
    {
      id: "inv-5",
      studentCode: "2026-005",
      studentName: "Samuel Cárdenas Duarte",
      guardianName: "Jorge Cárdenas (Padre)",
      concept: "Pensión Escolar - Septiembre 2026",
      amount: 680000,
      lateFee: 35000,
      dueDate: "2026-09-05",
      status: "late" as const,
      paymentMethod: "Pendiente",
    },
    {
      id: "inv-6",
      studentCode: "2026-006",
      studentName: "Luciana Beltrán Ortiz",
      guardianName: "Marcela Ortiz (Madre)",
      concept: "Pensión Escolar - Septiembre 2026",
      amount: 680000,
      lateFee: 0,
      dueDate: "2026-09-05",
      status: "paid" as const,
      paymentMethod: "Wompi PSE (Davivienda)",
      paidAt: "2026-09-05",
    },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">
              Tesorería Escolar & Cobranza Mensual
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control de recaudo de pensiones, dispersión por WhatsApp HSM y pasarela Wompi integrada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] rounded-xl text-xs h-9 font-medium">
              <SelectValue placeholder="Mes de facturación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-09" className="text-xs">Septiembre 2026 (Activo)</SelectItem>
              <SelectItem value="2026-08" className="text-xs">Agosto 2026</SelectItem>
              <SelectItem value="2026-07" className="text-xs">Julio 2026</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" className="gap-2 rounded-xl text-xs h-9 shadow-sm" style={{ backgroundColor: brandColor }}>
            <Receipt className="w-3.5 h-3.5" />
            <span>Generar Ciclo de Facturación</span>
          </Button>
        </div>
      </div>

      {/* Recaudo KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border shadow-sm p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Facturado Septiembre</p>
          <h3 className="text-2xl font-black text-foreground mt-1">
            {formatCurrency(327760000)}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">482 estudiantes matriculados</p>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Recaudado Wompi & PSE</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(290020000)}
          </h3>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">88.5% tasa de recaudo oportuno</p>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Saldo en Cartera Morosa</p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(37740000)}
          </h3>
          <p className="text-[11px] text-rose-600 font-medium mt-1">42 acudientes pendientes de pago</p>
        </Card>
      </div>

      {/* Invoices List Table */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="p-6 border-b bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Estado de Pagos por Estudiante & Acudiente
              </CardTitle>
              <CardDescription className="text-xs">
                La habilitación de Paz y Salvo desactiva automáticamente el bloqueo de expedición de boletines.
              </CardDescription>
            </div>

            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 h-9">
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recordatorio Masivo por WhatsApp (42 Acudientes)</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground uppercase font-semibold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Estudiante & Acudiente</th>
                  <th className="py-3 px-3">Concepto</th>
                  <th className="py-3 px-3 text-right">Valor Pensión</th>
                  <th className="py-3 px-3 text-center">Vencimiento</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-center text-muted-foreground font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-foreground">{inv.studentName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Acudiente: {inv.guardianName}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-foreground">{inv.concept}</span>
                      {inv.paymentMethod !== "Pendiente" && (
                        <p className="text-[10px] text-muted-foreground">{inv.paymentMethod}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-black">
                      {formatCurrency(inv.amount + inv.lateFee)}
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {inv.dueDate}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {inv.status === "paid" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold">
                          Pagado ✓
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold">
                          En Mora
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inv.status === "paid" ? (
                        <Button variant="ghost" size="sm" className="rounded-xl text-xs gap-1.5 h-8">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Paz y Salvo</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-xl text-xs gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Cobro WhatsApp</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
