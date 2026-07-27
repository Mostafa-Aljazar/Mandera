import { cn } from "@/lib/utils";

/** Official-style UAE Dirham currency mark (inline SVG; uses currentColor). */
export function DirhamIcon({
  className,
  title = "AED",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={cn("inline-block shrink-0", className)}
    >
      {title ? <title>{title}</title> : null}
      {/* Vertical stem + right bowl (Latin “d” form of the Dirham mark) */}
      <path d="M7.25 2.75c0-.69.56-1.25 1.25-1.25H10c4.28 0 7.75 3.47 7.75 7.75v5c0 4.28-3.47 7.75-7.75 7.75H8.5c-.69 0-1.25-.56-1.25-1.25S7.81 20 8.5 20H10c2.9 0 5.25-2.35 5.25-5.25v-5C15.25 6.85 12.9 4.5 10 4.5H8.5c-.69 0-1.25-.56-1.25-1.25Z" />
      {/* Twin horizontal bars */}
      <path d="M3.5 9.15h17v1.9h-17v-1.9Zm0 3.8h17v1.9h-17v-1.9Z" />
    </svg>
  );
}

export function formatAedAmount(price: number | null | undefined): string {
  return Number(price || 0).toLocaleString("en-US");
}
