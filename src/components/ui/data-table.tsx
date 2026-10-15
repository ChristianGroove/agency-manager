import * as React from "react"
import { cn } from "@/modules/infrastructure/utils/utils"

/** Typography taken from the collaborator Tasks portal. */
const tableText = {
  primary: "text-xs font-semibold text-foreground",
  secondary: "text-[11px] font-normal text-muted-foreground",
  metadata: "text-[10px] font-medium text-muted-foreground",
} as const

export function DataTableText({ as: Component = "span", tone = "primary", className, ...props }:
  React.HTMLAttributes<HTMLElement> & { as?: "span" | "div" | "p"; tone?: keyof typeof tableText }) {
  return <Component className={cn(tableText[tone], className)} {...props} />
}

/** Reuses the original Tasks portal shell, including its glass-card gradient and effective radius. */
export function DataTable({ className, containerClassName, appearance = "portal", children, ...props }: React.ComponentProps<"table"> & { containerClassName?: string; appearance?: "portal" | "embedded" }) {
  return (
    <div className={cn(appearance === "portal"
      ? "glass-card rounded-3xl border border-zinc-200/80 dark:border-white/10 overflow-hidden shadow-sm bg-card"
      : "overflow-hidden", containerClassName)}>
      <div className="overflow-x-auto">
        <table className={cn("w-full text-left font-sans text-xs font-normal border-collapse [&_thead]:bg-zinc-50/80 dark:[&_thead]:bg-white/5 [&_thead]:text-muted-foreground [&_thead_th]:text-[10px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_th]:p-3.5 [&_td]:p-3.5 [&_tr]:border-b [&_tr]:border-zinc-200/80 dark:[&_tr]:border-white/10 [&_tbody_tr:last-child]:border-0", className)} {...props}>
          {children}
        </table>
      </div>
    </div>
  )
}
