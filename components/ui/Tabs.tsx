"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabItem = {
  value: string;
  label: string;
  content: ReactNode;
};

export function Tabs({
  items,
  defaultValue,
  className
}: {
  items: TabItem[];
  defaultValue?: string;
  className?: string;
}) {
  const [activeValue, setActiveValue] = useState(defaultValue ?? items[0]?.value);
  const activeTab = items.find((item) => item.value === activeValue) ?? items[0];

  return (
    <div className={className}>
      <div
        className="inline-flex rounded-md border border-line bg-white p-1"
        role="tablist"
        aria-label="Lab sections"
      >
        {items.map((item) => (
          <button
            key={item.value}
            className={cn(
              "h-8 rounded px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
              activeValue === item.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
            role="tab"
            type="button"
            aria-selected={activeValue === item.value}
            onClick={() => setActiveValue(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4" role="tabpanel">
        {activeTab?.content}
      </div>
    </div>
  );
}
