"use client";

import React, { useState } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Plus,
  Printer,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { SchoolCourse, SchoolSchedule } from "../types/school.types";

interface TimeBlock {
  blockNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

const DEFAULT_TIME_BLOCKS: TimeBlock[] = [
  { blockNumber: 1, label: "Bloque 1", startTime: "07:00", endTime: "08:30" },
  { blockNumber: 2, label: "Bloque 2", startTime: "08:30", endTime: "10:00" },
  { blockNumber: 0, label: "Descanso / Lonchera", startTime: "10:00", endTime: "10:30", isBreak: true },
  { blockNumber: 3, label: "Bloque 3", startTime: "10:30", endTime: "12:00" },
  { blockNumber: 0, label: "Almuerzo Institucional", startTime: "12:00", endTime: "13:00", isBreak: true },
  { blockNumber: 4, label: "Bloque 4", startTime: "13:00", endTime: "14:30" },
  { blockNumber: 5, label: "Bloque 5", startTime: "14:30", endTime: "15:45" },
];

const DAYS = [
  { dayNumber: 1, name: "Lunes" },
  { dayNumber: 2, name: "Martes" },
  { dayNumber: 3, name: "Miércoles" },
  { dayNumber: 4, name: "Jueves" },
  { dayNumber: 5, name: "Viernes" },
];

interface SchoolSchedulesGridViewProps {
  courses: SchoolCourse[];
  brandColor?: string;
}

export function SchoolSchedulesGridView({
  courses,
  brandColor = "#2563eb",
}: SchoolSchedulesGridViewProps) {
  const [selectedSection, setSelectedSection] = useState("sec-9a");

  // Mock schedule data for demo representation
  const [schedules, setSchedules] = useState<Array<{
    id: string;
    dayOfWeek: number;
    blockNumber: number;
    subjectName: string;
    teacherName: string;
    classroom: string;
    color: string;
  }>>([
    // Lunes
    { id: "s1", dayOfWeek: 1, blockNumber: 1, subjectName: "Álgebra y Trigonometría", teacherName: "Prof. Alberto García", classroom: "Aula 201", color: brandColor },
    { id: "s2", dayOfWeek: 1, blockNumber: 2, subjectName: "Física Mecánica", teacherName: "Prof. Claudia Mendoza", classroom: "Laboratorio B", color: "#059669" },
    { id: "s3", dayOfWeek: 1, blockNumber: 3, subjectName: "English Literature", teacherName: "Prof. Sarah Jenkins", classroom: "Aula 201", color: "#7c3aed" },
    { id: "s4", dayOfWeek: 1, blockNumber: 4, subjectName: "Ciencias Sociales", teacherName: "Prof. Hernán Ospina", classroom: "Aula 201", color: "#d97706" },
    { id: "s5", dayOfWeek: 1, blockNumber: 5, subjectName: "Educación Física", teacherName: "Prof. David Morales", classroom: "Polideportivo", color: "#0284c7" },

    // Martes
    { id: "s6", dayOfWeek: 2, blockNumber: 1, subjectName: "Química Inorgánica", teacherName: "Prof. Claudia Mendoza", classroom: "Laboratorio A", color: "#059669" },
    { id: "s7", dayOfWeek: 2, blockNumber: 2, subjectName: "Lengua Castellana", teacherName: "Prof. Gloria Vargas", classroom: "Aula 201", color: "#db2777" },
    { id: "s8", dayOfWeek: 2, blockNumber: 3, subjectName: "Álgebra y Trigonometría", teacherName: "Prof. Alberto García", classroom: "Aula 201", color: brandColor },
    { id: "s9", dayOfWeek: 2, blockNumber: 4, subjectName: "Tecnología & Robótica", teacherName: "Prof. Julián Torres", classroom: "Maker Lab", color: "#4f46e5" },

    // Miércoles
    { id: "s10", dayOfWeek: 3, blockNumber: 1, subjectName: "English Literature", teacherName: "Prof. Sarah Jenkins", classroom: "Aula 201", color: "#7c3aed" },
    { id: "s11", dayOfWeek: 3, blockNumber: 2, subjectName: "Álgebra y Trigonometría", teacherName: "Prof. Alberto García", classroom: "Aula 201", color: brandColor },
    { id: "s12", dayOfWeek: 3, blockNumber: 3, subjectName: "Biología Celular", teacherName: "Prof. Claudia Mendoza", classroom: "Laboratorio B", color: "#059669" },
    { id: "s13", dayOfWeek: 3, blockNumber: 4, subjectName: "Filosofía", teacherName: "Prof. Hernán Ospina", classroom: "Aula 201", color: "#d97706" },

    // Jueves
    { id: "s14", dayOfWeek: 4, blockNumber: 1, subjectName: "Física Mecánica", teacherName: "Prof. Claudia Mendoza", classroom: "Aula 201", color: "#059669" },
    { id: "s15", dayOfWeek: 4, blockNumber: 2, subjectName: "English Literature", teacherName: "Prof. Sarah Jenkins", classroom: "Aula 201", color: "#7c3aed" },
    { id: "s16", dayOfWeek: 4, blockNumber: 3, subjectName: "Artes Visuales & Música", teacherName: "Prof. Liliana Meza", classroom: "Taller Arte", color: "#ec4899" },
    { id: "s17", dayOfWeek: 4, blockNumber: 4, subjectName: "Geometría Analítica", teacherName: "Prof. Alberto García", classroom: "Aula 201", color: brandColor },

    // Viernes
    { id: "s18", dayOfWeek: 5, blockNumber: 1, subjectName: "Lengua Castellana", teacherName: "Prof. Gloria Vargas", classroom: "Aula 201", color: "#db2777" },
    { id: "s19", dayOfWeek: 5, blockNumber: 2, subjectName: "Ciencias Sociales", teacherName: "Prof. Hernán Ospina", classroom: "Aula 201", color: "#d97706" },
    { id: "s20", dayOfWeek: 5, blockNumber: 3, subjectName: "Dirección de Grupo & SIEE", teacherName: "Prof. Alberto García", classroom: "Aula 201", color: brandColor },
    { id: "s21", dayOfWeek: 5, blockNumber: 4, subjectName: "Educación Física", teacherName: "Prof. David Morales", classroom: "Canchas", color: "#0284c7" },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDay, setNewDay] = useState<number>(1);
  const [newBlock, setNewBlock] = useState<number>(1);
  const [newSubject, setNewSubject] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [newClassroom, setNewClassroom] = useState("Aula 201");

  const handleOpenAddModal = (day: number, block: number) => {
    setNewDay(day);
    setNewBlock(block);
    const defaultCourse = courses[0];
    setNewSubject(defaultCourse?.subject_name || "Álgebra y Trigonometría");
    setNewTeacher(
      defaultCourse?.lead_teacher
        ? `${defaultCourse.lead_teacher.first_name} ${defaultCourse.lead_teacher.last_name}`
        : "Prof. Alberto García"
    );
    setShowAddModal(true);
  };

  const handleSaveBlock = () => {
    if (!newSubject.trim()) return;
    const newEntry = {
      id: `s-${Date.now()}`,
      dayOfWeek: newDay,
      blockNumber: newBlock,
      subjectName: newSubject,
      teacherName: newTeacher || "Docente Asignado",
      classroom: newClassroom || "Aula 201",
      color: brandColor,
    };
    setSchedules((prev) => [
      ...prev.filter((s) => !(s.dayOfWeek === newDay && s.blockNumber === newBlock)),
      newEntry,
    ]);
    setShowAddModal(false);
  };

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="p-6 border-b bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-foreground">
                Malla Curricular & Horarios Escolares Semanales
              </CardTitle>
              <CardDescription className="text-xs">
                Distribución táctica de bloques de clase de lunes a viernes, docentes y asignación de aulas.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-[180px] rounded-xl text-xs h-9 font-medium">
                <SelectValue placeholder="Grado y Sección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sec-9a" className="text-xs">Grado 9°A (Salón 201)</SelectItem>
                <SelectItem value="sec-9b" className="text-xs">Grado 9°B (Salón 202)</SelectItem>
                <SelectItem value="sec-10a" className="text-xs">Grado 10°A (Salón 301)</SelectItem>
                <SelectItem value="sec-10b" className="text-xs">Grado 10°B (Salón 302)</SelectItem>
                <SelectItem value="sec-11a" className="text-xs">Grado 11°A (Salón 303)</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 h-9">
              <Printer className="w-3.5 h-3.5" />
              Imprimir Horario
            </Button>

            <Button
              size="sm"
              className="rounded-xl text-xs gap-1.5 h-9"
              style={{ backgroundColor: brandColor }}
              onClick={() => handleOpenAddModal(1, 1)}
            >
              <Plus className="w-3.5 h-3.5" />
              Programar Bloque
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <div className="overflow-x-auto">
          <div className="min-w-[900px] grid grid-cols-6 gap-3">
            {/* Header: First column for Time, then 5 days */}
            <div className="p-3 bg-muted/40 rounded-xl text-center font-bold text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Horario
            </div>

            {DAYS.map((day) => (
              <div
                key={day.dayNumber}
                className="p-3 bg-card border rounded-xl text-center font-bold text-xs text-foreground shadow-xs"
              >
                {day.name}
              </div>
            ))}

            {/* Time Blocks Rows */}
            {DEFAULT_TIME_BLOCKS.map((block, bIdx) => {
              if (block.isBreak) {
                return (
                  <React.Fragment key={`break-${bIdx}`}>
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-amber-700">{block.startTime} - {block.endTime}</span>
                    </div>
                    <div className="col-span-5 p-2 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl text-center flex items-center justify-center">
                      <span className="text-xs font-semibold text-amber-600 tracking-wide uppercase">
                        ☕ {block.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={`block-${block.blockNumber}`}>
                  {/* Left Column: Time */}
                  <div className="p-3 bg-muted/30 border rounded-xl text-center flex flex-col items-center justify-center gap-0.5">
                    <span className="text-xs font-bold text-foreground">{block.label}</span>
                    <span className="text-[10px] text-muted-foreground">{block.startTime} - {block.endTime}</span>
                  </div>

                  {/* 5 Days Columns */}
                  {DAYS.map((day) => {
                    const match = schedules.find(
                      (s) => s.dayOfWeek === day.dayNumber && s.blockNumber === block.blockNumber
                    );

                    if (!match) {
                      return (
                        <div
                          key={`cell-${day.dayNumber}-${block.blockNumber}`}
                          onClick={() => handleOpenAddModal(day.dayNumber, block.blockNumber)}
                          className="p-3 bg-muted/10 border border-dashed rounded-xl flex items-center justify-center text-muted-foreground/40 hover:bg-muted/30 transition-colors cursor-pointer group"
                        >
                          <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`cell-${day.dayNumber}-${block.blockNumber}`}
                        className="p-3 rounded-xl border shadow-xs flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer"
                        style={{
                          backgroundColor: `${match.color}10`,
                          borderColor: `${match.color}35`,
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: match.color }}
                            />
                            <h4 className="text-xs font-bold text-foreground leading-tight line-clamp-1">
                              {match.subjectName}
                            </h4>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            <span className="truncate">{match.teacherName}</span>
                          </p>
                        </div>

                        <div className="mt-2 pt-1 border-t border-muted/50 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-primary" />
                            {match.classroom}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </CardContent>

      {/* MODAL: PROGRAMAR BLOQUE SEMANAL */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Programar Bloque de Clase Semanal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Asignación de materia, docente y aula en la malla horaria semanal institucional.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Día de la Semana</Label>
                <Select
                  value={String(newDay)}
                  onValueChange={(v) => setNewDay(Number(v))}
                >
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.dayNumber} value={String(d.dayNumber)} className="text-xs">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Bloque Horario</Label>
                <Select
                  value={String(newBlock)}
                  onValueChange={(v) => setNewBlock(Number(v))}
                >
                  <SelectTrigger className="rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_TIME_BLOCKS.filter((b) => !b.isBreak).map((b) => (
                      <SelectItem key={b.blockNumber} value={String(b.blockNumber)} className="text-xs">
                        {b.label} ({b.startTime} - {b.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Asignatura / Curso</Label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Nombre de la asignatura"
                className="rounded-xl text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Docente Encargado</Label>
                <Input
                  value={newTeacher}
                  onChange={(e) => setNewTeacher(e.target.value)}
                  placeholder="Prof. Nombre Apellido"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Aula / Ubicación</Label>
                <Input
                  value={newClassroom}
                  onChange={(e) => setNewClassroom(e.target.value)}
                  placeholder="Aula 201"
                  className="rounded-xl text-xs h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setShowAddModal(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="rounded-xl text-xs font-bold"
              style={{ backgroundColor: brandColor }}
              onClick={handleSaveBlock}
            >
              Guardar en Horario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
