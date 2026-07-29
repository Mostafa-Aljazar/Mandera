"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectionCountBadgeProps {
  count: number;
  label: string;
  onClear: () => void;
  clearLabel: string;
  className?: string;
}

/** A clickable "N selected" pill — clicking anywhere on it clears the selection. */
export default function SelectionCountBadge({
  count,
  label,
  onClear,
  clearLabel,
  className,
}: SelectionCountBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      title={clearLabel}
      aria-label={clearLabel}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 ps-3 pe-1.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 hover:border-primary/30",
        className,
      )}
    >
      <span className="tabular-nums">
        {label} {count}
      </span>
      <span className="flex items-center justify-center rounded-full bg-primary/15 p-0.5 transition-colors group-hover:bg-primary/25">
        <X className="w-3 h-3" />
      </span>
    </button>
  );
}
