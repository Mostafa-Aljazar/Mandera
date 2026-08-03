"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * UAE Dirham currency mark — always shows the text "AED".
 * Hover tooltip: "درهم إماراتي" (ar) or "UAE Dirham" (en).
 */
export function DirhamIcon({
  className,
  title,
  showTooltip = true,
}: {
  className?: string;
  /** Override tooltip / aria label. Defaults to t("AED") full name. */
  title?: string;
  /** Show polished hover tooltip. Default true. */
  showTooltip?: boolean;
}) {
  const { t } = useTranslation();
  const label = (title?.trim() || t("AED")).trim() || "UAE Dirham";

  const mark = (
    <span
      role="img"
      aria-label={label}
      dir="ltr"
      className={cn(
        "inline-block shrink-0 font-semibold tracking-tight leading-none",
        // Call sites still pass icon w/h — keep text readable.
        "!w-auto !h-auto text-[0.78em]",
        className,
      )}
    >
      AED
    </span>
  );

  if (!showTooltip) return mark;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default align-baseline outline-none">
            {mark}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className={cn(
            "rounded-lg border border-white/10 bg-foreground/95 px-2.5 py-1.5",
            "font-medium text-[11px] text-background shadow-lg backdrop-blur-sm",
          )}
        >
          <span dir="auto">{label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function formatAedAmount(price: number | null | undefined): string {
  return Number(price || 0).toLocaleString("en-US");
}
