"use client"

import React, { useState } from "react"
import { CheckSquare, Plus, Trash2, User, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion } from "framer-motion"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskChecklistItem, TaskCollaborator } from "../../types"

export interface TaskChecklistEditorProps {
  checklist: TaskChecklistItem[]
  collaborators: TaskCollaborator[]
  isMeeting?: boolean
  disabled?: boolean
  canManageChecklist?: boolean
  canToggleItem?: (item: TaskChecklistItem) => boolean
  currentStaffId?: string | null
  brandColor?: string
  onToggleItem: (itemId: string, currentCompleted: boolean) => void
  onUpdateAssignee: (itemId: string, staffId: string | null) => void
  onUpdateWeek: (itemId: string, week: 1 | 2 | 3 | 4 | null) => void
  onRemoveItem: (itemId: string) => void
  onAddItem: (title: string, week: 1 | 2 | 3 | 4 | null, assigneeId: string | null) => void
}

export function TaskChecklistEditor({
  checklist,
  collaborators,
  isMeeting = false,
  disabled = false,
  canManageChecklist = true,
  canToggleItem,
  currentStaffId,
  brandColor = "#8ec045",
  onToggleItem,
  onUpdateAssignee,
  onUpdateWeek,
  onRemoveItem,
  onAddItem,
}: TaskChecklistEditorProps) {
  const [newTitle, setNewTitle] = useState("")
  const [newWeek, setNewWeek] = useState<"general" | "1" | "2" | "3" | "4">("general")
  const [newAssigneeId, setNewAssigneeId] = useState<string>("unassigned")

  const completedCount = checklist.filter((c) => c.completed).length
  const checklistPercentage =
    checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0

  const handleAdd = () => {
    if (!newTitle.trim() || disabled || !canManageChecklist) return
    const weekVal = newWeek === "general" ? null : (Number(newWeek) as 1 | 2 | 3 | 4)
    const assigneeVal = newAssigneeId === "unassigned" ? null : newAssigneeId
    onAddItem(newTitle.trim(), weekVal, assigneeVal)
    setNewTitle("")
    setNewWeek("general")
    setNewAssigneeId("unassigned")
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Header with counter and completion rate */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {isMeeting
              ? "Agenda de la Sesión / Temas a Tratar"
              : "Checklist de Entregables / Subtareas"}{" "}
            ({completedCount}/{checklist.length})
          </span>
        </div>
        {checklist.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground font-mono">
            {checklistPercentage}% completado
          </span>
        )}
      </div>

      {/* Progress bar of checklist */}
      {checklist.length > 0 && (
        <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${checklistPercentage}%` }}
          />
        </div>
      )}

      {/* Checklist items list */}
      <div className="space-y-2">
        {checklist.map((item) => {
          const isAllowed = !disabled && (canToggleItem ? canToggleItem(item) : true)
          const isMySubtask = Boolean(
            item.assigned_staff_id && currentStaffId && item.assigned_staff_id === currentStaffId
          )

          const assignedMember = collaborators.find((c) => c.id === item.assigned_staff_id)
          const assignedName = assignedMember
            ? `${assignedMember.first_name} ${assignedMember.last_name?.slice(0, 1) || ""}.`
            : "Asignado"

          return (
            <motion.div
              key={item.id}
              layout
              className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors group",
                isAllowed
                  ? "bg-background border-border/60 hover:border-primary/40"
                  : "bg-muted/20 border-border/40 opacity-80"
              )}
            >
              <input
                type="checkbox"
                checked={item.completed}
                disabled={!isAllowed}
                onChange={() => onToggleItem(item.id, item.completed)}
                className={cn(
                  "w-4 h-4 rounded text-primary focus:ring-primary accent-primary shrink-0 transition-opacity",
                  isAllowed ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
                title={
                  disabled
                    ? "Ticket finalizado"
                    : !isAllowed
                    ? "Solo el colaborador asignado puede marcar esta subtarea"
                    : undefined
                }
              />
              <span
                className={cn(
                  "text-xs sm:text-sm flex-1",
                  item.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"
                )}
              >
                {item.title}
              </span>

              {!isAllowed && (
                <span title="Subtarea asignada a otro colaborador" className="inline-flex shrink-0">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                </span>
              )}

              {/* Subtask Assignee selector or badge */}
              {canManageChecklist && !disabled ? (
                <Select
                  value={item.assigned_staff_id || "unassigned"}
                  onValueChange={(val) =>
                    onUpdateAssignee(item.id, val === "unassigned" ? null : val)
                  }
                >
                  <SelectTrigger className="h-6 max-w-[120px] text-[10px] font-medium rounded-md border-border/60 bg-muted/30 px-1.5 py-0 gap-1 shrink-0 truncate">
                    <SelectValue placeholder="Responsable" />
                  </SelectTrigger>
                  <SelectContent className="text-xs max-w-[220px]">
                    <SelectItem value="unassigned" className="text-[11px] text-muted-foreground">
                      Sin asignar
                    </SelectItem>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-[11px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">
                            {c.first_name} {c.last_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : item.assigned_staff_id ? (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium px-1.5 py-0 shrink-0 border-border/60 bg-primary/5 text-primary gap-1"
                >
                  <User className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[80px]">{assignedName}</span>
                </Badge>
              ) : null}

              {/* Week tag or selector */}
              {canManageChecklist && !disabled ? (
                <Select
                  value={item.target_week ? String(item.target_week) : "general"}
                  onValueChange={(val) =>
                    onUpdateWeek(
                      item.id,
                      val === "general" ? null : (Number(val) as 1 | 2 | 3 | 4)
                    )
                  }
                >
                  <SelectTrigger className="h-6 w-20 text-[10px] font-semibold rounded-md border-border/60 bg-muted/30 px-1.5 py-0 gap-1 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="general" className="text-[11px] text-muted-foreground">
                      General
                    </SelectItem>
                    <SelectItem value="1" className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                      Semana 1
                    </SelectItem>
                    <SelectItem value="2" className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                      Semana 2
                    </SelectItem>
                    <SelectItem value="3" className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Semana 3
                    </SelectItem>
                    <SelectItem value="4" className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Semana 4
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : item.target_week ? (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold px-2 py-0 shrink-0 border-border/60 bg-muted/30"
                >
                  Semana {item.target_week}
                </Badge>
              ) : null}

              {item.completed && (
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 shrink-0">
                  Listo
                </Badge>
              )}

              {canManageChecklist && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label="Eliminar subtarea"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </motion.div>
          )
        })}

        {/* Add new checklist item with week selector and assignee */}
        {canManageChecklist && !disabled && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={isMeeting ? "Agregar tema a la agenda..." : "Agregar nuevo entregable o subtarea..."}
              className="text-xs bg-background h-8 flex-1 min-w-[180px]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />

            {/* Target week selector */}
            <Select
              value={newWeek}
              onValueChange={(val: any) => setNewWeek(val)}
            >
              <SelectTrigger className="h-8 w-24 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="general" className="text-xs text-muted-foreground">General</SelectItem>
                <SelectItem value="1" className="text-xs font-medium text-sky-600 dark:text-sky-400">Semana 1</SelectItem>
                <SelectItem value="2" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Semana 2</SelectItem>
                <SelectItem value="3" className="text-xs font-medium text-amber-600 dark:text-amber-400">Semana 3</SelectItem>
                <SelectItem value="4" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Semana 4</SelectItem>
              </SelectContent>
            </Select>

            {/* Assignee selector */}
            <Select
              value={newAssigneeId}
              onValueChange={setNewAssigneeId}
            >
              <SelectTrigger className="h-8 max-w-[140px] text-xs bg-background truncate">
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent className="text-xs max-w-[220px]">
                <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                  Sin asignar
                </SelectItem>
                {collaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    <span className="truncate">{c.first_name} {c.last_name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
