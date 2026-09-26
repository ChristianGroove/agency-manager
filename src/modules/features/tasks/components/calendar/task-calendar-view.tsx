"use client"

import React, { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, type View, type Event } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  ExternalLink,
  Clock,
  AlertOctagon,
  User,
  Calendar as CalendarIcon,
} from 'lucide-react'

import 'react-big-calendar/lib/css/react-big-calendar.css'
import './task-calendar-view.css'

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/modules/infrastructure/utils/utils'
import { TaskItem, TaskSprint, TASK_STATUS_LABELS, ensureAbsoluteUrl } from '../../types'

const locales = {
  es: es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface TaskCalendarViewProps {
  tasks: TaskItem[]
  sprints?: TaskSprint[]
  includeMeetings?: boolean
  onTaskClick: (task: TaskItem) => void
  brandColor?: string
}

interface CalendarEvent extends Event {
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource?: any
  isBackground?: boolean
}

function parseSafeDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  const trimmed = dateStr.trim()
  if (!trimmed) return null
  let normalized = trimmed
  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T')
  } else if (!normalized.includes('T')) {
    normalized = `${normalized}T00:00:00`
  }
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

function tasksToCalendarEvents(
  tasks: TaskItem[],
  sprints: TaskSprint[] | undefined
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  if (!tasks || !Array.isArray(tasks)) return events

  for (const task of tasks) {
    if (task.type === 'meeting') {
      const meetingStart = task.meeting_start_at || task.due_date
      if (meetingStart) {
        const start = parseSafeDate(meetingStart)
        if (start) {
          const duration = task.meeting_duration_minutes || 30
          const end = new Date(start.getTime() + duration * 60000)
          events.push({
            title: task.title,
            start,
            end,
            allDay: false,
            resource: task,
          })
        }
      }
    } else if (task.due_date) {
      const start = parseSafeDate(task.due_date)
      if (start) {
        events.push({
          title: task.ticket_code ? `[${task.ticket_code}] ${task.title}` : task.title,
          start,
          end: start,
          allDay: true,
          resource: task,
        })
      }
    }
  }

  if (sprints && sprints.length > 0) {
    for (const sprint of sprints) {
      if (sprint.start_date && sprint.end_date) {
        const start = parseSafeDate(sprint.start_date)
        const parsedEnd = parseSafeDate(sprint.end_date)
        if (start && parsedEnd) {
          const end = new Date(
            parsedEnd.getFullYear(),
            parsedEnd.getMonth(),
            parsedEnd.getDate(),
            23,
            59,
            59
          )
          events.push({
            title: sprint.name || 'Sprint',
            start,
            end,
            allDay: true,
            isBackground: true,
            resource: { ...sprint, isSprint: true },
          })
        }
      }
    }
  }

  return events
}

