import { Circle, CircleCheck, CircleDot, CircleX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LabStatus } from "@/lib/types";

const statusConfig = {
  provisioning: {
    label: "Provisioning",
    className: "border-cyan-200 bg-cyan-50 text-brand-700",
    icon: Loader2
  },
  active: {
    label: "Active",
    className: "border-teal-200 bg-teal-50 text-success",
    icon: CircleDot
  },
  validating: {
    label: "Validating",
    className: "border-amber-200 bg-amber-50 text-warning",
    icon: Loader2
  },
  completed: {
    label: "Completed",
    className: "border-teal-200 bg-teal-50 text-success",
    icon: CircleCheck
  },
  failed: {
    label: "Failed",
    className: "border-red-200 bg-red-50 text-danger",
    icon: CircleX
  }
} satisfies Record<
  LabStatus,
  { label: string; className: string; icon: typeof Circle }
>;

export function StatusPill({
  status,
  className
}: {
  status: LabStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold",
        config.className,
        className
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          (status === "provisioning" || status === "validating") && "animate-spin"
        )}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
