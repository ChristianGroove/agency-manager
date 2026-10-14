"use client";

import { motion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";

export interface EyeOffIconProps extends HTMLAttributes<HTMLDivElement> {
    size?: number;
}

export function EyeOffIcon({ className, size = 18, ...props }: EyeOffIconProps) {
    return (
        <div
            className={cn("select-none flex items-center justify-center pointer-events-none", className)}
            {...props}
        >
            <svg
                fill="none"
                height={size}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width={size}
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                <motion.path
                    d="m2 2 20 20"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                />
            </svg>
        </div>
    );
}
