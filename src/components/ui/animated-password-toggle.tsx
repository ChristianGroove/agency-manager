"use client";

import { motion, AnimatePresence } from "framer-motion";
import { EyeIcon } from "@/components/ui/eye";
import { EyeOffIcon } from "@/components/ui/eye-off";
import { cn } from "@/modules/infrastructure/utils/utils";

export interface AnimatedPasswordToggleProps {
    isVisible: boolean;
    onToggle: () => void;
    theme?: "dark" | "light";
    className?: string;
    size?: number;
}

export function AnimatedPasswordToggle({
    isVisible,
    onToggle,
    theme = "dark",
    className,
    size = 18,
}: AnimatedPasswordToggleProps) {
    const isDark = theme === "dark";
    const label = isVisible ? "Ocultar contraseña" : "Ver contraseña";

    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 transition-colors cursor-pointer focus:outline-none",
                isDark
                    ? "text-zinc-300 hover:text-white"
                    : "text-slate-600 hover:text-slate-900",
                className
            )}
            aria-label={label}
        >
            <span className="relative w-[18px] h-[18px] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                    {isVisible ? (
                        <motion.span
                            key="eye-open"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <EyeIcon size={size} />
                        </motion.span>
                    ) : (
                        <motion.span
                            key="eye-closed"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <EyeOffIcon size={size} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </span>
        </button>
    );
}
