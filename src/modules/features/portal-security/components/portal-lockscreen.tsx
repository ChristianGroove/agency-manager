"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { FuturisticOtpInput } from "./futuristic-otp-input";
import { verifyPortalPinAction } from "../actions/portal-security-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/modules/infrastructure/utils/utils";
import { toast } from "sonner";

interface PortalLockscreenProps {
  token: string;
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role?: string | null;
  };
  organization: {
    name: string;
    logo_url?: string | null;
    logo_dark_url?: string | null;
    logo_light_url?: string | null;
    isotipo_url?: string | null;
    primary_color?: string;
  };
  onUnlocked: (freshData?: any) => void;
  fetchUnlockedData?: () => Promise<any>;
}

export function PortalLockscreen({
  token,
  staff,
  organization,
  onUnlocked,
  fetchUnlockedData,
}: PortalLockscreenProps) {
  const [pin, setPin] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const brandColor = organization.primary_color || "#8ec045";
  const lightLogo = organization.logo_light_url || organization.logo_url;
  const darkLogo = organization.logo_dark_url || organization.logo_url;

  const handleVerify = async (pinToVerify?: string) => {
    const targetPin = (pinToVerify || pin).trim();
    if (targetPin.length !== 6 || isVerifying || isUnlocked || isDismissing) return;

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await verifyPortalPinAction(token, targetPin, rememberDevice);

      if (res.success) {
        setIsUnlocked(true);
        toast.success("Acceso concedido", {
          description: "Desbloqueando espacio de trabajo...",
        });

        // Concurrently prefetch unlocked data payload while unlock animation is visible
        let freshData: any = null;
        const fetchPromise = fetchUnlockedData
          ? fetchUnlockedData()
              .then((data) => {
                freshData = data;
              })
              .catch((err) => {
                console.warn("Could not prefetch unlocked portal data:", err);
              })
          : Promise.resolve();

        // 700ms celebratory hold: user clearly observes shackle open + emerald glow + OTP success state
        setTimeout(async () => {
          await fetchPromise;
          setIsDismissing(true);

          // After exit transition completes (450ms), notify parent
          setTimeout(() => {
            onUnlocked(freshData);
          }, 450);
        }, 700);
      } else {
        setErrorMsg(res.error || "PIN incorrecto. Intenta de nuevo.");
        setPin("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al autenticar el PIN.");
      setPin("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      {!isDismissing ? (
        <motion.div
          key="lockscreen-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeInOut" } }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 dark:bg-black/85 backdrop-blur-2xl overflow-y-auto"
        >
          {/* Ambient Glow Orbs */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[360px] rounded-full blur-[140px] pointer-events-none opacity-20"
            style={{ backgroundColor: brandColor }}
          />

          {/* Central Modal Card */}
          <motion.div
            key="lockscreen-card"
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{
              scale: 0.88,
              opacity: 0,
              y: -25,
              filter: "blur(12px)",
              transition: { duration: 0.45, ease: "easeIn" },
            }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            style={{
              "--primary": brandColor,
              "--brand-pink": brandColor,
              "--color-primary": brandColor,
              "--sidebar-primary": brandColor,
            } as React.CSSProperties}
            className={cn(
              "relative w-full max-w-md rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden",
              "bg-white/95 dark:bg-zinc-950/90 border border-zinc-200/80 dark:border-white/10",
              "shadow-[0_25px_70px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.65)] backdrop-blur-3xl"
            )}
          >
            {/* Top Border Neon Line */}
            <div
              className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, transparent, ${brandColor}, transparent)`,
              }}
            />

            {/* Tenant Logo / Branding */}
            <div className="mb-4 flex items-center justify-center">
              {lightLogo || darkLogo ? (
                <>
                  {lightLogo && (
                    <img
                      src={lightLogo}
                      alt={organization.name}
                      className={cn("h-7 sm:h-8 w-auto max-w-[180px] object-contain opacity-90", darkLogo ? "dark:hidden" : "")}
                    />
                  )}
                  {darkLogo && (
                    <img
                      src={darkLogo}
                      alt={organization.name}
                      className={cn("h-7 sm:h-8 w-auto max-w-[180px] object-contain opacity-90 hidden dark:block", !lightLogo ? "block" : "")}
                    />
                  )}
                </>
              ) : organization.isotipo_url ? (
                <img
                  src={organization.isotipo_url}
                  alt={organization.name}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <span className="font-extrabold text-sm tracking-tight text-zinc-800 dark:text-white/80">
                  {organization.name}
                </span>
              )}
            </div>

            {/* Holographic Lock Icon Badge with Glowing Aura */}
            <div className="relative my-3 flex items-center justify-center">
              <motion.div
                animate={
                  isUnlocked
                    ? { scale: [1, 1.25, 1], rotate: [0, 10, -10, 0] }
                    : { scale: [1, 1.05, 1] }
                }
                transition={{ duration: 2.5, repeat: isUnlocked ? 0 : Infinity, ease: "easeInOut" }}
                className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/15 shadow-2xl flex items-center justify-center"
              >
                {/* Outer Ring Glow */}
                <div
                  className="absolute inset-0 rounded-3xl opacity-30 blur-md pointer-events-none"
                  style={{ backgroundColor: isUnlocked ? "#10b981" : brandColor }}
                />

                {/* Animated Shackle */}
                {isUnlocked ? (
                  <motion.div
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Unlock className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                  </motion.div>
                ) : isVerifying ? (
                  <Loader2 className="w-9 h-9 animate-spin" style={{ color: brandColor }} />
                ) : (
                  <Lock
                    className="w-8 h-8 sm:w-9 sm:h-9 text-zinc-800 dark:text-white/90 drop-shadow-[0_0_8px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  />
                )}
              </motion.div>
            </div>

            {/* Heading & Instructions */}
            <div className="mt-3 mb-5 space-y-1 text-center">
              <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {staff.first_name} {staff.last_name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed mx-auto">
                Ingresa tu PIN para desbloquear el portal de tareas.
              </p>
            </div>

            {/* 6-Digit Futuristic OTP Component */}
            <div className="w-full mb-4">
              <FuturisticOtpInput
                value={pin}
                onChange={(val) => {
                  setPin(val);
                  if (errorMsg) setErrorMsg(null);
                }}
                onComplete={(completedPin) => {
                  handleVerify(completedPin);
                }}
                disabled={isVerifying || isUnlocked}
                error={Boolean(errorMsg)}
                isSuccess={isUnlocked}
                brandColor={brandColor}
                autoFocus={true}
              />
            </div>

            {/* Error Message with Shake Feedback */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="w-full mb-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-[11px]">{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Remember Device Checkbox */}
            <div className="w-full flex items-center justify-center gap-2 mb-5">
              <Checkbox
                id="rememberDevice"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(Boolean(checked))}
                style={rememberDevice ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
                className="border-zinc-300 dark:border-white/30 rounded-md"
              />
              <label
                htmlFor="rememberDevice"
                className="text-xs text-zinc-600 dark:text-zinc-400 select-none cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                Recordar este dispositivo por 30 días
              </label>
            </div>

            {/* Manual Unlock Button (Accessible fallback if auto-submit isn't triggered) */}
            <Button
              type="button"
              onClick={() => handleVerify()}
              disabled={pin.length !== 6 || isVerifying || isUnlocked}
              style={{
                backgroundColor: isUnlocked ? "#10b981" : brandColor,
                boxShadow: `0 10px 25px -5px ${isUnlocked ? "rgba(16, 185, 129, 0.4)" : `${brandColor}40`}`,
              }}
              className="w-full h-11 rounded-2xl font-bold text-xs tracking-wide text-white flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando PIN...</span>
                </>
              ) : isUnlocked ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Desbloqueado</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Desbloquear Portal</span>
                </>
              )}
            </Button>

            {/* Forgot PIN Link */}
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/10 w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowForgotHelp(!showForgotHelp)}
                className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" style={{ color: brandColor }} />
                <span>¿Olvidaste tu PIN de acceso?</span>
              </button>
            </div>

            {/* Forgot PIN Helper Card */}
            <AnimatePresence initial={false}>
              {showForgotHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    transition: {
                      height: { type: "spring", stiffness: 350, damping: 30 },
                      opacity: { duration: 0.22, ease: "easeOut" },
                    },
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    transition: {
                      height: { duration: 0.2, ease: [0.33, 1, 0.68, 1] },
                      opacity: { duration: 0.15 },
                    },
                  }}
                  className="overflow-hidden w-full"
                >
                  <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-center text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed shadow-xs">
                    Comunícate con tu <strong>Gestor de Proyecto</strong> o <strong>Administrador</strong> para resetear tu pin de acceso.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
