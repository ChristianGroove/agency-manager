"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";

export interface EyeIconProps extends HTMLAttributes<HTMLDivElement> {
    size?: number;
}

export function EyeIcon({ className, size = 18, ...props }: EyeIconProps) {
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
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        </div>
    );
}
