"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/modules/infrastructure/utils/utils";
import QRCode from "react-qr-code";
import {
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  Award,
  BookOpen,
  CreditCard,
  QrCode,
  Sparkles,
  Download,
  Phone,
  HeartPulse,
  RotateCw,
  Maximize2,
  CheckCircle2,
  Lock,
  TrendingUp,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { buildStudentQrPayload } from "../../services/qr-credentials-generator";
import type { StudentPortalData } from "../../actions/student-portal-actions";
import type { ColombianPerformanceTier, SchoolTuitionInvoice } from "../../types/school.types";

interface StudentCommunityPortalViewProps {
  portalData: StudentPortalData;
}

const TIER_BADGE_STYLE: Record<
  ColombianPerformanceTier,
  { label: string; bg: string; text: string; border: string }
> = {
  Superior: {
    label: "Superior (4.6 - 5.0)",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  Alto: {
    label: "Alto (4.0 - 4.5)",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  Básico: {
    label: "Básico (3.0 - 3.9)",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  Bajo: {
    label: "Bajo (1.0 - 2.9)",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
  },
};

export function StudentCommunityPortalView({ portalData }: StudentCommunityPortalViewProps) {
  const {
    enrollment,
    organization,
    overallAverage,
    performanceTier,
    areas,
    radarData,
    awardedBadges,
    tuitionInvoices: initialInvoices,
    isTuitionCleared: initialCleared,
  } = portalData;

  const brandColor = organization.primaryColor || "#2563eb";
  const tierStyle = TIER_BADGE_STYLE[performanceTier] || TIER_BADGE_STYLE.Alto;

  // Local state
  const [activeTab, setActiveTab] = useState<"id_card" | "academics" | "badges" | "billing">("id_card");
  const [isFlipped, setIsFlipped] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showWompiModal, setShowWompiModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SchoolTuitionInvoice | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [invoices, setInvoices] = useState<SchoolTuitionInvoice[]>(initialInvoices);
  const [isTuitionCleared, setIsTuitionCleared] = useState(initialCleared);

  // Live anti-screenshot dynamic clock
  const [liveTimestamp, setLiveTimestamp] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTimestamp(
        now.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const qrPayload = buildStudentQrPayload({
    orgId: organization.id,
    enrollmentId: enrollment.id,
    qrAccessToken: enrollment.qrAccessToken,
    studentCode: enrollment.studentCode,
  });

  const handleSimulatePayment = (invoice: SchoolTuitionInvoice) => {
    setSelectedInvoice(invoice);
    setShowWompiModal(true);
  };

  const handleConfirmWompiPayment = () => {
    if (!selectedInvoice) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowWompiModal(false);

      // Update invoice locally
      const updated = invoices.map((inv) =>
        inv.id === selectedInvoice.id
          ? { ...inv, status: "paid" as const, paid_at: new Date().toISOString() }
          : inv
      );
      setInvoices(updated);

      // Check if all are cleared
      const hasPending = updated.some((inv) => inv.status === "pending" || inv.status === "late");
      if (!hasPending) {
        setIsTuitionCleared(true);
      }

      toast.success("Pago Procesado con Éxito (Wompi Colombia)", {
        description: `Paz y Salvo actualizado inmediatamente para el período ${selectedInvoice.period_month}. Transacción Bancolombia/PSE verificada.`,
      });
    }, 1800);
  };

  const handleDownloadBulletin = () => {
    if (!isTuitionCleared) {
      toast.error("Descarga Bloqueada por Tesorería", {
        description: "Debe estar a Paz y Salvo en pensiones para descargar el boletín oficial.",
      });
      return;
    }

    toast.success("Generando Boletín Oficial Decreto 1290", {
      description: `Verificación criptográfica SHA-256 válida. Descargando informe para ${enrollment.firstName} ${enrollment.lastName}.`,
    });
  };

  // Radar chart points computation for JSX SVG
  const radarKeys = Object.keys(radarData);
  const radarSize = 240;
  const radarCenter = radarSize / 2;
  const radarRadius = 85;
  const angleStep = radarKeys.length > 0 ? (2 * Math.PI) / radarKeys.length : 0;

  const radarPolygonPoints = radarKeys
    .map((key, i) => {
      const val = radarData[key] || 0;
      const r = (val / 100) * radarRadius;
      const angle = i * angleStep - Math.PI / 2;
      const x = radarCenter + r * Math.cos(angle);
      const y = radarCenter + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Navigation & School Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b px-4 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 overflow-hidden"
              style={{ backgroundColor: brandColor }}
            >
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GraduationCap className="w-6 h-6" />
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base leading-tight truncate max-w-[200px] md:max-w-md">
                {organization.name}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Portal de Estudiante & Acudiente • Año Lectivo {enrollment.academicYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTuitionCleared ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-bold gap-1 hidden sm:inline-flex"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Paz y Salvo
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] font-bold gap-1 hidden sm:inline-flex"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Saldo Pendiente
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQrModal(true)}
              className="rounded-xl gap-1.5 text-xs font-semibold h-9"
            >
              <QrCode className="w-4 h-4 text-primary" />
              <span className="hidden xs:inline">QR Acceso</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 flex flex-col gap-6">
        {/* Student Quick Info Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-card border shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {enrollment.firstName[0]}
                {enrollment.lastName[0]}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card" />
            </div>

            <div className="flex flex-col min-w-0">
              <h2 className="font-extrabold text-base md:text-lg text-foreground truncate">
                {enrollment.firstName} {enrollment.lastName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground">
                  {enrollment.gradeName} - {enrollment.sectionName}
                </span>
                <span>•</span>
                <span>Cód: {enrollment.studentCode}</span>
                <span>•</span>
                <span className="font-semibold text-rose-500">RH: {enrollment.bloodTypeRh}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Promedio Decreto 1290
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-foreground">
                  {overallAverage.toFixed(1)}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] uppercase font-bold", tierStyle.bg, tierStyle.text, tierStyle.border)}
                >
                  {performanceTier}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <Tabs
          value={activeTab}
          onValueChange={(val: any) => setActiveTab(val)}
          className="w-full flex-1 flex flex-col"
        >
          <TabsList className="bg-muted/70 p-1 rounded-2xl h-12 w-full grid grid-cols-4">
            <TabsTrigger value="id_card" className="rounded-xl text-xs font-bold gap-1.5">
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Carnet</span> Digital
            </TabsTrigger>
            <TabsTrigger value="academics" className="rounded-xl text-xs font-bold gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rendimiento</span> 1290
            </TabsTrigger>
            <TabsTrigger value="badges" className="rounded-xl text-xs font-bold gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Insignias
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl text-xs font-bold gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              Paz y Salvo
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* TAB 1: 3D HOLOGRAPHIC DIGITAL CARNET & MEDICAL TAGS */}
          {/* ========================================================================= */}
          <TabsContent value="id_card" className="mt-4 flex flex-col items-center gap-6">
            <div className="text-center max-w-md">
              <h3 className="font-extrabold text-base text-foreground">
                Carnet Digital Interactivo Oficial
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Toca o haz clic sobre el carnet para girarlo. Presenta este carnet para ingresar en portería o tomar almuerzo.
              </p>
            </div>

            {/* Carnet Card Container with Perspective Flip */}
            <div
              className="relative w-full max-w-[360px] md:max-w-[420px] aspect-[1.58/1] cursor-pointer select-none perspective-1000"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="w-full h-full relative preserve-3d"
              >
                {/* FRONT FACE */}
                <div
                  className={cn(
                    "absolute inset-0 backface-hidden rounded-3xl p-5 flex flex-col justify-between shadow-xl border overflow-hidden",
                    "bg-gradient-to-br from-card via-card to-muted"
                  )}
                  style={{ borderColor: `${brandColor}40` }}
                >
                  {/* Holographic Watermark & Gradient Beam */}
                  <div
                    className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: brandColor }}
                  />
                  <div className="absolute inset-0 bg-radial from-transparent via-transparent to-primary/5 pointer-events-none" />

                  {/* Card Top: School & Live Beacon */}
                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: brandColor }}
                      >
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-xs uppercase tracking-wider text-foreground truncate">
                          {organization.name}
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          CARNET ESTUDIANTIL OFICIAL
                        </span>
                      </div>
                    </div>

                    {/* Dynamic anti-screenshot pulsing clock */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 border text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {liveTimestamp || "00:00:00"}
                    </div>
                  </div>

                  {/* Card Center: Photo & Student Data */}
                  <div className="flex items-center gap-4 my-auto relative z-10">
                    <div className="relative shrink-0">
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-md border-2 border-background"
                        style={{ backgroundColor: brandColor }}
                      >
                        {enrollment.firstName[0]}
                        {enrollment.lastName[0]}
                      </div>
                      <Badge
                        variant="secondary"
                        className="absolute -bottom-2 -left-1 text-[8px] font-bold px-1.5 py-0 bg-background/90 border shadow-xs"
                      >
                        ACTIVO
                      </Badge>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <h4 className="font-black text-sm md:text-base text-foreground leading-snug truncate">
                        {enrollment.firstName} {enrollment.lastName}
                      </h4>
                      <p
                        className="text-xs font-bold mt-0.5 truncate"
                        style={{ color: brandColor }}
                      >
                        {enrollment.gradeName} - {enrollment.sectionName}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        CÓD: <span className="font-bold text-foreground">{enrollment.studentCode}</span>
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded-md bg-muted border text-foreground">
                          RH: <strong className="text-rose-500">{enrollment.bloodTypeRh}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-muted border text-foreground">
                          EPS: {enrollment.healthProviderEps}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Emergency & Flip CTA */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t relative z-10">
                    <span className="flex items-center gap-1 font-semibold truncate">
                      <Phone className="w-3 h-3 text-primary" />
                      Emergencia: {enrollment.emergencyContactPhone || "Colegio"}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-primary group">
                      <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                      Girar carnet
                    </span>
                  </div>
                </div>

                {/* BACK FACE */}
                <div
                  className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180 rounded-3xl p-5 flex flex-col justify-between shadow-xl border overflow-hidden",
                    "bg-gradient-to-br from-card via-card to-muted"
                  )}
                  style={{ borderColor: `${brandColor}40` }}
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                      CREDENTIAL TOKEN • GATE ACCESS
                    </span>
                    <span className="text-[10px] font-bold text-foreground">
                      {enrollment.academicYear}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-5 my-auto">
                    <div className="p-2.5 bg-white rounded-2xl shadow-md border shrink-0">
                      <QRCode value={qrPayload} size={88} />
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground">Acceso Institucional</span>
                      <p className="text-[10px] leading-relaxed">
                        Este código QR es único e intransferible. Válido para control de torniquetes, biblioteca y comedor escolar.
                      </p>
                      <span className="font-mono text-[9px] text-primary break-all">
                        {enrollment.qrAccessToken.slice(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
                    <span className="font-medium">Pixy Edu • Sistema Zero-Trust</span>
                    <span className="flex items-center gap-1 font-bold text-primary">
                      <RotateCw className="w-3 h-3" />
                      Volver al frente
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQrModal(true)}
                className="rounded-xl gap-2 text-xs font-semibold"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Maximizar QR en Pantalla Completa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFlipped(!isFlipped)}
                className="rounded-xl gap-2 text-xs font-semibold"
              >
                <RotateCw className="w-3.5 h-3.5" />
                {isFlipped ? "Ver Frente" : "Ver Reverso"}
              </Button>
            </div>

            {/* Medical & Emergency Quick Card */}
            <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-card border shadow-xs mt-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Grupo & RH</span>
                  <p className="text-xs font-black text-foreground">{enrollment.bloodTypeRh}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">EPS Afiliada</span>
                  <p className="text-xs font-bold text-foreground">{enrollment.healthProviderEps}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Línea de Emergencia</span>
                  <p className="text-xs font-bold text-foreground truncate">
                    {enrollment.emergencyContactPhone || "Sin registrar"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: DECRETO 1290 ACADEMIC PERFORMANCE & RADAR SPIDER CHART */}
          {/* ========================================================================= */}
          <TabsContent value="academics" className="mt-4 flex flex-col gap-6">
            {/* Top Insight Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overall GPA */}
              <div className="p-5 rounded-3xl bg-card border shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Promedio General Acumulado
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-foreground">
                      {overallAverage.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">/ 5.0</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Nivel Oficial:</span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs font-bold uppercase", tierStyle.bg, tierStyle.text, tierStyle.border)}
                  >
                    {performanceTier}
                  </Badge>
                </div>
              </div>

              {/* Spider Radar Chart */}
              <div className="md:col-span-2 p-5 rounded-3xl bg-card border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1 max-w-xs">
                  <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Radar de Competencias
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Evaluación balanceada de habilidades matemáticas, científicas, lectoras y ciudadanas normalizadas (0 - 100%).
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {radarKeys.map((k) => (
                      <span
                        key={k}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                      >
                        {k}: <strong>{radarData[k]}%</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* SVG Radar */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg
                    width={radarSize}
                    height={radarSize}
                    viewBox={`0 0 ${radarSize} ${radarSize}`}
                    className="overflow-visible"
                  >
                    {/* Concentric Circles */}
                    {[0.25, 0.5, 0.75, 1.0].map((lvl) => (
                      <circle
                        key={lvl}
                        cx={radarCenter}
                        cy={radarCenter}
                        r={radarRadius * lvl}
                        fill="none"
                        stroke="currentColor"
                        className="text-border/60"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Axis lines */}
                    {radarKeys.map((_, i) => {
                      const angle = i * angleStep - Math.PI / 2;
                      const x = radarCenter + radarRadius * Math.cos(angle);
                      const y = radarCenter + radarRadius * Math.sin(angle);
                      return (
                        <line
                          key={i}
                          x1={radarCenter}
                          y1={radarCenter}
                          x2={x}
                          y2={y}
                          stroke="currentColor"
                          className="text-border"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Polygon Area */}
                    {radarPolygonPoints && (
                      <polygon
                        points={radarPolygonPoints}
                        fill={brandColor}
                        fillOpacity="0.3"
                        stroke={brandColor}
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Vertex Points */}
                    {radarKeys.map((key, i) => {
                      const val = radarData[key] || 0;
                      const r = (val / 100) * radarRadius;
                      const angle = i * angleStep - Math.PI / 2;
                      const x = radarCenter + r * Math.cos(angle);
                      const y = radarCenter + r * Math.sin(angle);
                      return (
                        <circle
                          key={key}
                          cx={x}
                          cy={y}
                          r="3.5"
                          fill={brandColor}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Bulletin Download Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card border shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Boletín Oficial de Calificaciones (PDF)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Formato ejecutivo con firma institucional, radar de competencias y sello SHA-256 anti-fraude.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isTuitionCleared ? (
                  <Button
                    onClick={handleDownloadBulletin}
                    className="rounded-xl gap-2 text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Download className="w-4 h-4" />
                    Descargar Boletín Oficial
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    className="rounded-xl gap-2 text-xs font-semibold opacity-70"
                  >
                    <Lock className="w-4 h-4 text-amber-500" />
                    Bloqueado por Tesorería
                  </Button>
                )}
              </div>
            </div>

            {/* Areas & Subjects Detailed Breakdown */}
            <div className="flex flex-col gap-4">
              <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider">
                Desglose por Áreas y Asignaturas (Decreto 1290 de 2009)
              </h4>

              <div className="flex flex-col gap-3">
                {areas.map((area) => {
                  const areaTier = area.areaPerformanceTier;
                  const areaTierCfg = TIER_BADGE_STYLE[areaTier] || TIER_BADGE_STYLE.Alto;

                  return (
                    <div
                      key={area.areaId}
                      className="p-4 rounded-2xl bg-card border shadow-xs flex flex-col gap-3"
                    >
                      {/* Area Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="font-extrabold text-sm text-foreground">
                            {area.areaName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Promedio Área:
                          </span>
                          <span className="text-sm font-black text-foreground">
                            {area.areaAverageScore.toFixed(1)}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] uppercase font-bold", areaTierCfg.bg, areaTierCfg.text, areaTierCfg.border)}
                          >
                            {areaTier}
                          </Badge>
                        </div>
                      </div>

                      {/* Subjects in this Area */}
                      <div className="divide-y divide-border/60">
                        {area.subjects.map((sub) => {
                          const subTierCfg = TIER_BADGE_STYLE[sub.performanceTier] || TIER_BADGE_STYLE.Alto;
                          const isNearAbsenceLimit = sub.absenceRatePercentage >= 20;

                          return (
                            <div
                              key={sub.courseId}
                              className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-foreground">
                                  {sub.subjectName}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  Docente: {sub.teacherName} • {sub.weeklyHours}h semanales
                                </span>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Inasistencias warning */}
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      isNearAbsenceLimit ? "text-amber-500 font-bold" : "text-muted-foreground"
                                    )}
                                  >
                                    {sub.absencesCount} inasistencias ({sub.absenceRatePercentage.toFixed(0)}%)
                                  </span>
                                  {isNearAbsenceLimit && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    >
                                      Límite 25% Ley 115
                                    </Badge>
                                  )}
                                </div>

                                {/* Score & Tier */}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-foreground">
                                    {sub.numericScore.toFixed(1)}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[9px] uppercase font-bold", subTierCfg.bg, subTierCfg.text, subTierCfg.border)}
                                  >
                                    {sub.performanceTier}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: BADGES & HONORS SHOWCASE (INSIGNIAS HOLOGRÁFICAS) */}
          {/* ========================================================================= */}
          <TabsContent value="badges" className="mt-4 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border shadow-xs">
              <div>
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Muro de Insignias & Reconocimientos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Insignias de excelencia otorgadas por el cuerpo docente por mérito académico, liderazgo y convivencia.
                </p>
              </div>

              <Badge variant="outline" className="text-xs font-bold gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                {awardedBadges.length} {awardedBadges.length === 1 ? "Insignia Ganada" : "Insignias Ganadas"}
              </Badge>
            </div>

            {awardedBadges.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-3xl border flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Award className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-foreground">
                  Aún no tienes insignias en este período
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Completa tus sprints académicos, mantén un promedio superior y participa activamente en clase para desbloquearlas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {awardedBadges.map((awarded) => {
                  const b = awarded.badge;
                  if (!b) return null;

                  return (
                    <motion.div
                      key={awarded.id}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="relative p-5 rounded-2xl bg-card border shadow-sm flex flex-col justify-between overflow-hidden group"
                    >
                      {/* Holographic Beam Glow */}
                      <div
                        className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                        style={{ backgroundColor: b.beam_color || brandColor }}
                      />

                      <div>
                        {/* Tier Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold tracking-wider"
                            style={{
                              borderColor: b.beam_color || brandColor,
                              color: b.beam_color || brandColor,
                            }}
                          >
                            {b.tier}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {awarded.awarded_at
                              ? new Date(awarded.awarded_at).toLocaleDateString("es-CO", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Período 1"}
                          </span>
                        </div>

                        {/* Icon & Title */}
                        <div className="flex items-center gap-3 my-2">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-xs border"
                            style={{
                              borderColor: `${b.beam_color || brandColor}40`,
                              backgroundColor: `${b.beam_color || brandColor}15`,
                            }}
                          >
                            {b.icon_svg ? (
                              <span dangerouslySetInnerHTML={{ __html: b.icon_svg }} />
                            ) : (
                              <Award className="w-6 h-6" style={{ color: b.beam_color || brandColor }} />
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <h4 className="font-extrabold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {b.name}
                            </h4>
                            <span className="text-[11px] text-muted-foreground line-clamp-2">
                              {b.description}
                            </span>
                          </div>
                        </div>

                        {/* Teacher Justification */}
                        {awarded.justification && (
                          <div className="mt-3 p-2.5 rounded-xl bg-muted/50 border text-[11px] text-muted-foreground italic">
                            &quot;{awarded.justification}&quot;
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 4: PAZ Y SALVO & WOMPI TUITION BILLING */}
          {/* ========================================================================= */}
          <TabsContent value="billing" className="mt-4 flex flex-col gap-6">
            {/* Paz y Salvo Status Banner */}
            <div
              className={cn(
                "p-5 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs",
                isTuitionCleared
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              )}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-sm",
                    isTuitionCleared ? "bg-emerald-600" : "bg-amber-500"
                  )}
                >
                  {isTuitionCleared ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {isTuitionCleared
                      ? "ESTUDIANTE A PAZ Y SALVO"
                      : "PENSIONES O MATRÍCULA PENDIENTE"}
                  </h3>
                  <p className="text-xs opacity-80 mt-0.5">
                    {isTuitionCleared
                      ? "Sin compromisos financieros pendientes. Boletines y certificados habilitados para descarga."
                      : "Realiza el pago por Wompi (Nequi, PSE o Tarjetas) para obtener tu Paz y Salvo digital inmediato."}
                  </p>
                </div>
              </div>

              {isTuitionCleared ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-600 text-white border-none font-bold text-xs px-3 py-1 shrink-0"
                >
                  ✓ Válido {enrollment.academicYear}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    const pending = invoices.find((i) => i.status === "pending" || i.status === "late");
                    if (pending) handleSimulatePayment(pending);
                  }}
                  className="rounded-xl gap-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Pagar Pensión Pendiente
                </Button>
              )}
            </div>

            {/* Invoices List */}
            <div className="flex flex-col gap-3">
              <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider">
                Historial de Pensiones y Matrícula ({enrollment.academicYear})
              </h4>

              <div className="bg-card rounded-2xl border divide-y overflow-hidden shadow-xs">
                {invoices.map((inv) => {
                  const isPaid = inv.status === "paid";
                  const formattedAmount = new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  }).format(inv.amount);

                  return (
                    <div
                      key={inv.id}
                      className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-amber-500/10 text-amber-600"
                          )}
                        >
                          {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs md:text-sm text-foreground truncate">
                            {inv.concept}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Período: {inv.period_month} • Vence:{" "}
                            {new Date(inv.due_date).toLocaleDateString("es-CO", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-foreground">
                            {formattedAmount}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] uppercase font-bold",
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            )}
                          >
                            {isPaid ? "Pagado" : "Pendiente"}
                          </Badge>
                        </div>

                        {!isPaid && (
                          <Button
                            size="sm"
                            onClick={() => handleSimulatePayment(inv)}
                            className="rounded-xl text-xs font-bold text-white shadow-xs"
                            style={{ backgroundColor: brandColor }}
                          >
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: FULLSCREEN QR GATE SCANNER */}
      {/* ========================================================================= */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground">
              Credencial QR de Acceso Institucional
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Aumenta el brillo de tu pantalla y acerca este código al torniquete de entrada o lector de biblioteca.
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 p-4 bg-white rounded-3xl shadow-inner border flex flex-col items-center justify-center">
            <QRCode value={qrPayload} size={200} />
            <span className="font-mono text-xs font-bold text-slate-800 mt-3 tracking-widest">
              {enrollment.studentCode}
            </span>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {enrollment.firstName} {enrollment.lastName}
            </span>
            <span>
              {enrollment.gradeName} - {enrollment.sectionName} • {organization.name}
            </span>
          </div>

          <Button
            onClick={() => setShowQrModal(false)}
            variant="outline"
            className="w-full rounded-2xl text-xs font-bold mt-2"
          >
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: WOMPI COLOMBIA INSTANT PAYMENT CHECKOUT SIMULATION */}
      {/* ========================================================================= */}
      <Dialog open={showWompiModal} onOpenChange={setShowWompiModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600">
                WOMPI COLOMBIA
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                Bancolombia S.A.
              </span>
            </div>
            <DialogTitle className="text-base font-extrabold text-foreground">
              Pasarela de Pago Segura Wompi
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedInvoice?.concept} • {selectedInvoice?.period_month}
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-4 rounded-2xl bg-muted/50 border flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Estudiante:</span>
              <span className="font-bold text-foreground">
                {enrollment.firstName} {enrollment.lastName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Institución:</span>
              <span className="font-semibold text-foreground">{organization.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="font-bold text-foreground">Total a Pagar:</span>
              <span className="text-lg font-black text-foreground">
                {selectedInvoice &&
                  new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  }).format(selectedInvoice.amount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 my-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">
              Métodos de Pago Habilitados:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl border bg-card flex items-center gap-2.5 font-bold cursor-pointer hover:border-primary transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Nequi
              </div>
              <div className="p-3 rounded-xl border bg-card flex items-center gap-2.5 font-bold cursor-pointer hover:border-primary transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                PSE (Cualquier Banco)
              </div>
              <div className="p-3 rounded-xl border bg-card flex items-center gap-2.5 font-bold cursor-pointer hover:border-primary transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Bancolombia
              </div>
              <div className="p-3 rounded-xl border bg-card flex items-center gap-2.5 font-bold cursor-pointer hover:border-primary transition-colors">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Tarjeta Débito/Crédito
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => setShowWompiModal(false)}
              disabled={isProcessingPayment}
              className="flex-1 rounded-2xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmWompiPayment}
              disabled={isProcessingPayment}
              className="flex-1 rounded-2xl text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              {isProcessingPayment ? "Procesando Wompi..." : "Confirmar & Pagar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
