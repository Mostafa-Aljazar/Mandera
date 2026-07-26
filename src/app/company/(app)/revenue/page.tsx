"use client";

import React, { useMemo, useState } from "react";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import RevenueCard from "@/components/company/revenue/RevenueCard";
import { useRevenues } from "@/hooks/queries/useRevenues";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Download,
  Banknote,
  Search,
  ShieldAlert,
  Wallet,
  FilterX,
} from "lucide-react";

function StatCard({
  label,
  value,
  tone = "primary",
  isCurrency = false,
}: {
  label: string;
  value: number;
  tone?: "primary" | "sky" | "emerald" | "amber";
  isCurrency?: boolean;
}) {
  const toneStyles = {
    primary: { value: "text-foreground", glow: "from-primary/10" },
    sky: { value: "text-sky-700", glow: "from-sky-500/10" },
    emerald: { value: "text-emerald-700", glow: "from-emerald-500/10" },
    amber: { value: "text-amber-700", glow: "from-amber-500/10" },
  } as const;
  const styles = toneStyles[tone];

  return (
    <div className="relative bg-card/90 shadow-[var(--shadow-subtle)] p-3.5 sm:p-5 border border-border/60 rounded-2xl overflow-hidden">
      <div
        className={cn(
          "top-0 absolute inset-x-0 bg-gradient-to-b to-transparent h-14 pointer-events-none",
          styles.glow,
        )}
        aria-hidden
      />
      <div className="relative min-w-0">
        <p className="font-medium text-muted-foreground text-[11px] sm:text-xs truncate">
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 font-outfit font-bold tracking-tight tabular-nums",
            isCurrency ? "text-lg sm:text-2xl" : "text-xl sm:text-3xl",
            styles.value,
          )}
          dir="ltr"
        >
          {isCurrency ? `AED ${value.toLocaleString()}` : value}
        </p>
      </div>
    </div>
  );
}

