"use client";

import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { History, Loader2 } from "lucide-react";
import { useRevenueChangeLog } from "@/hooks/queries/useRevenues";
import { Badge } from "@/components/ui/badge";

export default function RevenueChangeLogPanel({
  companyId,
}: {
  companyId: string;
}) {
  const { t } = useTranslation();
  const { data = [], isLoading } = useRevenueChangeLog(companyId);

  return (
    <section className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
      <div className="flex items-start gap-3 p-5 border-b border-border/60">
        <span className="flex justify-center items-center bg-primary/10 border border-primary/15 rounded-xl w-10 h-10 text-primary shrink-0">
          <History className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-outfit font-semibold text-foreground">
            {t("Financial amendments log")}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {t("Audit trail of revenue and commission changes.")}
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
            {t("No financial amendments yet.")}
          </p>
        ) : (
          <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
            {data.slice(0, 50).map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t(row.action)}
                  </Badge>
                  <span className="text-muted-foreground text-xs" dir="ltr">
                    {format(new Date(row.created_at), "yyyy-MM-dd HH:mm")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm">
                  {row.changed_by_name || t("Unknown")}
                  {row.note ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {row.note}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground truncate">
                  {row.revenue_id}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
