"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/modules/infrastructure/utils/utils";
import { Award, Sparkles, ShieldCheck, Flame, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SchoolBadge, BadgeTier } from "../types/school.types";

interface SchoolBadgeCardProps {
  badge: SchoolBadge;
  earnedCount?: number;
  isUnlocked?: boolean;
  className?: string;
}

const TIER_COLORS: Record<BadgeTier, { border: string; bg: string; text: string; label: string }> = {
  bronze: { border: "#cd7f32", bg: "bg-amber-950/20", text: "text-amber-700", label: "Bronce" },
  silver: { border: "#94a3b8", bg: "bg-slate-900/20", text: "text-slate-400", label: "Plata" },
  gold: { border: "#eab308", bg: "bg-yellow-950/20", text: "text-yellow-500", label: "Oro" },
  diamond: { border: "#38bdf8", bg: "bg-sky-950/20", text: "text-sky-400", label: "Diamante" },
  legendary: { border: "#ec4899", bg: "bg-pink-950/20", text: "text-pink-400", label: "Legendario" },
};

export function SchoolBadgeCard({
  badge,
  earnedCount = 0,
  isUnlocked = true,
  className,
}: SchoolBadgeCardProps) {
  const tierConfig = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "relative group flex flex-col p-4 rounded-2xl border transition-all overflow-hidden",
        isUnlocked
          ? "bg-card/90 shadow-sm border-border"
          : "bg-muted/40 border-border/40 opacity-60 grayscale",
        className
      )}
      style={{
        boxShadow: isUnlocked ? `0 0 20px -8px ${tierConfig.border}30` : undefined,
      }}
    >
      {/* Beam Glow Accent */}
      {isUnlocked && (
        <div
          className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
          style={{ backgroundColor: badge.beam_color || tierConfig.border }}
        />
      )}

      {/* Top Header: Category & Tier */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-bold px-2 py-0.5 tracking-wider border"
          style={{ borderColor: tierConfig.border, color: tierConfig.border }}
        >
          {tierConfig.label}
        </Badge>
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          {earnedCount} {earnedCount === 1 ? "estudiante" : "estudiantes"}
        </span>
      </div>

      {/* Central Icon */}
      <div className="flex items-center gap-3 my-1">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border"
          style={{
            borderColor: `${tierConfig.border}40`,
            backgroundColor: `${tierConfig.border}15`,
          }}
        >
          {badge.icon_svg ? (
            <span dangerouslySetInnerHTML={{ __html: badge.icon_svg }} />
          ) : (
            <Award className="w-6 h-6" style={{ color: tierConfig.border }} />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {badge.name}
          </h4>
          <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {badge.description}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
