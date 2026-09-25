"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/modules/infrastructure/utils/utils";
import {
  BookOpen,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SchoolCourse } from "../types/school.types";

interface TeacherTacticalRibbonProps {
  courses: SchoolCourse[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  brandColor?: string;
  className?: string;
}

export function TeacherTacticalRibbon({
  courses,
  selectedCourseId,
  onSelectCourse,
  brandColor = "#2563eb",
  className,
}: TeacherTacticalRibbonProps) {
  if (!courses || courses.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-max px-1">
        {courses.map((course) => {
          const isSelected = course.id === selectedCourseId;
          const sectionName = course.section?.name || "Sin Grupo";
          const weeklyHours = course.weekly_hours || 4;

          return (
            <motion.button
              key={course.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectCourse(course.id)}
              className={cn(
                "relative group flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all text-left",
                isSelected
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-card hover:bg-accent/40 border-border/60 hover:border-border text-muted-foreground"
              )}
              style={
                isSelected
                  ? { borderColor: brandColor, boxShadow: `0 0 15px -3px ${brandColor}25` }
                  : undefined
              }
            >
              {/* Focus Border Beam for active course */}
              {isSelected && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none border-2"
                  style={{ borderColor: brandColor }}
                />
              )}

              {/* Course Icon Badge */}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground group-hover:bg-primary/20"
                )}
                style={isSelected ? { backgroundColor: brandColor } : undefined}
              >
                <BookOpen className="w-5 h-5" />
              </div>

              {/* Course Meta */}
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground truncate max-w-[140px]">
                    {course.subject_name}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                    {sectionName}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    {weeklyHours}h/sem
                  </span>
                  <span>•</span>
                  <span className="text-emerald-500 font-medium">96% asistencia</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
