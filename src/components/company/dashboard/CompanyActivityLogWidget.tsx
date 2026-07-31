"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { History, Loader2 } from "lucide-react";
import { getCompanyActivityLog } from "@/actions/statusHistory";
import { Badge } from "@/components/ui/badge";

export default function CompanyActivityLogWidget({
  companyId,
}: {
  companyId: string;
}) {
  const { t } = useTranslation();
  const { data = [], isLoading } = useQuery({
    queryKey: ["company-activity-log", companyId],
    queryFn: async () => {
      const result = await getCompanyActivityLog(companyId);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
  });

  const hrefFor = (row: (typeof data)[number]) => {
    if (!row.entity_id) return null;
    if (row.entity_type === "client") return `/company/clients/${row.entity_id}`;
    if (row.entity_type === "owner") return `/company/owners/${row.entity_id}`;
    return `/company/properties/${row.entity_id}`;
  };

  return (
    <div
      id="company-activity-log"
      className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden"
    >
      <div className="relative flex items-start gap-3 p-5 sm:p-6 border-b border-border/60">
        <span className="flex justify-center items-center bg-primary/10 mt-0.5 border border-primary/15 rounded-xl w-10 h-10 text-primary shrink-0">
          <History className="w-5 h-5" />
        </span>
        <div>
          <h3 className="font-outfit font-semibold text-base sm:text-lg">
            {t("Full activity log")}
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            {t("Company-wide status and follow-up activity.")}
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            {t("No activity yet.")}
          </p>
        ) : (
          <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
            {data.map((row) => {
              const href = hrefFor(row);
              const title = row.entity_label || row.entity_id || t("Record");
              return (
                <li
                  key={`${row.entity_type}-${row.id}`}
                  className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {t(row.entity_type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                  </div>
                  {href ? (
                    <Link
                      href={href}
                      className="mt-1 block font-medium text-sm hover:text-primary truncate"
                    >
                      {title}
                    </Link>
                  ) : (
                    <p className="mt-1 font-medium text-sm truncate">{title}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.status_name || row.status || t("Updated")}
                    {row.created_by_name
                      ? ` · ${row.created_by_name}`
                      : null}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
