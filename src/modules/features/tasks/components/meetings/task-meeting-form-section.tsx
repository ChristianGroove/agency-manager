"use client"

import React from "react"
import {
  Video,
  MapPin,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Link2,
  Check,
  Plus,
  X,
  UserCheck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type {
  TaskCollaborator,
  TaskMeetingModality,
  TaskMeetingAttendee,
  RecurrenceInterval,
} from "../../types"
import { MEETING_PRESETS } from "../../types"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"

interface TaskMeetingFormSectionProps {
  modality: TaskMeetingModality
  setModality: (m: TaskMeetingModality) => void
  meetingUrl: string
  setMeetingUrl: (url: string) => void
  meetingLocation: string
  setMeetingLocation: (loc: string) => void
  meetingStartAt: string
  setMeetingStartAt: (dt: string) => void
  durationMinutes: number
  setDurationMinutes: (mins: number) => void
  attendees: TaskMeetingAttendee[]
  setAttendees: React.Dispatch<React.SetStateAction<TaskMeetingAttendee[]>>
  collaborators: TaskCollaborator[]
  onApplyPreset?: (preset: typeof MEETING_PRESETS[number]) => void
}

export function TaskMeetingFormSection({
  modality,
  setModality,
  meetingUrl,
  setMeetingUrl,
  meetingLocation,
  setMeetingLocation,
  meetingStartAt,
  setMeetingStartAt,
  durationMinutes,
  setDurationMinutes,
  attendees,
  setAttendees,
  collaborators,
  onApplyPreset,
}: TaskMeetingFormSectionProps) {
  const toggleAttendee = (collabId: string) => {
    setAttendees((prev) => {
      const exists = prev.some((a) => a.staff_id === collabId)
      if (exists) {
        return prev.filter((a) => a.staff_id !== collabId)
      } else {
        return [
          ...prev,
          {
            staff_id: collabId,
            status: "pending",
            attended_at: null,
            check_in_method: null,
            hours_allocated: durationMinutes / 60,
            notes: null,
          },
        ]
      }
    })
  }

  const handleSelectAllTeam = () => {
    const allAttendees: TaskMeetingAttendee[] = collaborators.map((c) => ({
      staff_id: c.id,
      status: "pending",
      attended_at: null,
      check_in_method: null,
      hours_allocated: durationMinutes / 60,
      notes: null,
    }))
    setAttendees(allAttendees)
  }

  const handleClearAttendees = () => {
    setAttendees([])
  }

  const durationOptions = [15, 30, 45, 60, 90, 120]

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
      {/* Header & Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Configuración de Reunión
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            3 Presets Rápidos
          </span>
        </div>

        {/* 3 Key Presets Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MEETING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset?.(preset)}
              className="text-left p-2.5 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {preset.label}
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {preset.durationMinutes}m
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Modality Selector */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
          Modalidad de la Sesión
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setModality("virtual")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
              modality === "virtual"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-foreground border-border/80 hover:bg-muted/50"
            )}
          >
            <Video className="w-3.5 h-3.5" />
            Virtual
          </button>
          <button
            type="button"
            onClick={() => setModality("in_person")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
              modality === "in_person"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-foreground border-border/80 hover:bg-muted/50"
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            Presencial
          </button>
          <button
            type="button"
            onClick={() => setModality("hybrid")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
              modality === "hybrid"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-foreground border-border/80 hover:bg-muted/50"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Híbrida
          </button>
        </div>
      </div>

      {/* Virtual URL input */}
      {(modality === "virtual" || modality === "hybrid") && (
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Enlace de Videollamada (Meet / Zoom / Teams)
          </label>
          <div className="relative">
            <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              className="pl-8 bg-background text-xs h-9 rounded-xl font-mono"
            />
          </div>
        </div>
      )}

      {/* In-person Location input */}
      {(modality === "in_person" || modality === "hybrid") && (
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Ubicación Física / Sala
          </label>
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
              placeholder="Ej. Sala de Juntas 2, Piso 4 / Oficina de Cliente"
              className="pl-8 bg-background text-xs h-9 rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Date, Time and Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Fecha y Hora de Inicio
          </label>
          <Input
            type="datetime-local"
            value={meetingStartAt}
            onChange={(e) => setMeetingStartAt(e.target.value)}
            className="bg-background text-xs h-9 rounded-xl"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Duración ({durationMinutes} min = {durationMinutes / 60}h)
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {durationOptions.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDurationMinutes(mins)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer font-mono",
                  durationMinutes === mins
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border/80 hover:text-foreground"
                )}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Convocados / Attendees */}
      <div className="pt-2 border-t border-border/60">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Convocados a la Sesión ({attendees.length})
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllTeam}
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              Convocar a todos ({collaborators.length})
            </button>
            {attendees.length > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={handleClearAttendees}
                  className="text-[11px] font-medium text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  Limpiar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-background/50 rounded-xl border border-border/60">
          {collaborators.map((collab) => {
            const isSelected = attendees.some((a) => a.staff_id === collab.id)
            return (
              <button
                key={collab.id}
                type="button"
                onClick={() => toggleAttendee(collab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                  isSelected
                    ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                    : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Avatar className="w-4 h-4 rounded-full border border-border/60">
                  <AvatarImage src={getCollaboratorAvatar(collab.photo_url, collab.first_name)} />
                  <AvatarFallback className="text-[9px]">
                    {collab.first_name?.[0] || "C"}
                  </AvatarFallback>
                </Avatar>
                <span>{collab.first_name} {collab.last_name}</span>
                {isSelected ? (
                  <Check className="w-3 h-3 text-primary ml-0.5" />
                ) : (
                  <Plus className="w-3 h-3 opacity-40 ml-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
