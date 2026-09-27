"use client";

import React, { useState } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";
import {
  FileText,
  CreditCard,
  QrCode,
  Printer,
  Download,
  Send,
  CheckCircle2,
  Lock,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateOfficialBulletinPdf } from "../services/bulletin-generator";
import { generateCr80BatchCardsPdf } from "../services/qr-credentials-generator";
import type { StudentBadgeCardData } from "../services/qr-credentials-generator";

interface SchoolBulletinsCredentialsViewProps {
  organizationName?: string;
  brandColor?: string;
}

export function SchoolBulletinsCredentialsView({
  organizationName = "Colegio Campestre Británico",
  brandColor = "#2563eb",
}: SchoolBulletinsCredentialsViewProps) {
  const [selectedSection, setSelectedSection] = useState("sec-9a");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);

  // Demo student batch for 9°A
  const studentsInCohort = [
    { code: "2026-001", name: "Santiago Gómez Rojas", hasDebt: false, average: 4.75, tier: "Superior" as const, rank: 2 },
    { code: "2026-002", name: "Valentina Morales Castro", hasDebt: false, average: 4.12, tier: "Alto" as const, rank: 8 },
    { code: "2026-003", name: "Mateo Herrera Quintero", hasDebt: true, average: 2.88, tier: "Bajo" as const, rank: 31 },
    { code: "2026-004", name: "Isabella Restrepo López", hasDebt: false, average: 4.97, tier: "Superior" as const, rank: 1 },
    { code: "2026-005", name: "Samuel Cárdenas Duarte", hasDebt: true, average: 2.40, tier: "Bajo" as const, rank: 32 },
    { code: "2026-006", name: "Luciana Beltrán Ortiz", hasDebt: false, average: 3.72, tier: "Básico" as const, rank: 14 },
  ];

  const handleDownloadSampleBulletin = async (student: typeof studentsInCohort[0]) => {
    setIsGeneratingPdf(true);
    try {
      const pdfBytes = await generateOfficialBulletinPdf({
        schoolName: organizationName,
        schoolResolution: "Resolución Secretaría de Educación No. 4143.0.21.9822 de 2018",
        schoolNit: "900.824.119-3",
        primaryColor: brandColor,
        studentName: student.name,
        studentCode: student.code,
        gradeAndSection: "Grado 9°A (Secundaria)",
        academicYear: "2026",
        periodName: "1° Período Académico",
        overallAverage: student.average,
        generalTier: student.tier,
        cohortRank: student.rank,
        totalStudentsInCohort: 32,
        totalAbsences: 2,
        areas: [
          {
            areaId: "a-math",
            areaName: "Matemáticas & Geometría",
            areaAverageScore: 4.5,
            areaPerformanceTier: "Alto",
            subjects: [
              {
                courseId: "c-1",
                subjectName: "Álgebra y Trigonometría",
                areaId: "a-math",
                areaName: "Matemáticas & Geometría",
                weeklyHours: 5,
                numericScore: 4.7,
                performanceTier: "Superior",
                absencesCount: 0,
                absenceRatePercentage: 0,
                isFailingByAbsence: false,
                teacherName: "Prof. Alberto García",
              },
            ],
          },
          {
            areaId: "a-sci",
            areaName: "Ciencias Naturales y Educación Ambiental",
            areaAverageScore: 4.6,
            areaPerformanceTier: "Superior",
            subjects: [
              {
                courseId: "c-2",
                subjectName: "Física Mecánica",
                areaId: "a-sci",
                areaName: "Ciencias Naturales",
                weeklyHours: 4,
                numericScore: 4.6,
                performanceTier: "Superior",
                absencesCount: 1,
                absenceRatePercentage: 2,
                isFailingByAbsence: false,
                teacherName: "Prof. Claudia Mendoza",
              },
            ],
          },
          {
            areaId: "a-hum",
            areaName: "Humanidades e Idiomas Extranjeros",
            areaAverageScore: 4.8,
            areaPerformanceTier: "Superior",
            subjects: [
              {
                courseId: "c-3",
                subjectName: "English Literature",
                areaId: "a-hum",
                areaName: "Humanidades",
                weeklyHours: 6,
                numericScore: 4.8,
                performanceTier: "Superior",
                absencesCount: 1,
                absenceRatePercentage: 1,
                isFailingByAbsence: false,
                teacherName: "Prof. Sarah Jenkins",
              },
            ],
          },
        ],
        awardedBadges: [],
        radarData: {
          Matemáticas: 90,
          Ciencias: 92,
          Humanidades: 96,
          Sociales: 85,
          Artes: 88,
        },
        principalName: "Dra. María Fernanda Henao",
        verificationSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        verificationQrUrl: `https://pixy.edu.co/verify/2026-${student.code}`,
        generatedAt: "2026-09-26",
      });

      // Create download blob
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Boletin_${student.code}_Periodo1.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating bulletin PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadCr80BatchSheet = async () => {
    setIsGeneratingCards(true);
    try {
      const cardsData: StudentBadgeCardData[] = studentsInCohort.map((s) => ({
        enrollmentId: `e-${s.code}`,
        studentCode: s.code,
        firstName: s.name.split(" ")[0],
        lastName: s.name.split(" ").slice(1).join(" "),
        gradeName: "9° Grado",
        sectionName: "Grupo A",
        academicYear: "2026",
        qrAccessToken: `tok-${s.code}`,
        bloodTypeRh: "O+",
        healthProviderEps: "Sura EPS",
        emergencyContactName: "Acudiente Titular",
        emergencyContactPhone: "+57 311 234 5678",
        schoolName: organizationName,
        schoolColor: brandColor,
      }));

      const pdfBytes = await generateCr80BatchCardsPdf(
        cardsData,
        `Lote de Carnetización Grado 9°A • ${organizationName}`
      );

      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Carnets_CR80_Grado_9A.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating CR80 cards PDF:", err);
    } finally {
      setIsGeneratingCards(false);
    }
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
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">
              Boletines Oficiales Decreto 1290 & Carnetización CR80
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generación de informes académicos con hash criptográfico SHA-256 e impresión de carnets PVC Zero-Trust.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-[180px] rounded-xl text-xs h-9 font-medium">
              <SelectValue placeholder="Grado y Sección" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sec-9a" className="text-xs">Grado 9°A (32 Alumnos)</SelectItem>
              <SelectItem value="sec-9b" className="text-xs">Grado 9°B (30 Alumnos)</SelectItem>
              <SelectItem value="sec-10a" className="text-xs">Grado 10°A (28 Alumnos)</SelectItem>
              <SelectItem value="sec-10b" className="text-xs">Grado 10°B (29 Alumnos)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleDownloadCr80BatchSheet}
            disabled={isGeneratingCards}
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl text-xs h-9 shadow-xs"
          >
            {isGeneratingCards ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CreditCard className="w-3.5 h-3.5 text-primary" />
            )}
            <span>Imprimir Hoja Carnets CR80 (PDF)</span>
          </Button>

          <Button
            size="sm"
            className="gap-2 rounded-xl text-xs h-9 shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Despachar por WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Cohort Student Bulletin List */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="p-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Estudiantes Matriculados • Grado 9°A (1° Período 2026)
              </CardTitle>
              <CardDescription className="text-xs">
                Control de Paz y Salvo Financiero: Los estudiantes con mora en pensión tienen retención preventiva de descarga conforme a la reglamentación interna.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">
                4 Habilitados
              </Badge>
              <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-xs">
                2 en Retención Financiera
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground uppercase font-semibold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Estudiante</th>
                  <th className="py-3 px-3 text-center">Puesto</th>
                  <th className="py-3 px-3 text-center">Promedio</th>
                  <th className="py-3 px-3 text-center">Escala Nacional</th>
                  <th className="py-3 px-4 text-center">Paz y Salvo</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {studentsInCohort.map((student, idx) => (
                  <tr key={student.code} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-center text-muted-foreground font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-foreground">{student.name}</p>
                      <p className="text-[11px] text-muted-foreground">Código: {student.code}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {student.rank}°
                    </td>
                    <td className="py-3 px-3 text-center font-black text-sm">
                      <span className={student.average >= 3.0 ? "text-emerald-600" : "text-rose-600"}>
                        {student.average.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold">
                      {student.tier}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.hasDebt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-bold bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                          <Lock className="w-3 h-3" /> Bloqueado (Mora)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Paz y Salvo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant={student.hasDebt ? "ghost" : "outline"}
                        disabled={student.hasDebt || isGeneratingPdf}
                        onClick={() => handleDownloadSampleBulletin(student)}
                        className="rounded-xl text-xs gap-1.5 h-8"
                      >
                        <Download className="w-3.5 h-3.5 text-primary" />
                        <span>Descargar PDF</span>
                      </Button>
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
