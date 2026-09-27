"use client";

import React, { useState } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";
import {
  ShieldAlert,
  BookMarked,
  HeartHandshake,
  FileCheck2,
  AlertTriangle,
  UserCheck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Send,
  Sparkles,
  Scale,
  Accessibility,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SchoolConvivenciaObserverViewProps {
  brandColor?: string;
}

export function SchoolConvivenciaObserverView({
  brandColor = "#2563eb",
}: SchoolConvivenciaObserverViewProps) {
  const [subTab, setSubTab] = useState<"observer" | "convivencia" | "piar">("observer");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewObserverModal, setShowNewObserverModal] = useState(false);
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);

  // Mock Observer Logs (Ley 115)
  const [observerLogs, setObserverLogs] = useState([
    {
      id: "obs-1",
      studentName: "Santiago Gómez Rojas",
      grade: "9°A",
      logType: "positive" as const,
      title: "Liderazgo en Olimpiadas de Matemáticas",
      description: "Destacado desempeño liderando a su equipo en la resolución de problemas lógicos intercolegiales.",
      date: "2026-09-24",
      loggedBy: "Prof. Alberto García",
      studentSigned: true,
      guardianSigned: true,
      isResolved: true,
    },
    {
      id: "obs-2",
      studentName: "Samuel Cárdenas Duarte",
      grade: "9°A",
      logType: "formative" as const,
      title: "Compromiso de Puntualidad y Hábitos",
      description: "Acuerdo formativo por reiteradas llegadas tarde al primer bloque matutino.",
      studentStatement: "He tenido demoras en la ruta escolar de transporte por obras viales.",
      studentCommitment: "Saldré 15 minutos más temprano y organizaré la maleta el día anterior.",
      guardianCommitment: "La familia supervisará la salida puntual.",
      date: "2026-09-22",
      loggedBy: "Prof. Alberto García",
      studentSigned: true,
      guardianSigned: true,
      isResolved: false,
    },
    {
      id: "obs-3",
      studentName: "Mateo Herrera Quintero",
      grade: "9°A",
      logType: "academic_alert" as const,
      title: "Alerta de Rezago Decreto 1290",
      description: "Registro de plan de mejoramiento para nivelación de Física y Álgebra.",
      date: "2026-09-18",
      loggedBy: "Prof. Claudia Mendoza",
      studentSigned: true,
      guardianSigned: false,
      isResolved: false,
    },
  ]);

  // Mock Convivencia Incidents (Ley 1620)
  const [incidents, setIncidents] = useState([
    {
      id: "inc-1",
      incidentNumber: "SEC-2026-004",
      incidentType: "tipo_1" as const,
      title: "Desacuerdo verbal durante torneo deportivo de recreo",
      description: "Discusión acalorada por falta sancionada en partido de fútbol sala.",
      status: "closed" as const,
      dateOccurred: "2026-09-25",
      reporter: "Prof. David Morales",
      conciliation: "Ambos estudiantes firmaron acta de mediación y se comprometieron a arbitraje rotativo.",
      siuceReported: false,
    },
    {
      id: "inc-2",
      incidentNumber: "SEC-2026-003",
      incidentType: "tipo_2" as const,
      title: "Comportamiento reiterado de exclusión digital en grupo de WhatsApp",
      description: "Acoso escolar cibernético evidenciado mediante capturas aportadas por acudiente.",
      status: "conciliation_session" as const,
      dateOccurred: "2026-09-20",
      reporter: "Orientación Escolar",
      protocolStep: "Paso 3 de 5: Sesión de escucha pedagógica individual y citación de comités de conciliación.",
      siuceReported: false,
    },
    {
      id: "inc-3",
      incidentNumber: "SEC-2026-001",
      incidentType: "tipo_3" as const,
      title: "Presunta agresión física grave extraescolar con afectación de salud",
      description: "Activación inmediata de la Ruta de Atención Integral conforme al Artículo 31 Ley 1620.",
      status: "referred_siuce" as const,
      dateOccurred: "2026-09-10",
      reporter: "Rectoría",
      protocolStep: "Remitido a Policía de Infancia y Adolescencia e ICBF.",
      siuceReported: true,
      siuceNumber: "RAD-MINEDUC-2026-88421",
    },
  ]);

  // Mock PIAR Plans (Decreto 1421)
  const [piarPlans, setPiarPlans] = useState([
    {
      id: "piar-1",
      studentName: "Santiago Gómez Rojas",
      grade: "9°A",
      diagnosis: "Trastorno por Déficit de Atención e Hiperactividad (TDAH combinado)",
      barriers: ["Atención sostenida en evaluaciones teóricas de más de 45 min", "Sobrecarga de estímulos auditivos"],
      adaptationsCount: 4,
      goalsCount: 3,
      status: "active" as const,
      lastReviewed: "2026-09-15",
    },
    {
      id: "piar-2",
      studentName: "Luciana Beltrán Ortiz",
      grade: "9°A",
      diagnosis: "Hipoacusia neurosensorial moderada bilateral",
      barriers: ["Acceso a instrucciones verbales sin apoyo visual", "Ubicación espacial lejos del docente"],
      adaptationsCount: 5,
      goalsCount: 4,
      status: "active" as const,
      lastReviewed: "2026-09-10",
    },
  ]);

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case "positive":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Mérito Positivo</Badge>;
      case "formative":
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Acuerdo Formativo</Badge>;
      case "disciplinary":
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">Falta Disciplinaria</Badge>;
      case "academic_alert":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Alerta SIEE</Badge>;
      default:
        return <Badge variant="outline">Pedagógico</Badge>;
    }
  };

  const getIncidentBadge = (type: "tipo_1" | "tipo_2" | "tipo_3") => {
    switch (type) {
      case "tipo_1":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 font-bold">Falta Tipo I (Conflicto Leve)</Badge>;
      case "tipo_2":
        return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 font-bold">Falta Tipo II (Acoso / Daño)</Badge>;
      case "tipo_3":
        return <Badge className="bg-rose-600 text-white font-black animate-pulse">Falta Tipo III (Delito / SIUCE)</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">
              Expediente Socio-Formativo, Convivencia & Inclusión
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marco legal nacional: Ley 115 (Observador), Ley 1620 (Comité Convivencia) y Decreto 1421 (PIAR Inclusión).
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {subTab === "observer" && (
            <Button
              size="sm"
              className="gap-2 rounded-xl text-xs h-9 shadow-sm"
              style={{ backgroundColor: brandColor }}
              onClick={() => setShowNewObserverModal(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Anotación en Observador
            </Button>
          )}

          {subTab === "convivencia" && (
            <Button
              size="sm"
              className="gap-2 rounded-xl text-xs h-9 shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => setShowNewIncidentModal(true)}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Radicar Caso de Convivencia
            </Button>
          )}

          {subTab === "piar" && (
            <Button
              size="sm"
              className="gap-2 rounded-xl text-xs h-9 shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              <Accessibility className="w-3.5 h-3.5" />
              Nuevo Plan PIAR (Decreto 1421)
            </Button>
          )}
        </div>
      </div>

      {/* 3 Pillar Subtabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as any)} className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-2xl h-11">
          <TabsTrigger value="observer" className="rounded-xl text-xs font-bold gap-2">
            <BookMarked className="w-3.5 h-3.5" />
            Observador del Estudiante (Ley 115)
          </TabsTrigger>
          <TabsTrigger value="convivencia" className="rounded-xl text-xs font-bold gap-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Comité de Convivencia (Ley 1620)
          </TabsTrigger>
          <TabsTrigger value="piar" className="rounded-xl text-xs font-bold gap-2">
            <Accessibility className="w-3.5 h-3.5" />
            Inclusión & PIAR (Decreto 1421)
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* SUBTAB 1: OBSERVADOR DEL ESTUDIANTE (LEY 115) */}
        {/* ============================================================== */}
        <TabsContent value="observer" className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {observerLogs.map((log) => (
              <Card key={log.id} className="rounded-2xl border shadow-sm flex flex-col justify-between">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    {getLogTypeBadge(log.logType)}
                    <span className="text-[11px] text-muted-foreground">{log.date}</span>
                  </div>
                  <CardTitle className="text-sm font-bold mt-2 text-foreground">
                    {log.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Estudiante: <strong className="text-foreground">{log.studentName}</strong> ({log.grade})
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-0 flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border">
                    {log.description}
                  </p>

                  {log.studentCommitment && (
                    <div className="text-[11px] bg-blue-500/5 border border-blue-500/20 p-2.5 rounded-xl">
                      <span className="font-bold text-blue-600 block">Compromiso del Estudiante:</span>
                      <p className="text-muted-foreground mt-0.5">{log.studentCommitment}</p>
                    </div>
                  )}

                  {/* Signatures & Due Process Status */}
                  <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                    <span className="truncate">Docente: {log.loggedBy}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", log.studentSigned ? "text-emerald-600 border-emerald-500/30" : "text-amber-600 border-amber-500/30")}>
                        {log.studentSigned ? "Firma Alumno ✓" : "Sin firma"}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px]", log.guardianSigned ? "text-emerald-600 border-emerald-500/30" : "text-amber-600 border-amber-500/30")}>
                        {log.guardianSigned ? "Firma Acudiente ✓" : "Pendiente Acudiente"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* SUBTAB 2: COMITÉ DE CONVIVENCIA ESCOLAR (LEY 1620) */}
        {/* ============================================================== */}
        <TabsContent value="convivencia" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {incidents.map((inc) => (
              <Card key={inc.id} className="rounded-2xl border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5 max-w-3xl">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {inc.incidentNumber}
                        </span>
                        {getIncidentBadge(inc.incidentType)}
                        <span className="text-xs text-muted-foreground">• Ocurrido el {inc.dateOccurred}</span>
                      </div>
                      <h3 className="font-bold text-base text-foreground mt-1">{inc.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{inc.description}</p>

                      {inc.conciliation && (
                        <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
                          <strong className="text-emerald-700">Acuerdo de Conciliación Aprobado: </strong>
                          <span className="text-emerald-900 dark:text-emerald-100">{inc.conciliation}</span>
                        </div>
                      )}

                      {inc.protocolStep && (
                        <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs">
                          <strong className="text-blue-700">Ruta de Atención Integral: </strong>
                          <span className="text-blue-900 dark:text-blue-100">{inc.protocolStep}</span>
                        </div>
                      )}

                      {inc.siuceReported && (
                        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Reportado al SIUCE Ministerio de Educación Nacional: {inc.siuceNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs capitalize font-bold">
                        Estado: {inc.status.replace("_", " ")}
                      </Badge>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs">
                        Ver Acta del Comité
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* SUBTAB 3: PLAN INDIVIDUAL DE AJUSTES RAZONABLES (DECRETO 1421) */}
        {/* ============================================================== */}
        <TabsContent value="piar" className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {piarPlans.map((piar) => (
              <Card key={piar.id} className="rounded-2xl border shadow-sm">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 font-bold">
                      Plan PIAR Activo (Decreto 1421)
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">Revisión: {piar.lastReviewed}</span>
                  </div>
                  <CardTitle className="text-base font-bold mt-2 text-foreground">
                    {piar.studentName} ({piar.grade})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Diagnóstico Neuropsicológico / Médico: <strong className="text-foreground">{piar.diagnosis}</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 flex flex-col gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-muted-foreground uppercase">Barreras Diagnosticadas:</h5>
                    <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 space-y-0.5">
                      {piar.barriers.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-xl border text-center text-xs">
                    <div>
                      <span className="font-black text-base text-foreground block">{piar.adaptationsCount}</span>
                      <span className="text-muted-foreground text-[11px]">Adaptaciones de Materia</span>
                    </div>
                    <div>
                      <span className="font-black text-base text-primary block">{piar.goalsCount}</span>
                      <span className="text-muted-foreground text-[11px]">Metas Pedagógicas</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[11px] text-muted-foreground">Vigencia: Año Lectivo 2026</span>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs">
                      Expediente de Adaptaciones
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
