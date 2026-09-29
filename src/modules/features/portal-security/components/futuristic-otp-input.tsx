"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Delete, RotateCcw, Keyboard } from "lucide-react";
import { cn } from "@/modules/infrastructure/utils/utils";

interface FuturisticOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  isSuccess?: boolean;
  brandColor?: string;
  autoFocus?: boolean;
  showKeypad?: boolean;
  hideKeypadToggle?: boolean;
  className?: string;
}

export function FuturisticOtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  isSuccess = false,
  brandColor = "#8ec045",
  autoFocus = true,
  showKeypad: initialShowKeypad = false,
  hideKeypadToggle = false,
  className,
}: FuturisticOtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMasked, setIsMasked] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [showKeypad, setShowKeypad] = useState(initialShowKeypad);

  // Auto focus input on mount
  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // Clean value (only digits, max 6)
  const digits = value.replace(/\D/g, "").slice(0, 6);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(rawVal);

    if (rawVal.length === 6 && onComplete) {
      onComplete(rawVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && digits.length > 0) {
      // Handled natively by input
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (disabled || digits.length >= 6) return;
    const next = digits + digit;
    onChange(next);
    if (next.length === 6 && onComplete) {
      onComplete(next);
    }
  };

  const handleKeypadBackspace = () => {
    if (disabled || digits.length === 0) return;
    onChange(digits.slice(0, -1));
  };

  const handleKeypadClear = () => {
    if (disabled) return;
    onChange("");
    inputRef.current?.focus();
  };

  const activeIndex = Math.min(digits.length, 5);

  return (
    <div
      style={{
        "--primary": brandColor,
        "--brand-pink": brandColor,
        "--color-primary": brandColor,
      } as React.CSSProperties}
      className={cn("flex flex-col items-center select-none w-full", className)}
    >
      {/* 6 Digit Cells Container with Native Accessible Overlay */}
      <div className="relative py-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          value={digits}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          aria-label="PIN de seguridad"
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer caret-transparent disabled:cursor-not-allowed"
        />

        <motion.div
          animate={
            error
              ? { x: [-10, 10, -8, 8, -4, 4, 0] }
              : isSuccess
              ? { scale: [1, 1.04, 1] }
              : {}
          }
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-2 sm:gap-3 cursor-pointer"
        >
          {Array.from({ length: 6 }).map((_, index) => {
            const char = digits[index];
            const isSlotActive = isFocused && index === activeIndex && !disabled && !isSuccess;
            const isFilled = char !== undefined;

            return (
              <motion.div
                key={index}
                animate={
                  isSlotActive
                    ? { y: -2, scale: 1.05 }
                    : isFilled
                    ? { scale: 1 }
                    : { scale: 0.98 }
                }
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                style={{
                  boxShadow: isSuccess
                    ? "0 0 20px rgba(16, 185, 129, 0.45)"
                    : error
                    ? "0 0 20px rgba(244, 63, 94, 0.45)"
                    : isSlotActive
                    ? `0 0 22px ${brandColor}66`
                    : isFilled
                    ? `0 0 12px ${brandColor}33`
                    : undefined,
                  borderColor: isSuccess
                    ? undefined
                    : error
                    ? undefined
                    : isSlotActive
                    ? brandColor
                    : isFilled
                    ? `${brandColor}88`
                    : undefined,
                }}
                className={cn(
                  "relative w-10 h-13 sm:w-12 sm:h-15 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 overflow-hidden",
                  "bg-zinc-100 dark:bg-black/60 backdrop-blur-xl border font-mono font-extrabold text-xl sm:text-2xl",
                  // Borders & Glow
                  isSuccess
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : error
                    ? "border-rose-500 text-rose-600 dark:text-rose-400"
                    : isSlotActive
                    ? "text-zinc-900 dark:text-foreground ring-2 ring-primary/30"
                    : isFilled
                    ? "text-zinc-900 dark:text-foreground"
                    : "border-zinc-200 dark:border-white/10 text-muted-foreground/30 hover:border-zinc-300 dark:hover:border-white/25"
                )}
              >
                {/* Corner Cyber Accents */}
                <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-zinc-300 dark:border-white/20 rounded-tl-sm pointer-events-none" />
                <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-zinc-300 dark:border-white/20 rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-zinc-300 dark:border-white/20 rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-zinc-300 dark:border-white/20 rounded-br-sm pointer-events-none" />

                {/* Character or Masked Cyber Dot */}
                <AnimatePresence mode="wait">
                  {isFilled ? (
                    <motion.div
                      key={isMasked ? "dot" : char}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="flex items-center justify-center"
                    >
                      {isMasked ? (
                        <span
                          style={{
                            backgroundColor: brandColor,
                            boxShadow: `0 0 10px ${brandColor}`,
                          }}
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full inline-block"
                        />
                      ) : (
                        <span className="tracking-tight text-zinc-900 dark:text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                          {char}
                        </span>
                      )}
                    </motion.div>
                  ) : isSlotActive ? (
                    <motion.div
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      style={{ backgroundColor: brandColor }}
                      className="w-2.5 h-0.5 rounded-full"
                    />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-white/10" />
                  )}
                </AnimatePresence>

                {/* Active Bottom Pulsing Underline */}
                {isSlotActive && (
                  <motion.div
                    layoutId="active-slot-line"
                    style={{
                      backgroundColor: brandColor,
                      boxShadow: `0 0 8px ${brandColor}`,
                    }}
                    className="absolute bottom-0 inset-x-2 h-0.5"
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Auxiliary Controls Below OTP: Ojito on Left, Teclado on Right (Extremos - Solo iconos) */}
      <div className="w-full max-w-[270px] sm:max-w-[330px] flex items-center justify-between mt-1 px-1">
        {/* Ojito - Extremo Izquierdo */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMasked(!isMasked);
          }}
          aria-label={isMasked ? "Mostrar PIN" : "Ocultar PIN"}
          title={isMasked ? "Mostrar PIN" : "Ocultar PIN"}
          className="p-1 text-zinc-400 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-all duration-150 cursor-pointer active:scale-90 hover:scale-110 focus:outline-none"
        >
          {isMasked ? (
            <Eye className="w-3.5 h-3.5" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" style={{ color: brandColor }} />
          )}
        </button>

        {/* Teclado táctil - Extremo Derecho */}
        {!hideKeypadToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowKeypad(!showKeypad);
            }}
            aria-label={showKeypad ? "Ocultar teclado táctil" : "Teclado táctil"}
            title={showKeypad ? "Ocultar teclado táctil" : "Teclado táctil"}
            className="p-1 text-zinc-400 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-all duration-150 cursor-pointer active:scale-90 hover:scale-110 focus:outline-none"
            style={showKeypad ? { color: brandColor } : undefined}
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Futuristic Virtual Keypad (3x4 Grid) with fluid spring animation */}
      <AnimatePresence initial={false}>
        {showKeypad && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { type: "spring", stiffness: 350, damping: 32 },
                opacity: { duration: 0.22, ease: "easeOut" },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.2, ease: [0.33, 1, 0.68, 1] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden w-full max-w-[280px]"
          >
            <div className="pt-3 pb-1 border-t border-zinc-200 dark:border-white/10 mt-2">
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <motion.button
                    key={num}
                    type="button"
                    whileTap={{ scale: 0.90 }}
                    onClick={() => handleKeypadPress(num)}
                    disabled={disabled}
                    className="h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:active:bg-zinc-600 border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/30 text-zinc-800 dark:text-white font-mono font-bold text-base flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  >
                    {num}
                  </motion.button>
                ))}

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.90 }}
                  onClick={handleKeypadClear}
                  disabled={disabled || digits.length === 0}
                  className="h-11 rounded-xl bg-zinc-100 hover:bg-rose-100 active:bg-rose-200 dark:bg-zinc-800/90 dark:hover:bg-rose-500/20 active:bg-rose-500/30 border border-zinc-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/30 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-mono text-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
                  title="Borrar todo"
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.90 }}
                  onClick={() => handleKeypadPress("0")}
                  disabled={disabled}
                  className="h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:active:bg-zinc-600 border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/30 text-zinc-800 dark:text-white font-mono font-bold text-base flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  0
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.90 }}
                  onClick={handleKeypadBackspace}
                  disabled={disabled || digits.length === 0}
                  className="h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:active:bg-zinc-600 border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/30 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white font-mono text-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
                  title="Retroceso"
                >
                  <Delete className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
