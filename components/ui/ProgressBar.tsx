import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  label,
  className
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-muted">{normalized}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalized}
        aria-label={label ?? "Progress"}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}
