"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { getRecentPropertyStatusChanges } from "@/actions/propertyApprovals";
import { Badge } from "@/components/ui/badge";

export default function RecentStatusChangesWidget({
  companyId,
}: {
  companyId: string;
}) {
  const { t } = useTranslation();
  const { data = [], isLoading } = useQuery({
    queryKey: ["recent-property-status-changes", companyId],
    queryFn: async () => {
      const result = await getRecentPropertyStatusChanges(companyId, 14);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
  });

  return (
    <div
      id="properties-status-changed"
      className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden"
    >
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-b from-emerald-500/[0.07] to-transparent h-20 pointer-events-none"
        aria-hidden
      />
      <div className="relative flex items-start gap-3 p-5 sm:p-6 border-border/60 border-b">
        <span className="flex justify-center items-center bg-emerald-500/10 mt-0.5 border border-emerald-500/20 rounded-xl w-10 h-10 text-emerald-600 shrink-0">
          <Activity className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
            {t("Properties whose status changed")}
          </h3>
          <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
            {t("Completed property status updates in the last 14 days.")}
          </p>
        </div>
      </div>

      <div className="relative p-4 sm:p-5">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <p className="py-8 text-muted-foreground text-sm text-center">
            {t("No recent status changes.")}
          </p>
        ) : (
          <ul className="space-y-2">
            {data.slice(0, 12).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/company/properties/${row.property_id}`}
                    className="font-medium text-sm hover:text-primary truncate block"
                  >
                    {row.property_code
                      ? `${row.property_code} — ${row.property_title || ""}`
                      : row.property_title || row.property_id}
                  </Link>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {row.created_by_name
                      ? `${t("Updated by:")} ${row.created_by_name}`
                      : null}
                    {row.created_by_name ? " · " : null}
                    <span dir="ltr">
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {t(row.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
