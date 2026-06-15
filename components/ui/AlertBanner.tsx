import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertTone = "info" | "success" | "warning" | "danger";

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle
};

export function AlertBanner({
  tone = "info",
  title,
  children,
  className
}: {
  tone?: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = icons[tone];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        tone === "info" && "border-cyan-200 bg-cyan-50 text-cyan-950",
        tone === "success" && "border-teal-200 bg-teal-50 text-teal-950",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-950",
        tone === "danger" && "border-red-200 bg-red-50 text-red-950",
        className
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <div className="font-medium">{title}</div>
        {children ? <div className="mt-1 text-sm leading-6 opacity-85">{children}</div> : null}
      </div>
    </div>
  );
}
