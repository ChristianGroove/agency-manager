"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortalSecurityBannerProps {
  onOpenSetup: () => void;
  brandColor?: string;
}

export function PortalSecurityBanner({
  onOpenSetup,
  brandColor = "#8ec045",
}: PortalSecurityBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("pixy_portal_pin_banner_dismissed");
      if (!dismissed) {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("pixy_portal_pin_banner_dismissed", "true");
    } catch {
      // Ignored
    }
  };

  return (
    <AnimatePresence>
      {!isDismissed ? (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          style={{
            background: `linear-gradient(to right, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.03), ${brandColor}15)`,
          }}
          className="relative w-full rounded-2xl overflow-hidden border border-amber-500/30 backdrop-blur-md p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
              </div>

              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                  Asegura el acceso a tu portal con un PIN de seguridad
                </h4>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate leading-snug">
                  Configura un PIN privado para proteger tus tareas y evitar accesos no autorizados mediante tu enlace.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                Más tarde
              </button>

              <Button
                type="button"
                size="sm"
                onClick={onOpenSetup}
                style={{
                  backgroundColor: brandColor,
                  boxShadow: `0 4px 14px 0 ${brandColor}35`,
                }}
                className="h-8 rounded-xl font-bold text-xs text-white flex items-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Configurar PIN</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
