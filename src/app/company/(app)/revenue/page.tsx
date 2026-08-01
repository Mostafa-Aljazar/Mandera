"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { canViewRevenue } from "@/lib/permissions";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import {
  revenueAgentLabel,
  revenueClientLabel,
  revenueOwnerLabel,
} from "@/lib/revenueLabels";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import RevenueCard from "@/components/company/revenue/RevenueCard";
import RevenueChangeLogPanel from "@/components/company/revenue/RevenueChangeLogPanel";
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
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import {
  Calendar as CalendarIcon,
  Download,
  Banknote,
  Search,
  ShieldAlert,
  Wallet,
  FilterX,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Briefcase,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 9;

function getPageNumbers(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

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
  const { t } = useTranslation();
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
        {isCurrency ? (
          <p
            className={cn(
              "inline-flex items-center gap-1.5 mt-1.5 font-outfit font-bold tracking-tight text-lg sm:text-2xl tabular-nums",
              styles.value,
            )}
            dir="ltr"
          >
            <DirhamIcon className="w-4 h-4 sm:w-5 sm:h-5" title={t("AED")} />
            {formatAedAmount(value)}
          </p>
        ) : (
          <p
            className={cn(
              "mt-1.5 font-outfit font-bold tracking-tight text-xl sm:text-3xl tabular-nums",
              styles.value,
            )}
            dir="ltr"
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

const RevenuePage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [dealStage, setDealStage] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const canAccessRevenue = canViewRevenue(currentUser?.role);

  const { data: revenuesData, isLoading: loading } = useRevenues(
    canAccessRevenue ? company?.id : undefined,
    {
      employeeId: selectedEmployee !== "all" ? selectedEmployee : undefined,
      dateFrom: dateFrom
        ? `${format(dateFrom, "yyyy-MM-dd")} 00:00:00`
        : undefined,
      dateTo: dateTo ? `${format(dateTo, "yyyy-MM-dd")} 23:59:59` : undefined,
    },
  );
  const revenues = useMemo(() => revenuesData ?? [], [revenuesData]);

  const { data: employeesData } = useCompanyEmployeesLookup(
    canAccessRevenue ? company?.id : undefined,
  );
  const employees = useMemo(() => employeesData ?? [], [employeesData]);

  const filteredRevenues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return revenues.filter((r) => {
      const deal = r.approval_status || "pending";
      const commission = r.commission_approval_status || "pending";
      const matchesStage =
        dealStage === "all" ||
        (dealStage === "deal_pending" && deal === "pending") ||
        (dealStage === "commission_pending" &&
          deal === "approved" &&
          commission === "pending") ||
        (dealStage === "awaiting_payment" &&
          deal === "approved" &&
          commission === "approved" &&
          !r.commission_paid) ||
        (dealStage === "paid" &&
          deal === "approved" &&
          commission === "approved" &&
          !!r.commission_paid) ||
        (dealStage === "rejected" &&
          (deal === "rejected" || commission === "rejected"));

      if (!matchesStage) return false;
      if (!q) return true;

      const haystack = [
        r.property_code,
        r.emirate,
        r.area_district,
        revenueClientLabel(r, language),
        revenueOwnerLabel(r, language),
        revenueAgentLabel(r, language),
        r.client_name,
        r.owner_name,
        r.employee_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [revenues, searchQuery, language, dealStage]);

  const totalPages = Math.max(1, Math.ceil(filteredRevenues.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredRevenues.length);
  const pagedRevenues = filteredRevenues.slice(pageStart, pageEnd);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const stats = useMemo(() => {
    const approved = filteredRevenues.filter(
      (r) => (r.approval_status || "pending") === "approved",
    );
    const total = approved.reduce(
      (sum, r) => sum + (Number(r.commission_value) || 0),
      0,
    );
    const paid = approved
      .filter((r) => r.commission_paid)
      .reduce((sum, r) => sum + (Number(r.commission_value) || 0), 0);
    const unpaid = total - paid;
    const deals = filteredRevenues.length;
    const agents = new Set(
      filteredRevenues.map((r) => r.employee_id).filter(Boolean),
    ).size;
    return { total, paid, unpaid, deals, agents };
  }, [filteredRevenues]);

  const employeeBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; deals: number; total: number; paid: number }
    >();
    for (const r of filteredRevenues) {
      const id = r.employee_id || "unassigned";
      const name =
        revenueAgentLabel(r, language) || t("Unassigned");
      const current = map.get(id) || {
        id,
        name,
        deals: 0,
        total: 0,
        paid: 0,
      };
      const amount = Number(r.commission_value) || 0;
      const approved = (r.approval_status || "pending") === "approved";
      current.deals += 1;
      if (approved) {
        current.total += amount;
        if (r.commission_paid) current.paid += amount;
      }
      map.set(id, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filteredRevenues, language, t]);

  const hasActiveFilters =
    selectedEmployee !== "all" ||
    dealStage !== "all" ||
    !!dateFrom ||
    !!dateTo ||
    !!searchQuery;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count += 1;
    if (selectedEmployee !== "all") count += 1;
    if (dealStage !== "all") count += 1;
    if (dateFrom) count += 1;
    if (dateTo) count += 1;
    return count;
  }, [searchQuery, selectedEmployee, dealStage, dateFrom, dateTo]);

  const clearFilters = () => {
    setSelectedEmployee("all");
    setDealStage("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setPage(1);
  };

  const exportReport = async () => {
    if (filteredRevenues.length === 0) {
      toast.warning(t("No data to export."));
      return;
    }
    setExporting(true);
    try {
      const {
        buildSimpleExportWorkbook,
        writeWorkbookAndDownload,
      } = await import("@/lib/importExport/shared");
      const headers = [
        t("Property Code"),
        t("Location"),
        t("Commission"),
        t("Deal status"),
        t("Commission status"),
        t("Payment status"),
        t("Agent"),
        t("Client"),
        t("Owner"),
        t("Completion Date"),
        t("Notes"),
      ];
      const rows = filteredRevenues.map((r) => [
        r.property_code,
        r.emirate + (r.area_district ? ` - ${r.area_district}` : ""),
        Number(r.commission_value) || 0,
        t(r.approval_status || "pending"),
        t(r.commission_approval_status || "pending"),
        r.commission_paid ? t("Paid") : t("Unpaid"),
        revenueAgentLabel(r, language),
        revenueClientLabel(r, language),
        revenueOwnerLabel(r, language),
        format(new Date(r.deal_completion_date), "yyyy-MM-dd"),
        r.notes || "",
      ]);
      const workbook = await buildSimpleExportWorkbook(
        t("Revenue"),
        headers,
        rows,
        language === "ar",
      );
      await writeWorkbookAndDownload(
        workbook,
        `revenues_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
      toast.success(t("Export downloaded successfully."));
    } catch (err) {
      console.error(err);
      toast.error(t("Export failed. Please try again."));
    } finally {
      setExporting(false);
    }
  };

  if (!canAccessRevenue) {
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
                "You do not have permission to view the revenue page. This area is restricted to company managers.",
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
                <Button asChild size="sm" className="gap-2 rounded-lg h-9">
                  <Link href="/company/revenue/new">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("Add Deal")}</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportReport()}
                  disabled={exporting}
                  className="gap-2 rounded-lg h-9"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("Export Excel")}</span>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 container max-w-6xl">
          <section className="gap-3 sm:gap-4 grid grid-cols-2 lg:grid-cols-5">
            <StatCard
              label={t("Total Revenue")}
              value={stats.total}
              tone="emerald"
              isCurrency
            />
            <StatCard
              label={t("Outstanding commissions")}
              value={stats.unpaid}
              tone="sky"
              isCurrency
            />
            <StatCard
              label={t("Commissions paid")}
              value={stats.paid}
              tone="amber"
              isCurrency
            />
            <StatCard label={t("Deals")} value={stats.deals} />
            <StatCard
              label={t("Agents")}
              value={stats.agents}
              tone="primary"
            />
          </section>

          {employeeBreakdown.length > 0 ? (
            <section className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
              <div
                className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.07] to-transparent h-20 pointer-events-none"
                aria-hidden
              />
              <div className="relative flex sm:flex-row flex-col sm:justify-between sm:items-start gap-3 p-5 sm:p-6 border-b border-border/60">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex justify-center items-center bg-primary/10 mt-0.5 border border-primary/15 rounded-xl w-10 h-10 text-primary shrink-0">
                    <Wallet className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
                      {t("Revenue by agent")}
                    </h2>
                    <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                      {t("Approved commission totals for each closing agent.")}
                    </p>
                  </div>
                </div>
                <span className="inline-flex self-start items-center bg-muted/70 px-2.5 py-1 rounded-full font-medium text-muted-foreground text-xs tabular-nums">
                  {employeeBreakdown.length} {t("Agents")}
                </span>
              </div>

              <div className="relative p-4 sm:p-5">
                <div className="border border-border/60 rounded-xl overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 text-center">
                          {t("Rank")}
                        </TableHead>
                        <TableHead>{t("Agent")}</TableHead>
                        <TableHead className="text-end whitespace-nowrap">
                          {t("Deals")}
                        </TableHead>
                        <TableHead className="text-end whitespace-nowrap">
                          {t("Total Revenue")}
                        </TableHead>
                        <TableHead className="text-end whitespace-nowrap">
                          {t("Commissions paid")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeBreakdown.map((row, index) => {
                        const isTop = index === 0 && row.total > 0;
                        return (
                          <TableRow
                            key={row.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              isTop
                                ? "bg-amber-500/[0.06] hover:bg-amber-500/10 border-s-4 border-s-amber-500"
                                : "hover:bg-muted/30",
                            )}
                            onClick={() => {
                              if (row.id !== "unassigned") {
                                setSelectedEmployee(row.id);
                                setPage(1);
                              }
                            }}
                          >
                            <TableCell className="text-center font-semibold align-middle">
                              {isTop ? (
                                <div className="flex justify-center">
                                  <Trophy className="fill-amber-500/20 w-5 h-5 text-amber-500" />
                                </div>
                              ) : (
                                <span className="text-muted-foreground tabular-nums">
                                  #{index + 1}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "font-medium",
                                    isTop && "font-bold text-amber-700",
                                  )}
                                >
                                  {row.name}
                                </span>
                                {isTop ? (
                                  <span className="inline-flex items-center bg-amber-500/15 px-2 py-0.5 rounded-full font-semibold text-amber-700 text-xs">
                                    {t("Top Performer")}
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-end font-medium align-middle">
                              <span className="inline-flex justify-end items-center gap-1.5 tabular-nums">
                                {row.deals}
                                <Briefcase className="opacity-50 w-3.5 h-3.5 text-muted-foreground" />
                              </span>
                            </TableCell>
                            <TableCell className="text-end font-medium align-middle">
                              <span className="inline-flex justify-end items-center gap-1.5 tabular-nums">
                                {formatAedAmount(row.total)}
                                <DirhamIcon
                                  className="opacity-60 w-3.5 h-3.5 text-muted-foreground"
                                  title={t("AED")}
                                />
                              </span>
                            </TableCell>
                            <TableCell className="text-end font-medium align-middle">
                              <span className="inline-flex justify-end items-center gap-1.5 tabular-nums">
                                {formatAedAmount(row.paid)}
                                <DirhamIcon
                                  className="opacity-60 w-3.5 h-3.5 text-muted-foreground"
                                  title={t("AED")}
                                />
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>
          ) : null}

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
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="bg-background ps-9 h-10"
                />
              </div>

              <div className="items-end gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1.5 min-w-0">
                  <Label className="font-medium text-muted-foreground text-xs">
                    {t("Filter by Agent")}
                  </Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={(value) => {
                      setSelectedEmployee(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="bg-background w-full h-10">
                      <SelectValue placeholder={t("All Agents")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("All Agents")}</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {employeeDisplayName(e, language, e.name) || e.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="font-medium text-muted-foreground text-xs">
                    {t("Deal stage")}
                  </Label>
                  <Select
                    value={dealStage}
                    onValueChange={(value) => {
                      setDealStage(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="bg-background w-full h-10">
                      <SelectValue placeholder={t("All stages")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("All stages")}</SelectItem>
                      <SelectItem value="deal_pending">
                        {t("Deal pending")}
                      </SelectItem>
                      <SelectItem value="commission_pending">
                        {t("Commission pending")}
                      </SelectItem>
                      <SelectItem value="awaiting_payment">
                        {t("Awaiting payment")}
                      </SelectItem>
                      <SelectItem value="paid">{t("Paid")}</SelectItem>
                      <SelectItem value="rejected">{t("Rejected")}</SelectItem>
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
                        onSelect={(date) => {
                          setDateFrom(date);
                          setPage(1);
                        }}
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
                        onSelect={(date) => {
                          setDateTo(date);
                          setPage(1);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end min-w-0 sm:col-span-2 lg:col-span-1">
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
                {filteredRevenues.length === 0
                  ? t("revenues_showing_count", { count: 0 })
                  : t("Showing {{from}}–{{to}} of {{total}}", {
                      from: pageStart + 1,
                      to: pageEnd,
                      total: filteredRevenues.length,
                    })}
              </span>
            </div>
            <p
              className="inline-flex items-center gap-1.5 font-outfit font-semibold text-primary text-sm tabular-nums"
              dir="ltr"
            >
              <DirhamIcon className="w-4 h-4" title={t("AED")} />
              {formatAedAmount(stats.total)}
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
            <>
              <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {pagedRevenues.map((revenue) => (
                  <RevenueCard key={revenue.id} revenue={revenue} />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card shadow-[var(--shadow-subtle)] px-3.5 sm:px-4 py-3 border border-border/60 rounded-2xl">
                  <p className="order-2 sm:order-1 text-muted-foreground text-xs sm:text-sm tabular-nums">
                    {t("Showing {{from}}–{{to}} of {{total}}", {
                      from: pageStart + 1,
                      to: pageEnd,
                      total: filteredRevenues.length,
                    })}
                  </p>
                  <div className="order-1 sm:order-2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl w-9 h-9"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-label={t("Previous")}
                    >
                      <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    </Button>

                    {pageNumbers.map((item, index) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-1 text-muted-foreground text-sm"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={item}
                          type="button"
                          variant={item === currentPage ? "default" : "outline"}
                          size="icon"
                          className="rounded-xl w-9 h-9 tabular-nums"
                          onClick={() => setPage(item)}
                        >
                          {item}
                        </Button>
                      ),
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl w-9 h-9"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      aria-label={t("Next")}
                    >
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {company?.id ? (
            <RevenueChangeLogPanel companyId={company.id} />
          ) : null}
        </div>
      </main>
    </>
  );
};

export default RevenuePage;