function CustomToolbar(props: any) {
  const { label, onNavigate, onView, view, views, localizer } = props
  const viewList = Array.isArray(views) ? views : Object.keys(views || {})

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
      <div className="flex items-center rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-100/80 dark:bg-zinc-800/60 p-1 shadow-2xs backdrop-blur-sm">
        <button
          type="button"
          onClick={() => onNavigate('PREV')}
          className="flex items-center justify-center p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => onNavigate('NEXT')}
          className="flex items-center justify-center p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <span className="text-base sm:text-lg font-bold text-foreground capitalize tracking-tight select-none">
        {label}
      </span>

      <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/80 dark:border-white/10">
        {viewList.map((v: string) => {
          const isActive = view === v
          const viewLabel = localizer?.messages?.[v] || (v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día')
          return (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className={cn(
                "px-3 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer",
                isActive
                  ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
              )}
            >
              {viewLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CustomCalendarEvent(props: any) {
  const event = props.event as CalendarEvent
  const task = event.resource as TaskItem | undefined
  const isSprint = Boolean(event.isBackground || (task && (task as any).isSprint))

  if (isSprint || !task) {
    return <span className="font-semibold text-xs truncate block">{props.title || event.title}</span>
  }

  if (task.type === 'meeting') {
    const startTime = event.start ? format(event.start, 'HH:mm') : ''
    const isPerson = task.meeting_modality === 'in_person'
    return (
      <div className="flex items-center gap-1.5 w-full min-w-0 overflow-hidden leading-tight text-xs py-0.5">
        {startTime && (
          <span className="font-mono text-[10px] font-semibold opacity-90 shrink-0">
            {startTime}
          </span>
        )}
        {isPerson ? (
          <MapPin className="w-3 h-3 shrink-0 opacity-85" />
        ) : (
          <Video className="w-3 h-3 shrink-0 opacity-85" />
        )}
        <span className="truncate font-medium flex-1">
          {task.title}
        </span>
      </div>
    )
  }

  const isBlocked = task.status === 'blocked' || Boolean(task.blocked_by) || Boolean(task.blocked_by_task_id)
  const initials = task.assigned_staff
    ? `${(task.assigned_staff.first_name || '')[0] || ''}${(task.assigned_staff.last_name || '')[0] || ''}`.toUpperCase()
    : ''

  return (
    <div className="flex items-center gap-1.5 w-full min-w-0 overflow-hidden leading-tight text-xs py-0.5">
      {task.ticket_code && (
        <span className="font-mono text-[10px] font-bold shrink-0 opacity-90">
          {task.ticket_code}
        </span>
      )}
      {task.assigned_staff && (
        task.assigned_staff.photo_url ? (
          <img
            src={task.assigned_staff.photo_url}
            alt={task.assigned_staff.first_name}
            className="w-3.5 h-3.5 rounded-full object-cover shrink-0 ring-1 ring-current/20"
          />
        ) : initials ? (
          <span className="w-3.5 h-3.5 rounded-full bg-current/20 text-[8px] font-bold flex items-center justify-center shrink-0 uppercase">
            {initials}
          </span>
        ) : null
      )}
      <span className="truncate font-medium flex-1">
        {task.title}
      </span>
      {isBlocked && (
        <AlertOctagon
          className={cn(
            "w-3 h-3 shrink-0",
            task.priority === 'high'
              ? "text-rose-900 dark:text-rose-950 fill-rose-200"
              : task.status === 'done'
                ? "text-rose-600 dark:text-rose-400"
                : "text-amber-300 dark:text-amber-300 fill-amber-400/20"
          )}
        />
      )}
    </div>
  )
}

function CustomCalendarEventWrapper(props: any) {
  const { event, children } = props
  const task = event?.resource as TaskItem | undefined
  const isSprint = Boolean(event?.isBackground || (task && (task as any)?.isSprint))

  if (isSprint || !task) {
    return children
  }

  const isMeeting = task.type === 'meeting'
  const isBlocked = task.status === 'blocked' || Boolean(task.blocked_by) || Boolean(task.blocked_by_task_id)
  const initials = task.assigned_staff
    ? `${(task.assigned_staff.first_name || '')[0] || ''}${(task.assigned_staff.last_name || '')[0] || ''}`.toUpperCase()
    : ''

  const formattedDueDate = task.due_date
    ? (() => {
        const d = parseSafeDate(task.due_date)
        return d ? format(d, "EEEE, d 'de' MMMM, yyyy", { locale: es }) : task.due_date
      })()
    : null

  const meetingStartStr = event.start ? format(event.start, 'HH:mm') : ''
  const meetingEndStr = event.end ? format(event.end, 'HH:mm') : ''
  const durationMinutes =
    task.meeting_duration_minutes ||
    (event.start && event.end
      ? Math.round((event.end.getTime() - event.start.getTime()) / 60000)
      : 30)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="w-72 sm:w-80 p-3 space-y-2.5 z-[60] shadow-xl border border-border bg-popover/95 backdrop-blur-md text-popover-foreground rounded-xl pointer-events-auto"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-muted-foreground tracking-wider">
            {task.ticket_code || 'SIN CÓDIGO'}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 shadow-none border",
              task.status === 'done' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
              task.status === 'blocked' && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
              task.status === 'in_progress' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
              task.status === 'in_review' && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
              task.status === 'todo' && "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
              task.status === 'backlog' && "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30"
            )}
          >
            {TASK_STATUS_LABELS[task.status] || task.status}
          </Badge>
        </div>

        <h4 className="text-sm font-semibold text-foreground leading-snug break-words">
          {task.title}
        </h4>

        {isMeeting ? (
          <div className="space-y-1.5 pt-1 border-t border-border/60 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span>
                {meetingStartStr} - {meetingEndStr} ({durationMinutes} min)
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {task.meeting_modality === 'in_person' ? (
                  <>
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>{task.meeting_location || 'Presencial'}</span>
                  </>
                ) : task.meeting_modality === 'hybrid' ? (
                  <>
                    <Video className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                    <span>Híbrida</span>
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                    <span>Virtual</span>
                  </>
                )}
              </div>

              {task.meeting_url && (
                <a
                  href={ensureAbsoluteUrl(task.meeting_url)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  <span>Unirse</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1 border-t border-border/60 text-xs">
            {formattedDueDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="capitalize">{formattedDueDate}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {task.actual_hours || 0}h registradas / {task.estimated_hours || 0}h estimadas
              </span>
            </div>

            {isBlocked && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block">Tarea Bloqueada</span>
                  {task.blocked_by ? (
                    <span className="text-[11px] opacity-90 block truncate">
                      Bloqueada por {task.blocked_by.ticket_code}: {task.blocked_by.title}
                    </span>
                  ) : task.blocked_reason ? (
                    <span className="text-[11px] opacity-90 block">
                      {task.blocked_reason}
                    </span>
                  ) : (
                    <span className="text-[11px] opacity-90 block">
                      Requiere resolución de impedimento
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {task.assigned_staff ? (
              <>
                {task.assigned_staff.photo_url ? (
                  <img
                    src={task.assigned_staff.photo_url}
                    alt={task.assigned_staff.first_name}
                    className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-border"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 uppercase">
                    {initials || 'U'}
                  </span>
                )}
                <span className="text-foreground font-medium truncate max-w-[130px]">
                  {task.assigned_staff.first_name} {task.assigned_staff.last_name || ''}
                </span>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>Sin asignar</span>
              </div>
            )}
          </div>

          {task.project && (
            <div className="flex items-center gap-1.5 shrink-0 max-w-[120px] text-right">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: task.project.color || '#6366f1' }}
              />
              <span className="text-muted-foreground truncate text-[11px]">
                {task.project.name}
              </span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function TaskCalendarView({
  tasks,
  sprints,
  includeMeetings,
  onTaskClick,
  brandColor = '#4f46e5',
}: TaskCalendarViewProps) {
  const [currentView, setCurrentView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const defaultScrollTime = useMemo(() => new Date(1970, 0, 1, 8, 0, 0), [])

  const events = useMemo(() => {
    return tasksToCalendarEvents(tasks, sprints)
  }, [tasks, sprints])

  const eventPropGetter = (event: CalendarEvent) => {
    if (event.isBackground) {
      return {
        className: 'rbc-background-event',
      }
    }

    const task = event.resource as TaskItem | undefined
    let className = 'transition-all duration-150 '
    const style: React.CSSProperties = {
      borderRadius: '6px',
    }

    if (task) {
      if (task.status === 'done') {
        className += 'bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800 line-through opacity-85'
      } else if (task.status === 'blocked') {
        className += 'bg-rose-100 text-rose-950 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800 font-semibold shadow-xs'
      } else if (task.type === 'meeting') {
        className += 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700/50 shadow-xs dark:bg-indigo-600/90 dark:border-indigo-400/30'
      } else {
        switch (task.priority) {
          case 'urgent':
            className += 'bg-rose-600 text-white hover:bg-rose-700 border border-rose-700/50 shadow-xs dark:bg-rose-600/90 dark:border-rose-400/30'
            break
          case 'high':
            className += 'bg-amber-400 text-zinc-950 font-semibold hover:bg-amber-500 border border-amber-500/60 shadow-xs dark:bg-amber-400 dark:text-zinc-950'
            break
          case 'medium':
            className += 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-700/50 shadow-xs dark:bg-blue-600/90 dark:border-blue-400/30'
            break
          case 'low':
            className += 'bg-zinc-600 text-white hover:bg-zinc-700 border border-zinc-700/50 shadow-xs dark:bg-zinc-700/90 dark:border-zinc-500/30'
            break
          default:
            className += 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700/50 shadow-xs dark:bg-indigo-600/90 dark:border-indigo-400/30'
            break
        }
      }
    }

    return { className, style }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.resource && !event.resource.isSprint) {
      onTaskClick(event.resource as TaskItem)
    }
  }

  return (
    <div
      className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-sm min-h-[500px]"
      style={{ ['--calendar-brand' as any]: brandColor }}
    >
      <TooltipProvider delayDuration={150}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          tooltipAccessor={() => ''}
          style={{ height: 640 }}
          view={currentView}
          onView={setCurrentView}
          views={['month', 'week', 'day']}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          scrollToTime={defaultScrollTime}
          popup
          culture="es"
          messages={{
            allDay: 'Todo el día',
            previous: 'Anterior',
            next: 'Siguiente',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay eventos en este rango',
            showMore: (total: number) => `+${total} más`,
          }}
          components={{
            toolbar: CustomToolbar,
            event: CustomCalendarEvent,
            eventWrapper: CustomCalendarEventWrapper,
          }}
        />
      </TooltipProvider>
    </div>
  )
}
