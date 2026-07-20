"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useClientsBySource } from "@/hooks/queries/useClients";
import { ChartColumn, Filter, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(192 85% 30%)",
  "hsl(199 89% 48%)",
  "hsl(160 84% 39%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 51%)",
  "hsl(173 80% 36%)",
  "hsl(215 20% 45%)",
  "hsl(24 95% 53%)",
];

interface SourceDataPoint {
  name: string;
  count: number;
}

interface ClientsBySourceWidgetProps {
  companyId?: string;
}

export default function ClientsBySourceWidget({
  companyId,
}: ClientsBySourceWidgetProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("this_month");

  const PERIODS = useMemo(
    () => [
      { id: "today", label: t("Today") },
      { id: "yesterday", label: t("Yesterday") },
      { id: "this_week", label: t("This Week") },
      { id: "this_month", label: t("This Month") },
      { id: "this_year", label: t("This Year") },
    ],
    [t],
  );

  function getDateRange(selectedPeriod: string) {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (selectedPeriod) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
        break;
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return {
      startStr: start.toISOString(),
      endStr: end.toISOString(),
    };
  }

  const { startStr, endStr } = getDateRange(period);
  const { data: sourceData, isLoading } = useClientsBySource(companyId, {
    createdFrom: startStr,
    createdTo: endStr,
  });

  const data = useMemo(() => {
    const rows = [...(sourceData ?? [])].sort((a, b) => b.count - a.count);
    return rows;
  }, [sourceData]);

  const totalClients = data.reduce((sum, item) => sum + item.count, 0);
  const topSource = data[0] ?? null;
  const topShare =
    topSource && totalClients > 0
      ? Math.round((topSource.count / totalClients) * 100)
      : 0;

  function CustomTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      color?: string;
      payload: { fill?: string; count?: number };
    }>;
    label?: string;
  }) {
    if (!active || !payload?.length) return null;

    const value = payload[0].value;
    const share =
      totalClients > 0 ? Math.round((value / totalClients) * 100) : 0;

    return (
      <div className="bg-card shadow-[var(--shadow-hover)] p-3 border border-border/60 rounded-xl min-w-[9rem]">
        <p className="mb-1.5 font-semibold text-sm">{label}</p>
        <p className="flex items-center gap-2 text-sm">
          <span
            className="inline-block rounded-full w-2.5 h-2.5 shrink-0"
            style={{
              backgroundColor: payload[0].payload.fill || payload[0].color,
            }}
          />
          <span className="text-muted-foreground">{t("Clients")}</span>
          <span className="ms-auto font-semibold text-foreground tabular-nums">
            {value}
          </span>
        </p>
        <p className="mt-1 text-muted-foreground text-xs tabular-nums">
          {share}% {t("of total")}
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.07] to-transparent h-24 pointer-events-none"
        aria-hidden
      />

      <div className="relative flex sm:flex-row flex-col sm:justify-between sm:items-start gap-4 p-5 sm:p-6 border-border/60 border-b">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex justify-center items-center bg-primary/10 mt-0.5 border border-primary/15 rounded-xl w-11 h-11 text-primary shrink-0">
            <ChartColumn className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
              {t("Clients by Source")}
            </h3>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              {t(
                "Distribution of acquired clients across marketing channels.",
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-muted/50 p-1 border border-border/60 rounded-full w-full sm:w-auto overflow-x-auto shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-colors",
                period === p.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="gap-3 grid grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="rounded-xl h-20" />
              ))}
            </div>
            <Skeleton className="rounded-xl h-[280px]" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col justify-center items-center bg-muted/20 px-4 py-16 border border-border border-dashed rounded-xl text-center">
            <span className="flex justify-center items-center bg-muted mb-4 border border-border/60 rounded-2xl w-14 h-14">
              <Filter className="opacity-60 w-6 h-6 text-muted-foreground" />
            </span>
            <p className="font-medium text-foreground">
              {t("No client data found")}
            </p>
            <p className="mt-1.5 max-w-sm text-muted-foreground text-sm leading-relaxed">
              {t(
                "There are no clients registered within the selected time period. Try selecting a wider range.",
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="gap-3 grid grid-cols-1 sm:grid-cols-3">
              <div className="bg-muted/30 p-4 border border-border/50 rounded-xl">
                <p className="font-medium text-muted-foreground text-xs">
                  {t("Total clients")}
                </p>
                <p className="mt-1.5 font-outfit font-bold text-foreground text-2xl tabular-nums tracking-tight">
                  {totalClients}
                </p>
              </div>
              <div className="bg-muted/30 p-4 border border-border/50 rounded-xl">
                <p className="font-medium text-muted-foreground text-xs">
                  {t("Sources")}
                </p>
                <p className="mt-1.5 font-outfit font-bold text-foreground text-2xl tabular-nums tracking-tight">
                  {data.length}
                </p>
              </div>
              <div className="bg-primary/[0.06] p-4 border border-primary/15 rounded-xl">
                <p className="inline-flex items-center gap-1 font-medium text-primary text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {t("Top source")}
                </p>
                <p className="mt-1.5 font-outfit font-bold text-foreground text-base sm:text-lg tracking-tight truncate">
                  {topSource?.name}
                </p>
                <p className="mt-0.5 text-muted-foreground text-xs tabular-nums">
                  {topSource?.count} · {topShare}%
                </p>
              </div>
            </div>

            <div className="gap-5 grid lg:grid-cols-5">
              <div className="bg-muted/15 p-3 sm:p-4 border border-border/50 rounded-xl lg:col-span-3 h-[280px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    margin={{ top: 8, right: 8, left: -8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
                      tickMargin={10}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                      interval={0}
                      angle={data.length > 4 ? -20 : 0}
                      textAnchor={data.length > 4 ? "end" : "middle"}
                      height={data.length > 4 ? 56 : 36}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                      content={<CustomTooltip />}
                    />
                    <Bar
                      dataKey="count"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={48}
                      animationDuration={700}
                    >
                      {data.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-2.5 lg:col-span-2">
                <p className="font-medium text-muted-foreground text-xs">
                  {t("Source breakdown")}
                </p>
                <ul className="space-y-2 max-h-[280px] overflow-y-auto pe-1">
                  {data.map((item, index) => {
                    const share =
                      totalClients > 0
                        ? Math.round((item.count / totalClients) * 100)
                        : 0;
                    const color =
                      CHART_COLORS[index % CHART_COLORS.length];

                    return (
                      <li
                        key={item.name}
                        className="bg-background/80 p-3 border border-border/50 rounded-xl"
                      >
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="rounded-full w-2.5 h-2.5 shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-medium text-foreground text-sm truncate">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-semibold text-foreground text-sm tabular-nums shrink-0">
                            {item.count}
                          </span>
                        </div>
                        <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="rounded-full h-full transition-all duration-500"
                            style={{
                              width: `${share}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <p className="mt-1.5 text-muted-foreground text-[11px] tabular-nums">
                          {share}% {t("of total")}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