const RevenuePage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const isSuperAdmin = currentUser?.role === "company_super_admin";

  const { data: revenuesData, isLoading: loading } = useRevenues(
    isSuperAdmin ? company?.id : undefined,
    {
      employeeId: selectedEmployee !== "all" ? selectedEmployee : undefined,
      dateFrom: dateFrom
        ? `${format(dateFrom, "yyyy-MM-dd")} 00:00:00`
        : undefined,
      dateTo: dateTo ? `${format(dateTo, "yyyy-MM-dd")} 23:59:59` : undefined,
    },
  );
  const revenues = revenuesData ?? [];

  const { data: employeesData } = useCompanyEmployeesLookup(
    isSuperAdmin ? company?.id : undefined,
  );
  const employees = employeesData ?? [];

  const filteredRevenues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return revenues;
    return revenues.filter((r) => {
      const haystack = [
        r.property_code,
        r.emirate,
        r.area_district,
        r.client_name,
        r.owner_name,
        r.employee_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [revenues, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredRevenues.reduce(
      (sum, r) => sum + (Number(r.commission_value) || 0),
      0,
    );
    const deals = filteredRevenues.length;
    const avg = deals > 0 ? total / deals : 0;
    const agents = new Set(
      filteredRevenues.map((r) => r.employee_id).filter(Boolean),
    ).size;
    return { total, deals, avg, agents };
  }, [filteredRevenues]);

  const hasActiveFilters =
    selectedEmployee !== "all" || !!dateFrom || !!dateTo || !!searchQuery;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count += 1;
    if (selectedEmployee !== "all") count += 1;
    if (dateFrom) count += 1;
    if (dateTo) count += 1;
    return count;
  }, [searchQuery, selectedEmployee, dateFrom, dateTo]);

  const clearFilters = () => {
    setSelectedEmployee("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
  };

  const exportCSV = () => {
    if (filteredRevenues.length === 0) {
      toast.warning(t("No data to export."));
      return;
    }
    const headers = [
      t("Property Code"),
      t("Location"),
      t("Commission"),
      t("Agent"),
      t("Client & Owner"),
      t("Completion Date"),
    ];
    const rows = filteredRevenues.map((r) => [
      r.property_code,
      r.emirate + (r.area_district ? ` - ${r.area_district}` : ""),
      r.commission_value,
      r.employee_name,
      `${r.client_name} / ${r.owner_name}`,
      format(new Date(r.deal_completion_date), "yyyy-MM-dd"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c || ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `revenues_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("Export downloaded successfully."));
  };

  if (!isSuperAdmin) {
    return (
      <>
        <DocumentHead title={`${t("Access Denied")} | MANDERA CRM`} />
        <CompanyAdminHeader />
        <main className="flex justify-center items-center bg-gradient-to-b from-muted/40 via-background to-background px-4 py-16 min-h-[calc(100vh-68px)]">
          <div className="bg-card shadow-[var(--shadow-subtle)] mx-auto p-8 border border-border/60 rounded-2xl max-w-md text-center">
            <ShieldAlert className="mx-auto mb-4 w-12 h-12 text-destructive" />
            <h2 className="mb-2 font-outfit font-bold text-foreground text-2xl">
              {t("Access Denied")}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t(
                "You do not have permission to view the revenue page. This area is restricted to company administrators.",
              )}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DocumentHead title={`${t("Revenue")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-0 pattern-grid-lg bg-primary/[0.03] opacity-40"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 py-8 sm:py-10 container max-w-6xl">
            <div className="flex md:flex-row flex-col md:justify-between md:items-end gap-5">
              <div className="min-w-0">
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl md:text-4xl tracking-tight">
                  {t("Revenue & Deals")}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("Track closed deals and analyze commission revenues.")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSV}
                  className="gap-2 rounded-lg h-9"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("Export CSV")}</span>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 container max-w-6xl">
          <section className="gap-3 sm:gap-4 grid grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("Total Revenue")}
              value={stats.total}
              tone="emerald"
              isCurrency
            />
            <StatCard label={t("Deals")} value={stats.deals} />
            <StatCard
              label={t("Avg Commission")}
              value={Math.round(stats.avg)}
              tone="sky"
              isCurrency
            />
            <StatCard
              label={t("Agents")}
              value={stats.agents}
              tone="amber"
            />
          </section>

          <section className="relative bg-card shadow-[var(--shadow-subtle)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden">
            <div
              className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.04] to-transparent h-16 pointer-events-none"
              aria-hidden
            />

            <div className="relative space-y-3">
              <div className="relative">
                <Search className="top-1/2 start-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder={t(
                    "Search by code, client, owner, or agent...",
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background ps-9 h-10"
                />
              </div>

              <div className="items-end gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 min-w-0">
                  <Label className="font-medium text-muted-foreground text-xs">
                    {t("Filter by Agent")}
                  </Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger className="bg-background w-full h-10">
                      <SelectValue placeholder={t("All Agents")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("All Agents")}</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name || e.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="font-medium text-muted-foreground text-xs">
                    {t("From Date")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start bg-background w-full h-10 font-normal",
                          !dateFrom && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {dateFrom
                            ? format(dateFrom, "MMM d, yyyy")
                            : t("Select")}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="font-medium text-muted-foreground text-xs">
                    {t("To Date")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start bg-background w-full h-10 font-normal",
                          !dateTo && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {dateTo
                            ? format(dateTo, "MMM d, yyyy")
                            : t("Select")}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end min-w-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className={cn(
                      "gap-2 w-full h-10 font-medium transition-all",
                      hasActiveFilters
                        ? "bg-primary/10 hover:bg-primary/15 border-primary/30 text-primary hover:text-primary shadow-sm"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    <FilterX className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t("Clear Filters")}</span>
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex justify-center items-center bg-primary ms-auto rounded-full min-w-[1.25rem] h-5 px-1.5 font-semibold text-primary-foreground text-[11px] tabular-nums">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div className="flex sm:flex-row flex-col justify-between items-center gap-4 bg-card shadow-[var(--shadow-subtle)] p-3.5 border border-border/60 rounded-xl">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Wallet className="w-4 h-4 text-primary/70" />
              <span>
                {t("revenues_showing_count", {
                  count: filteredRevenues.length,
                })}
              </span>
            </div>
            <p
              className="font-outfit font-semibold text-primary text-sm tabular-nums"
              dir="ltr"
            >
              AED {stats.total.toLocaleString()}
            </p>
          </div>

          {loading ? (
            <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-card border border-border/60 rounded-2xl overflow-hidden"
                >
                  <Skeleton className="h-28 w-full" />
                  <div className="space-y-3 p-5">
                    <Skeleton className="w-2/3 h-5" />
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-full h-9" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRevenues.length === 0 ? (
            <div className="relative bg-card shadow-[var(--shadow-subtle)] px-6 py-16 sm:py-20 border border-border border-dashed rounded-2xl text-center overflow-hidden">
              <div
                className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.05] to-transparent h-24 pointer-events-none"
                aria-hidden
              />
              <div className="relative">
                <Banknote className="opacity-30 mx-auto mb-4 w-12 h-12 text-primary" />
                <p className="font-outfit font-semibold text-foreground text-lg">
                  {t("No revenue records found for the selected period.")}
                </p>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
                  {t("Adjust your filters or complete a deal to see revenue here.")}
                </p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="gap-2 bg-primary/10 hover:bg-primary/15 mt-6 border-primary/30 text-primary hover:text-primary rounded-lg h-9 font-medium"
                  >
                    <FilterX className="w-4 h-4" />
                    {t("Clear Filters")}
                    <span className="inline-flex justify-center items-center bg-primary rounded-full min-w-[1.25rem] h-5 px-1.5 font-semibold text-primary-foreground text-[11px] tabular-nums">
                      {activeFilterCount}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredRevenues.map((revenue) => (
                <RevenueCard key={revenue.id} revenue={revenue} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default RevenuePage;
