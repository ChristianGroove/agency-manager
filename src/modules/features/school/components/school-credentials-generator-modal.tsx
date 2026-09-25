"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Printer, Download, CreditCard, Sparkles, ShieldCheck } from "lucide-react";
import { generateBadgeCardSvg, StudentBadgeCardData } from "../services/qr-credentials-generator";

interface SchoolCredentialsGeneratorModalProps {
  schoolName: string;
  academicYear: string;
  students: StudentBadgeCardData[];
  triggerButton?: React.ReactNode;
}

export function SchoolCredentialsGeneratorModal({
  schoolName,
  academicYear,
  students,
  triggerButton,
}: SchoolCredentialsGeneratorModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"cr80" | "sheet">("cr80");
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);

  const currentStudent = students[selectedStudentIndex] || {
    enrollmentId: "demo-1",
    studentCode: "EST-2026-001",
    firstName: "Samuel Alejandro",
    lastName: "Ramírez Ortiz",
    gradeName: "9°",
    sectionName: "9°A",
    academicYear,
    qrAccessToken: "a1b2c3d4e5f67890",
    bloodTypeRh: "O+",
    healthProviderEps: "Sura",
    emergencyContactPhone: "3104567890",
    schoolName,
    schoolColor: "#2563eb",
  };

  const cardSvg = generateBadgeCardSvg(currentStudent);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" className="gap-2 rounded-xl">
            <QrCode className="w-4 h-4 text-primary" />
            <span>Generar Carnets QR</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="gap-1 font-semibold text-xs px-2.5 py-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Carnetización Oficial Zero-Trust
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold">
            Impresión y Carnetización de Estudiantes
          </DialogTitle>
          <DialogDescription>
            Genera credenciales en formato PVC CR80 estándar (tarjeta plástica) o pliegos de papel listos para imprenta con código QR dinámico.
          </DialogDescription>
        </DialogHeader>

        {/* Format Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y my-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Formato de Salida:</span>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
              <Button
                variant={format === "cr80" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs rounded-lg font-medium"
                onClick={() => setFormat("cr80")}
              >
                PVC CR80 Individual
              </Button>
              <Button
                variant={format === "sheet" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs rounded-lg font-medium"
                onClick={() => setFormat("sheet")}
              >
                Pliego de 8 Carnets
              </Button>
            </div>
          </div>

          {students.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Estudiante:</span>
              <Select
                value={String(selectedStudentIndex)}
                onValueChange={(val) => setSelectedStudentIndex(Number(val))}
              >
                <SelectTrigger className="h-8 text-xs w-[180px] rounded-lg">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s, idx) => (
                    <SelectItem key={s.enrollmentId || idx} value={String(idx)} className="text-xs">
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Live Vector Card Preview Container */}
        <div className="flex flex-col items-center justify-center p-8 bg-muted/30 border border-dashed rounded-2xl my-2">
          <div
            className="shadow-2xl rounded-2xl overflow-hidden transition-transform hover:scale-[1.02]"
            dangerouslySetInnerHTML={{ __html: cardSvg }}
          />

          <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              Dimensiones: 85.6 mm × 53.98 mm (Estándar Bancario/PVC)
            </span>
            <span>•</span>
            <span className="text-emerald-500 font-semibold">QR Criptográfico Activo</span>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          <span className="text-xs text-muted-foreground">
            Listo para enviar a impresora de tarjetas o litografía.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
              Cerrar
            </Button>
            <Button onClick={handlePrint} className="gap-2 rounded-xl">
              <Printer className="w-4 h-4" />
              <span>Imprimir Carnets</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
