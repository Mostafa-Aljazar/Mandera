import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionBadgeProps = {
  children: ReactNode;
  className?: string;
  as?: "span" | "div";
};

export function SectionBadge({
  children,
  className,
  as: Tag = "span",
}: SectionBadgeProps) {
  return (
    <Tag
      className={cn(
        "inline-flex items-center bg-card shadow-[var(--shadow-subtle)] px-3.5 sm:px-4 py-1 sm:py-1.5 border border-primary/15 rounded-full font-semibold text-primary text-xs sm:text-sm tracking-wide",
        className,
      )}
    >
      <span
        className="bg-primary me-2 rounded-full w-1.5 h-1.5 shrink-0"
        aria-hidden
      />
      {children}
    </Tag>
  );
}
