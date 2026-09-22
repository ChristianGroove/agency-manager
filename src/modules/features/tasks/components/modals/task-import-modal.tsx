"use client";

import React, { useState, useRef, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  Users,
  Layers,
  FolderPlus,
  Rocket,
  RotateCw,
  Clock,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/modules/infrastructure/utils/utils";
import type { TaskCollaborator, TaskProject, TaskWorkspace, TaskSprint } from "../../types";
import {
  ImportDryRunResult,
  ImportExecutionOptions,
  PixyUniversalBundle,
} from "../../import-types";
import {
  detectImportFormat,
  parsePixyJson,
  parsePixyCsv,
  parseJiraCsv,
  runImportDryRun,
  generateSamplePixyJson,
  generateSampleTasksCsv,
  generateSampleCollaboratorsCsv,
} from "../../utils/task-import-parser";
import { executeUniversalImport } from "../../actions/task-import-actions";

interface TaskImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: TaskCollaborator[];
  projects: TaskProject[];
  workspaces: TaskWorkspace[];
  sprints?: TaskSprint[];
  organizationId: string;
  onImportComplete?: () => void;
}

export function TaskImportModal({
  isOpen,
  onClose,
  collaborators,
  projects,
  workspaces,
  sprints = [],
  organizationId,
  onImportComplete,
}: TaskImportModalProps) {
  // Stepper: 1: upload -> 2: preview/options -> 3: executing/success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  // File & Raw Data State
  const [fileName, setFileName] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [detectedFormat, setDetectedFormat] = useState<"pixy" | "jira" | "csv" | "generic">("csv");
  const [dryRunResult, setDryRunResult] = useState<ImportDryRunResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Ingestion Options
  const [options, setOptions] = useState<ImportExecutionOptions>({
    autoCreateStaff: true,
    autoCreateProjects: true,
    autoCreateWorkspaces: true,
    autoCreateSprints: true,
    defaultProjectId: projects.length > 0 ? projects[0].id : null,
    defaultWorkspaceId: workspaces.length > 0 ? workspaces[0].id : null,
  });

  // Success summary
  const [successStats, setSuccessStats] = useState<{
    staffCreated: number;
    workspacesCreated: number;
    projectsCreated: number;
    sprintsCreated: number;
    tasksCreated: number;
    checklistsCreated: number;
    blockersResolved: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Reset modal state
  const handleReset = () => {
    setStep(1);
    setFileName("");
    setFileContent("");
    setDryRunResult(null);
    setParseError(null);
    setSuccessStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Process uploaded text
  const handleProcessContent = (content: string, name: string) => {
    setFileName(name);
    setFileContent(content);
    setParseError(null);

    const format = detectImportFormat(content, name);
    setDetectedFormat(format);

    let parseOutput: { success: boolean; bundle?: PixyUniversalBundle; error?: string };

    if (format === "pixy") {
      parseOutput = parsePixyJson(content);
    } else if (format === "jira") {
      parseOutput = parseJiraCsv(content);
    } else {
      parseOutput = parsePixyCsv(content);
    }

    if (!parseOutput.success || !parseOutput.bundle) {
      setParseError(parseOutput.error || "No se pudo interpretar el archivo.");
      return;
    }

    const dryRun = runImportDryRun(parseOutput.bundle, {
      existingStaff: collaborators,
      existingProjects: projects,
      existingWorkspaces: workspaces,
      existingSprints: sprints,
    });

    setDryRunResult(dryRun);
    setStep(2);
  };

  // File input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) handleProcessContent(text, file.name);
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) handleProcessContent(text, file.name);
    };
    reader.readAsText(file);
  };

  // Download template helpers
  const handleDownload = (content: string, downloadName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Plantilla descargada: ${downloadName}`);
  };

  // Run import execution
  const handleExecuteImport = () => {
    if (!dryRunResult || !dryRunResult.bundle) return;

    startTransition(async () => {
      setStep(3);
      try {
        const res = await executeUniversalImport(dryRunResult.bundle!, options, organizationId);
        if (res.success && res.createdStats) {
          setSuccessStats(res.createdStats);
          toast.success("¡Importación completada con éxito!", {
            description: `Se crearon ${res.createdStats.tasksCreated} tareas y ${res.createdStats.staffCreated} colaboradores.`,
          });
          onImportComplete?.();
        } else {
          toast.error(res.error || "Ocurrió un error durante la importación.");
          setStep(2);
        }
      } catch (err: any) {
        toast.error(err.message || "Error inesperado al importar.");
        setStep(2);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border/80 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Importación Masiva de Datos & Tareas
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Importa tareas, colaboradores y sprints desde archivos Pixy Bundle (JSON), CSV o export de Jira.
                </DialogDescription>
              </div>
            </div>

            {/* Stepper Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs font-semibold text-muted-foreground border border-border/40">
              <span className={cn("px-1.5 py-0.5 rounded-full text-[11px]", step === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>1</span>
              <span>Subir</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
              <span className={cn("px-1.5 py-0.5 rounded-full text-[11px]", step === 2 ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>2</span>
              <span>Revisar</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
              <span className={cn("px-1.5 py-0.5 rounded-full text-[11px]", step === 3 ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>3</span>
              <span>Ingesta</span>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Upload & Templates */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Dropzone Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200",
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border/70 hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Arrastra tu archivo aquí o haz clic para seleccionarlo
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Compatible con <strong>Pixy Bundle (.json)</strong>, hojas de cálculo <strong>CSV estándar</strong> o exportaciones de <strong>Jira (.csv)</strong>.
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="outline" className="text-[11px] gap-1 py-1 px-2.5">
                    <FileText className="w-3 h-3 text-blue-500" /> Pixy JSON
                  </Badge>
                  <Badge variant="outline" className="text-[11px] gap-1 py-1 px-2.5">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-500" /> Tareas CSV
                  </Badge>
                  <Badge variant="outline" className="text-[11px] gap-1 py-1 px-2.5">
                    <Sparkles className="w-3 h-3 text-purple-500" /> Jira Export
                  </Badge>
                </div>
              </div>

              {parseError && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Error al procesar el archivo:</span>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}

              {/* Sample Templates Download Box */}
              <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Descarga de Plantillas Oficiales
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Usa estas plantillas de ejemplo listas para rellenar con tus datos o migrar entre organizaciones.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(generateSamplePixyJson(), "plantilla-pixy-bundle.json", "application/json")}
                    className="justify-start gap-2 h-auto py-2.5 px-3 rounded-xl border-border/80 hover:border-blue-500/40 hover:bg-blue-500/5 text-left"
                  >
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-foreground">Bundle JSON</span>
                      <span className="text-[10px] text-muted-foreground block">Pixy a Pixy completo</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(generateSampleTasksCsv(), "plantilla-tareas-pixy.csv", "text/csv")}
                    className="justify-start gap-2 h-auto py-2.5 px-3 rounded-xl border-border/80 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-foreground">Tareas CSV</span>
                      <span className="text-[10px] text-muted-foreground block">Excel de requerimientos</span>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(generateSampleCollaboratorsCsv(), "plantilla-colaboradores-pixy.csv", "text/csv")}
                    className="justify-start gap-2 h-auto py-2.5 px-3 rounded-xl border-border/80 hover:border-purple-500/40 hover:bg-purple-500/5 text-left"
                  >
                    <Users className="w-4 h-4 text-purple-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-foreground">Colaboradores CSV</span>
                      <span className="text-[10px] text-muted-foreground block">Equipo y roles</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview, Validation & Options */}
          {step === 2 && dryRunResult && (
            <div className="space-y-6">
              {/* Top Banner: File & Format Info */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-background border border-border/60 flex items-center justify-center text-foreground font-bold text-xs">
                    {fileName.endsWith(".json") ? "JSON" : "CSV"}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">{fileName}</span>
                    <span className="text-[11px] text-muted-foreground">
                      Formato detectado:{" "}
                      <strong className="text-foreground capitalize">
                        {detectedFormat === "pixy" ? "Pixy Native Bundle" : detectedFormat === "jira" ? "Jira Cloud Export" : "CSV Estándar"}
                      </strong>
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Cambiar archivo
                </Button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Total Tareas
                  </span>
                  <div className="text-2xl font-extrabold text-foreground font-mono">
                    {dryRunResult.stats.totalTasks}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    {dryRunResult.stats.totalChecklistItems} entregables / subtareas
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> Colaboradores
                  </span>
                  <div className="text-2xl font-extrabold text-foreground font-mono">
                    {dryRunResult.stats.totalStaff}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    <strong className="text-amber-500 font-semibold">{dryRunResult.stats.newStaffCount} nuevos</strong> · {dryRunResult.stats.existingStaffCount} existentes
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <FolderPlus className="w-3.5 h-3.5 text-purple-500" /> Proyectos
                  </span>
                  <div className="text-2xl font-extrabold text-foreground font-mono">
                    {dryRunResult.stats.totalProjects}
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    {dryRunResult.stats.newProjectsCount} por crear · {dryRunResult.stats.existingProjectsCount} existentes
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" /> Horas Estimadas
                  </span>
                  <div className="text-2xl font-extrabold text-foreground font-mono">
                    {dryRunResult.stats.totalEstimatedHours}h
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Carga operativa total
                  </span>
                </div>
              </div>

              {/* Warnings List */}
              {dryRunResult.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Avisos de compatibilidad & mapeo:</span>
                  </div>
                  <ul className="list-disc pl-6 space-y-0.5 text-[11px]">
                    {dryRunResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tabs for detailed preview */}
              <Tabs defaultValue="tasks" className="w-full">
                <TabsList className="grid grid-cols-3 max-w-sm">
                  <TabsTrigger value="tasks" className="text-xs">
                    Tareas ({dryRunResult.stats.totalTasks})
                  </TabsTrigger>
                  <TabsTrigger value="staff" className="text-xs">
                    Colaboradores ({dryRunResult.stats.totalStaff})
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="text-xs">
                    Proyectos ({dryRunResult.stats.totalProjects})
                  </TabsTrigger>
                </TabsList>

                {/* Preview: Tasks */}
                <TabsContent value="tasks" className="pt-3">
                  <div className="rounded-xl border border-border/60 overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="p-2.5 font-semibold">Título</th>
                          <th className="p-2.5 font-semibold">Proyecto</th>
                          <th className="p-2.5 font-semibold">Estado</th>
                          <th className="p-2.5 font-semibold">Prioridad</th>
                          <th className="p-2.5 font-semibold">Asignado</th>
                          <th className="p-2.5 font-semibold">Horas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {dryRunResult.bundle?.tasks.slice(0, 50).map((t, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="p-2.5 font-medium text-foreground max-w-[200px] truncate">
                              {t.title}
                            </td>
                            <td className="p-2.5 text-muted-foreground max-w-[120px] truncate">
                              {t.project_name || t.project_slug || "Proyecto General"}
                            </td>
                            <td className="p-2.5">
                              <Badge variant="outline" className="text-[10px] capitalize py-0 px-2">
                                {t.status}
                              </Badge>
                            </td>
                            <td className="p-2.5">
                              <span className="text-[11px] capitalize text-muted-foreground">
                                {t.priority}
                              </span>
                            </td>
                            <td className="p-2.5 text-muted-foreground text-[11px] truncate max-w-[120px]">
                              {t.assignee_email || "Sin asignar"}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                              {t.estimated_hours}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {dryRunResult.bundle && dryRunResult.bundle.tasks.length > 50 && (
                    <span className="text-[10px] text-muted-foreground text-center block pt-2">
                      Mostrando las primeras 50 tareas de {dryRunResult.bundle.tasks.length}.
                    </span>
                  )}
                </TabsContent>

                {/* Preview: Collaborators */}
                <TabsContent value="staff" className="pt-3">
                  <div className="rounded-xl border border-border/60 overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="p-2.5 font-semibold">Correo Electrónico</th>
                          <th className="p-2.5 font-semibold">Nombre</th>
                          <th className="p-2.5 font-semibold">Estado en Pixy</th>
                          <th className="p-2.5 font-semibold">Tareas Asignadas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {dryRunResult.details.staff.map((s, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="p-2.5 font-mono text-[11px] text-foreground">
                              {s.email}
                            </td>
                            <td className="p-2.5 font-medium text-foreground">
                              {s.fullName}
                            </td>
                            <td className="p-2.5">
                              {s.isExisting ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0">
                                  Existente
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] py-0">
                                  Nuevo (Se creará)
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                              {s.assignedTasksCount} tickets
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* Preview: Projects */}
                <TabsContent value="projects" className="pt-3">
                  <div className="rounded-xl border border-border/60 overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="p-2.5 font-semibold">Proyecto</th>
                          <th className="p-2.5 font-semibold">Slug</th>
                          <th className="p-2.5 font-semibold">Estado en Pixy</th>
                          <th className="p-2.5 font-semibold">Tareas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {dryRunResult.details.projects.map((p, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="p-2.5 font-medium text-foreground">
                              {p.name}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                              {p.slug}
                            </td>
                            <td className="p-2.5">
                              {p.isExisting ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0">
                                  Existente
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] py-0">
                                  Nuevo Proyecto
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                              {p.tasksCount} tickets
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Ingestion Policies & Configuration Box */}
              <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Políticas de Ingesta & Mapeo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-foreground block">
                        Crear colaboradores nuevos
                      </Label>
                      <span className="text-[11px] text-muted-foreground block">
                        Crea cuentas activas para correos no registrados.
                      </span>
                    </div>
                    <Switch
                      checked={options.autoCreateStaff}
                      onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, autoCreateStaff: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-foreground block">
                        Crear proyectos automáticamente
                      </Label>
                      <span className="text-[11px] text-muted-foreground block">
                        Crea proyectos nuevos si no existen en la org.
                      </span>
                    </div>
                    <Switch
                      checked={options.autoCreateProjects}
                      onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, autoCreateProjects: checked }))}
                    />
                  </div>
                </div>

                {/* Fallback Project selector */}
                <div className="pt-1 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground block">
                      Proyecto de Respaldo Predeterminado
                    </Label>
                    <span className="text-[11px] text-muted-foreground block">
                      Asignado si una tarea no especifica proyecto o si no se crean nuevos.
                    </span>
                  </div>

                  <Select
                    value={options.defaultProjectId || ""}
                    onValueChange={(val) => setOptions((prev) => ({ ...prev, defaultProjectId: val }))}
                  >
                    <SelectTrigger className="w-56 text-xs h-9">
                      <SelectValue placeholder="Seleccionar proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Progress & Success */}
          {step === 3 && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              {isPending ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-spin">
                    <RotateCw className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    Ejecutando Ingesta Transaccional...
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Insertando colaboradores, espacios, proyectos y tickets en orden topológico. Por favor, no cierres esta ventana.
                  </p>
                </>
              ) : successStats ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    ¡Importación Masiva Exitosa!
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Todos los datos fueron validados e ingresados correctamente en la base de datos de la organización.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg pt-4 text-left">
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Tareas</span>
                      <span className="text-xl font-bold font-mono text-foreground">{successStats.tasksCreated}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Colaboradores</span>
                      <span className="text-xl font-bold font-mono text-emerald-600">{successStats.staffCreated}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Proyectos</span>
                      <span className="text-xl font-bold font-mono text-foreground">{successStats.projectsCreated}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Bloqueos</span>
                      <span className="text-xl font-bold font-mono text-foreground">{successStats.blockersResolved}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-muted/20 flex items-center justify-between sm:justify-between">
          {step === 1 && (
            <>
              <span className="text-[11px] text-muted-foreground">
                Soporta archivos UTF-8 de hasta 10 MB.
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isPending}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Volver
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={isPending || !dryRunResult?.isValid}
                  className="gap-2 bg-primary text-primary-foreground font-bold"
                >
                  <Rocket className="w-4 h-4" />
                  Iniciar Importación ({dryRunResult?.stats.totalTasks} Tareas)
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
                className="font-bold bg-primary text-primary-foreground"
              >
                Finalizar y Ver Tareas
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
