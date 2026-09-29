"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FuturisticOtpInput } from "./futuristic-otp-input";
import {
  setupPortalPinAction,
  removePortalPinAction,
} from "../actions/portal-security-actions";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface PortalSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "setup" | "change" | "remove";
  token: string;
  onSuccess: (newHasPin: boolean) => void;
  brandColor?: string;
}

export function PortalSecurityModal({
  isOpen,
  onClose,
  mode,
  token,
  onSuccess,
  brandColor = "#8ec045",
}: PortalSecurityModalProps) {
  // Wizard steps:
  // setup: 1 (newPin) -> 2 (confirmPin) -> 3 (done)
  // change: 1 (currentPin) -> 2 (newPin) -> 3 (confirmPin) -> 4 (done)
  // remove: 1 (currentPin) -> 2 (done)
  const [step, setStep] = useState(1);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state on open/mode change
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, mode]);

  const handleSetupSubmit = async (pinValue?: string) => {
    const finalConfirm = (pinValue || confirmPin).trim();
    if (finalConfirm.length !== 6 || isSubmitting) return;

    if (newPin !== finalConfirm) {
      setErrorMsg("Los PINs no coinciden. Ingrésalos nuevamente.");
      setConfirmPin("");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await setupPortalPinAction(token, newPin);
      if (res.success) {
        toast.success("¡Seguridad activada!", {
          description: "Tu portal ahora está protegido con tu PIN de 6 dígitos.",
        });
        onSuccess(true);
        setStep(3); // success view
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || "Error al configurar el PIN.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar el PIN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeSubmit = async (pinValue?: string) => {
    const finalConfirm = (pinValue || confirmPin).trim();
    if (finalConfirm.length !== 6 || isSubmitting) return;

    if (newPin !== finalConfirm) {
      setErrorMsg("El nuevo PIN y su confirmación no coinciden.");
      setConfirmPin("");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await setupPortalPinAction(token, newPin, currentPin);
      if (res.success) {
        toast.success("PIN actualizado", {
          description: "Tu nuevo PIN de 6 dígitos ha sido guardado exitosamente.",
        });
        onSuccess(true);
        setStep(4); // success view
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || "PIN actual incorrecto o no válido.");
        if (res.error?.toLowerCase().includes("actual")) {
          // Go back to current pin step
          setStep(1);
          setCurrentPin("");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cambiar el PIN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubmit = async (pinValue?: string) => {
    const targetPin = (pinValue || currentPin).trim();
    if (targetPin.length !== 6 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await removePortalPinAction(token, targetPin);
      if (res.success) {
        toast.success("PIN desactivado", {
          description: "El portal ahora es de libre acceso con el enlace.",
        });
        onSuccess(false);
        setStep(2); // success view
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || "El PIN actual es incorrecto.");
        setCurrentPin("");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al desactivar el PIN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent
        style={{
          "--primary": brandColor,
          "--brand-pink": brandColor,
          "--color-primary": brandColor,
          "--sidebar-primary": brandColor,
        } as React.CSSProperties}
        className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/10 shadow-2xl backdrop-blur-3xl text-center"
      >
        {/* Modal Header */}
        <DialogHeader className="flex flex-col items-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-xs"
            style={{
              backgroundColor: mode === "remove" ? "rgba(244, 63, 94, 0.12)" : `${brandColor}18`,
              borderColor: mode === "remove" ? "rgba(244, 63, 94, 0.25)" : `${brandColor}35`,
              borderWidth: 1,
              borderStyle: "solid",
            }}
          >
            {mode === "remove" ? (
              <ShieldOff className="w-6 h-6 text-rose-500" />
            ) : mode === "change" ? (
              <KeyRound className="w-6 h-6" style={{ color: brandColor }} />
            ) : (
              <ShieldCheck className="w-6 h-6" style={{ color: brandColor }} />
            )}
          </div>

          <DialogTitle className="text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight">
            {mode === "setup" && "Configurar PIN de Seguridad"}
            {mode === "change" && "Cambiar PIN de Acceso"}
            {mode === "remove" && "Desactivar Protección por PIN"}
          </DialogTitle>
        </DialogHeader>

        {/* ===================== MODE: SETUP ===================== */}
        {mode === "setup" && (
          <div className="py-2 space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Ingresa un PIN de <strong>6 dígitos</strong> numéricos que usarás para desbloquear tu portal.
                </p>

                <FuturisticOtpInput
                  value={newPin}
                  onChange={(val) => {
                    setNewPin(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onComplete={() => {
                    setStep(2);
                  }}
                  brandColor={brandColor}
                  autoFocus={true}
                />

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={newPin.length !== 6}
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: `0 8px 20px -4px ${brandColor}40`,
                  }}
                  className="w-full h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Vuelve a ingresar los <strong>6 dígitos</strong> para confirmar tu PIN.
                </p>

                <FuturisticOtpInput
                  value={confirmPin}
                  onChange={(val) => {
                    setConfirmPin(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onComplete={(val) => {
                    handleSetupSubmit(val);
                  }}
                  error={Boolean(errorMsg)}
                  disabled={isSubmitting}
                  brandColor={brandColor}
                  autoFocus={true}
                />

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setConfirmPin("");
                      setErrorMsg(null);
                    }}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-semibold cursor-pointer transition-all shadow-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Atrás
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSetupSubmit()}
                    disabled={confirmPin.length !== 6 || isSubmitting}
                    style={{
                      backgroundColor: brandColor,
                      boxShadow: `0 8px 20px -4px ${brandColor}40`,
                    }}
                    className="flex-1 h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Guardar PIN</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="py-6 flex flex-col items-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                <span className="text-base font-bold text-zinc-900 dark:text-white">¡PIN Guardado Exitosamente!</span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  A partir de ahora, tu portal requerirá este PIN.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================== MODE: CHANGE ===================== */}
        {mode === "change" && (
          <div className="py-2 space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Ingresa tu <strong>PIN actual</strong> de 6 dígitos para validar tu identidad.
                </p>

                <FuturisticOtpInput
                  value={currentPin}
                  onChange={(val) => {
                    setCurrentPin(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onComplete={() => {
                    setStep(2);
                  }}
                  error={Boolean(errorMsg)}
                  brandColor={brandColor}
                  autoFocus={true}
                />

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={currentPin.length !== 6}
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: `0 8px 20px -4px ${brandColor}40`,
                  }}
                  className="w-full h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Ingresa tu <strong>nuevo PIN</strong> de 6 dígitos.
                </p>

                <FuturisticOtpInput
                  value={newPin}
                  onChange={(val) => {
                    setNewPin(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onComplete={() => {
                    setStep(3);
                  }}
                  brandColor={brandColor}
                  autoFocus={true}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-semibold cursor-pointer transition-all shadow-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Atrás
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={newPin.length !== 6}
                    style={{
                      backgroundColor: brandColor,
                      boxShadow: `0 8px 20px -4px ${brandColor}40`,
                    }}
                    className="flex-1 h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Confirma tu <strong>nuevo PIN</strong> de 6 dígitos.
                </p>

                <FuturisticOtpInput
                  value={confirmPin}
                  onChange={(val) => {
                    setConfirmPin(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onComplete={(val) => {
                    handleChangeSubmit(val);
                  }}
                  error={Boolean(errorMsg)}
                  disabled={isSubmitting}
                  brandColor={brandColor}
                  autoFocus={true}
                />

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setStep(2);
                      setConfirmPin("");
                      setErrorMsg(null);
                    }}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-semibold cursor-pointer transition-all shadow-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Atrás
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleChangeSubmit()}
                    disabled={confirmPin.length !== 6 || isSubmitting}
                    style={{
                      backgroundColor: brandColor,
                      boxShadow: `0 8px 20px -4px ${brandColor}40`,
                    }}
                    className="flex-1 h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Actualizar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="py-6 flex flex-col items-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                <span className="text-base font-bold text-zinc-900 dark:text-white">¡PIN Actualizado!</span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Tu nuevo PIN ha sido configurado de forma segura.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================== MODE: REMOVE ===================== */}
        {mode === "remove" && (
          <div className="py-2 space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs text-left leading-relaxed">
                  <strong>Atención:</strong> Al desactivar el PIN, cualquier persona que disponga de tu enlace de portal podrá acceder directamente a tus tareas sin ninguna restricción.
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Ingresa tu PIN actual de 6 dígitos para confirmar la desactivación:
                </p>

                <FuturisticOtpInput
                  value={currentPin}
                  onChange={(val) => {
                    setCurrentPin(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onComplete={(val) => {
                    handleRemoveSubmit(val);
                  }}
                  error={Boolean(errorMsg)}
                  disabled={isSubmitting}
                  brandColor={brandColor}
                  autoFocus={true}
                />

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 text-xs font-semibold cursor-pointer transition-all shadow-none"
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleRemoveSubmit()}
                    disabled={currentPin.length !== 6 || isSubmitting}
                    className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldOff className="w-4 h-4" />
                        <span>Desactivar PIN</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="py-6 flex flex-col items-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <span className="text-base font-bold text-zinc-900 dark:text-white">PIN Desactivado</span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Tu portal ahora vuelve al acceso directo por enlace.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
