import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-700",
        tone === "brand" && "border-cyan-200 bg-brand-50 text-brand-700",
        tone === "success" && "border-teal-200 bg-teal-50 text-success",
        tone === "warning" && "border-amber-200 bg-amber-50 text-warning",
        tone === "danger" && "border-red-200 bg-red-50 text-danger",
        className
      )}
      {...props}
    />
  );
}
