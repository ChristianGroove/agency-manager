"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  ChevronDown,
} from "lucide-react";
import { getCollaboratorAvatar } from "@/modules/features/tasks/utils/avatar-presets";

interface PortalAvatarSecurityMenuProps {
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role?: string | null;
    has_pin_code?: boolean;
  };
  brandColor?: string;
  onLock: () => void;
  onOpenSecurityModal: (mode: "setup" | "change" | "remove") => void;
}

export function PortalAvatarSecurityMenu({
  staff,
  brandColor = "#8ec045",
  onLock,
  onOpenSecurityModal,
}: PortalAvatarSecurityMenuProps) {
  const hasPin = Boolean(staff.has_pin_code);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex items-center gap-2 p-1 pl-2 sm:pl-2.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer border border-transparent hover:border-zinc-200/80 dark:hover:border-white/10"
          aria-label="Menú de perfil y seguridad del portal"
        >
          {/* Nombre y Cargo */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-foreground leading-tight">
              {staff.first_name} {staff.last_name}
            </span>
            {staff.role && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                {staff.role}
              </span>
            )}
          </div>

          {/* Avatar */}
          <Avatar className="w-8 h-8 rounded-full border border-border/80 shadow-xs shrink-0">
            <AvatarImage
              src={getCollaboratorAvatar(staff.photo_url, staff.first_name)}
              className="object-cover"
            />
            <AvatarFallback className="text-xs text-white font-bold" style={{ backgroundColor: brandColor }}>
              {staff.first_name?.[0]}
              {staff.last_name?.[0]}
            </AvatarFallback>
          </Avatar>

          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        style={{
          "--primary": brandColor,
          "--brand-pink": brandColor,
          "--color-primary": brandColor,
          "--sidebar-primary": brandColor,
        } as React.CSSProperties}
        className="w-64 p-2 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-white/10 bg-card/95 backdrop-blur-xl"
      >
        {/* Header con Perfil y Estado */}
        <div className="p-2.5 pb-2">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9 rounded-full border border-border/60 shrink-0">
              <AvatarImage
                src={getCollaboratorAvatar(staff.photo_url, staff.first_name)}
                className="object-cover"
              />
              <AvatarFallback className="text-xs text-white font-bold" style={{ backgroundColor: brandColor }}>
                {staff.first_name?.[0]}
                {staff.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <span className="font-bold text-xs text-foreground block truncate">
                {staff.first_name} {staff.last_name}
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {staff.role || "Colaborador"}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 border-border/60" />

        {/* Acciones de Seguridad */}
        {hasPin ? (
          <>
            {/* Bloquear sesión ahora */}
            <DropdownMenuItem
              onClick={onLock}
              className="py-2 px-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-foreground">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span>Bloquear portal ahora</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Cierra la sesión en este equipo
                </span>
              </div>
            </DropdownMenuItem>

            {/* Cambiar PIN */}
            <DropdownMenuItem
              onClick={() => onOpenSecurityModal("change")}
              className="py-2 px-2.5 rounded-xl text-xs font-semibold text-foreground hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${brandColor}18`, color: brandColor }}
              >
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span>Cambiar PIN de acceso</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Modifica tu clave de acceso
                </span>
              </div>
            </DropdownMenuItem>

            {/* Desactivar PIN */}
            <DropdownMenuItem
              onClick={() => onOpenSecurityModal("remove")}
              className="py-2 px-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ShieldOff className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span>Desactivar PIN</span>
                <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70 font-normal">
                  Vuelve a acceso directo con enlace
                </span>
              </div>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={() => onOpenSecurityModal("setup")}
            className="py-2.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 cursor-pointer hover:bg-white/5 transition-colors"
            style={{ color: brandColor }}
          >
            <div
              className="w-7 h-7 rounded-xl text-white flex items-center justify-center shadow-xs"
              style={{ backgroundColor: brandColor }}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span>Configurar PIN de seguridad</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Protege tus tareas y proyectos
              </span>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
