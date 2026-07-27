"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import {
  useClients,
  useClientStatuses,
  useBulkAssignClients,
  getClientsExportData,
} from "@/hooks/queries/useClients";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { useMarketingChannels } from "@/hooks/queries/useOwners";
import { useDebounce } from "@/hooks/useDebounce";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import ClientCard from "@/components/company/clients/ClientCard";
import FilterPanel from "@/components/common/FilterPanel";
import FilterChips from "@/components/common/FilterChips";
import BulkAssignModal from "@/components/common/BulkAssignModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Users,
  User,
  Home,
  Key,
  Filter,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateCSV, downloadCSV } from "@/utils/csvExport";
import type { ClientWithRelations as Client } from "@/types/supabase-entities.types";

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

interface ClientFilterState {
  statusId: string | null;
  marketingChannel: string | null;
  createdFromDate: Date | null;
  createdToDate: Date | null;
  updatedFromDate: Date | null;
  updatedToDate: Date | null;
  employeeId: string | null;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone?: "primary" | "sky" | "emerald" | "amber";
}) {
  const toneStyles = {
    primary: {
      value: "text-foreground",
      icon: "bg-primary/10 text-primary",
      glow: "from-primary/10",
    },
    sky: {
      value: "text-sky-700",
      icon: "bg-sky-500/10 text-sky-600",
      glow: "from-sky-500/10",
    },
    emerald: {
      value: "text-emerald-700",
      icon: "bg-emerald-500/10 text-emerald-600",
      glow: "from-emerald-500/10",
    },
    amber: {
      value: "text-amber-700",
      icon: "bg-amber-500/10 text-amber-600",
      glow: "from-amber-500/10",
    },
  } as const;
  const styles = toneStyles[tone];

  return (
    <div className="relative bg-card shadow-[var(--shadow-subtle)] p-3.5 sm:p-4 border border-border/60 rounded-2xl overflow-hidden">
      <div
        className={cn(
          "top-0 absolute inset-x-0 bg-gradient-to-b to-transparent h-12 pointer-events-none",
          styles.glow,
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-muted-foreground text-[11px] sm:text-xs truncate">
            {label}
          </p>
          <p
            className={cn(
              "mt-1.5 font-outfit font-bold text-2xl sm:text-3xl tracking-tight tabular-nums",
              styles.value,
            )}
            dir="ltr"
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex justify-center items-center rounded-xl w-9 h-9 sm:w-10 sm:h-10 shrink-0",
            styles.icon,
          )}
        >
          <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
        </span>
      </div>
    </div>
  );
}

const ClientsPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput.trim(), 400);
  const activeSearch =
    debouncedSearch.length >= 3 ? debouncedSearch : "";

  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<ClientFilterState>({
    statusId: null,
    marketingChannel: null,
    createdFromDate: null,
    createdToDate: null,
    updatedFromDate: null,
    updatedToDate: null,
    employeeId: null,
  });

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const clientFilters = {
    employeeId:
      currentUser?.role === "company_employee"
        ? currentUser.id
        : filterState.employeeId || undefined,
    statusId: filterState.statusId || undefined,
    marketingChannel: filterState.marketingChannel || undefined,
    createdFrom: filterState.createdFromDate
      ? (() => {
          const d = new Date(filterState.createdFromDate!);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })()
      : undefined,
    createdTo: filterState.createdToDate
      ? (() => {
          const d = new Date(filterState.createdToDate!);
          d.setHours(23, 59, 59, 999);
          return d.toISOString();
        })()
      : undefined,
    updatedFrom: filterState.updatedFromDate
      ? (() => {
          const d = new Date(filterState.updatedFromDate!);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })()
      : undefined,
    updatedTo: filterState.updatedToDate
      ? (() => {
          const d = new Date(filterState.updatedToDate!);
          d.setHours(23, 59, 59, 999);
          return d.toISOString();
        })()
      : undefined,
  };

  const { data: clientsData, isLoading } = useClients(
    company?.id,
    clientFilters,
  );
  const clients = clientsData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: statusesData } = useClientStatuses(company?.id);
  const statuses = statusesData ?? [];
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannels = marketingChannelsData ?? [];

  const bulkAssignMutation = useBulkAssignClients();

  const openClient = (client: Client | null = null) => {
    if (client?.id) {
      router.push(`/company/clients/${client.id}`);
    } else {
      router.push("/company/clients/new");
    }
  };

  const stats = useMemo(() => {
    const sale = clients.filter((c) => c.interest_type === "Sale");
    const rent = clients.filter((c) => c.interest_type === "Rent");
    const followUps = clients.filter((c) => {
      if (!c.follow_up_date) return false;
      const dateStr = c.follow_up_date.split(" ")[0];
      const timeStr = c.follow_up_time || "00:00";
      return !isBefore(new Date(`${dateStr}T${timeStr}:00`), new Date());
    });
    return {
      total: clients.length,
      sale: sale.length,
      rent: rent.length,
      followUps: followUps.length,
    };
  }, [clients]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.statusId) count += 1;
    if (filterState.marketingChannel) count += 1;
    if (filterState.createdFromDate) count += 1;
    if (filterState.createdToDate) count += 1;
    if (filterState.updatedFromDate) count += 1;
    if (filterState.updatedToDate) count += 1;
    if (
      filterState.employeeId &&
      currentUser?.role === "company_super_admin"
    ) {
      count += 1;
    }
    return count;
  }, [filterState, currentUser?.role]);

  const matchesSearch = (c: Client) => {
    if (!activeSearch) return true;
    const q = activeSearch.toLowerCase();
    const digits = q.replace(/\D/g, "");
    const matchesName =
      (c.name || "").toLowerCase().includes(q) ||
      (c.name_en || "").toLowerCase().includes(q) ||
      (c.name_ar || "").includes(activeSearch);
    const matchesPhone =
      digits.length > 0 &&
      (c.phone || "").replace(/\D/g, "").includes(digits);
    return matchesName || matchesPhone;
  };

  const allClients = useMemo(
    () => clients.filter(matchesSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients, activeSearch],
  );
  const saleClients = useMemo(
    () =>
      clients.filter((c) => c.interest_type === "Sale" && matchesSearch(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients, activeSearch],
  );
  const rentClients = useMemo(
    () =>
      clients.filter((c) => c.interest_type === "Rent" && matchesSearch(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients, activeSearch],
  );

  const currentListings =
    activeTab === "All"
      ? allClients
      : activeTab === "Sale"
        ? saleClients
        : rentClients;

  useEffect(() => {
    setPage(1);
  }, [activeSearch, filterState, activeTab]);

  const totalPages = Math.max(1, Math.ceil(currentListings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, currentListings.length);
  const paginatedClients = useMemo(
    () => currentListings.slice(pageStart, pageEnd),
    [currentListings, pageStart, pageEnd],
  );
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const handleExportCSV = async () => {
    if (clients.length === 0) {
      toast.info(t("No data to export"));
      return;
    }

    const loadingToast = toast.loading(t("Exporting CSV..."));
    try {
      const result = await getClientsExportData(company!.id);
      if (result.error) throw new Error(result.error);
      const rows = result.data;

      const headers = [
        "اسم العميل",
        "رقم الهاتف",
        "الموظف المسؤول",
        "قناة التسويق",
        "الحالة",
        "تاريخ الإنشاء",
      ];
      const columns = [
        (c: (typeof rows)[number]) => c.name || "",
        (c: (typeof rows)[number]) => c.phone || "",
        (c: (typeof rows)[number]) => c.employee_name || "غير مسند",
        (c: (typeof rows)[number]) => c.marketing_channel || "",
        (c: (typeof rows)[number]) => c.status_name || "بدون حالة",
        (c: (typeof rows)[number]) =>
          c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy") : "",
      ];

      const csvString = generateCSV(rows, columns, headers);
      downloadCSV(csvString, `clients_${format(new Date(), "yyyy-MM-dd")}.csv`);
      toast.success(t("Exported successfully"), { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error(t("Export error"), { id: loadingToast });
    }
  };

  const handleRemoveFilter = (key: keyof ClientFilterState) => {
    setFilterState((prev) => ({ ...prev, [key]: null }));
  };

  const toggleClientSelection = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedClientIds((prev) => {
        const next = new Set(prev);
        paginatedClients.forEach((c) => next.add(c.id));
        return Array.from(next);
      });
    } else {
      const pageIds = new Set(paginatedClients.map((c) => c.id));
      setSelectedClientIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleBulkAssign = async ({
    employeeId,
    statusId,
  }: {
    employeeId: string;
    statusId?: string | null;
  }) => {
    try {
      const result = await bulkAssignMutation.mutateAsync({
        clientIds: selectedClientIds,
        employeeId,
        statusId,
        companyId: company!.id,
        createdByUserId: currentUser!.id,
        createdByName: currentUser?.name || currentUser?.id || "Admin",
      });
      if (result.error) throw new Error(result.error);

      toast.success(
        t("Successfully reassigned clients.", {
          count: selectedClientIds.length,
        }),
      );
      setSelectedClientIds([]);
      setIsBulkModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(
        t(
          "An error occurred during bulk assignment. Some clients may not have been updated.",
        ),
      );
    }
  };

  const renderGrid = (listType: string, listings: Client[]) => {
    if (isLoading) {
      return (
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden"
            >
              <Skeleton className="h-28 w-full rounded-none" />
              <div className="space-y-3 p-4 sm:p-5">
                <Skeleton className="w-2/3 h-5" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-9" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (listings.length === 0) {
      return (
        <div className="relative bg-card shadow-[var(--shadow-subtle)] px-5 sm:px-6 py-14 sm:py-20 border border-border border-dashed rounded-2xl text-center overflow-hidden">
          <div
            className="top-0 absolute inset-x-0 bg-gradient-to-b from-sky-500/[0.06] to-transparent h-24 pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            <div className="flex justify-center items-center bg-primary/10 mx-auto mb-4 rounded-2xl w-14 h-14">
              <Users className="w-7 h-7 text-primary/70" />
            </div>
            <p className="font-outfit font-semibold text-foreground text-lg">
              {listType === "All"
                ? t("No clients found")
                : t("No {{type}} clients found", { type: t(listType) })}
            </p>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
              {t("Adjust your filters or add a new client.")}
            </p>
            <Button
              onClick={() => openClient(null)}
              className="mt-6 rounded-xl h-10"
            >
              <Plus className="w-4 h-4" />
              {t("Add Client")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedClients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              isSelected={selectedClientIds.includes(c.id)}
              onSelect={toggleClientSelection}
            />
          ))}
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card shadow-[var(--shadow-subtle)] px-3.5 sm:px-4 py-3 border border-border/60 rounded-2xl">
            <p className="order-2 sm:order-1 text-muted-foreground text-xs sm:text-sm tabular-nums">
              {t("Showing {{from}}–{{to}} of {{total}}", {
                from: pageStart + 1,
                to: pageEnd,
                total: currentListings.length,
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t("Next")}
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <>
      <DocumentHead
        title={`${t("Clients")} | MANDERA CRM`}
        description="View and manage company clients"
      />
      <CompanyAdminHeader />

      <main className="bg-gradient-to-b from-muted/35 via-background to-background min-h-[calc(100vh-68px)] pb-24 sm:pb-8">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.09] via-transparent to-primary/[0.03]"
            aria-hidden
          />
          <div
            className="absolute inset-0 pattern-grid-lg opacity-30"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 py-6 sm:py-9 container max-w-6xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-2xl text-start">
                <Badge
                  variant="secondary"
                  className="mb-3 bg-primary/10 hover:bg-primary/10 border-primary/15 text-primary gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  {t("Clients")}
                </Badge>
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl lg:text-4xl tracking-tight">
                  {t("Client Pipeline")}
                </h1>
                <p className="mt-2 text-muted-foreground text-sm sm:text-[15px] leading-relaxed">
                  {t(
                    "Manage leads, inquiries, and track their pipeline lifecycle.",
                  )}
                </p>
              </div>

              <div className="hidden sm:flex flex-wrap items-center gap-2 shrink-0">
                {selectedClientIds.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsBulkModalOpen(true)}
                    className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl h-10"
                  >
                    <Users className="w-4 h-4" />
                    {t("Assign Selected")}
                    <span className="bg-primary/15 px-1.5 rounded-md tabular-nums text-[11px]">
                      {selectedClientIds.length}
                    </span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="gap-2 rounded-xl h-10"
                >
                  <Download className="w-4 h-4" />
                  {t("Export")}
                </Button>
                <Button
                  onClick={() => openClient(null)}
                  size="sm"
                  className="gap-2 rounded-xl h-10 font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t("Add Client")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 sm:space-y-6 container max-w-6xl">
          <section className="gap-3 grid grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("Total Clients")}
              value={stats.total}
              icon={Users}
            />
            <StatCard
              label={t("For Sale")}
              value={stats.sale}
              icon={Home}
              tone="emerald"
            />
            <StatCard
              label={t("For Rent")}
              value={stats.rent}
              icon={Key}
              tone="sky"
            />
            <StatCard
              label={t("Upcoming Follow-ups")}
              value={stats.followUps}
              icon={CalendarClock}
              tone="amber"
            />
          </section>

          <section className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
            <div
              className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.05] to-transparent h-16 pointer-events-none"
              aria-hidden
            />

            <div className="relative p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="top-1/2 start-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
                  <Input
                    placeholder={t("Search by name or phone...")}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="bg-background ps-9 h-11 rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {currentUser?.role === "company_super_admin" && (
                    <Select
                      key={`employee-filter-${language}`}
                      value={filterState.employeeId || "all"}
                      onValueChange={(val) =>
                        setFilterState((prev) => ({
                          ...prev,
                          employeeId: val === "all" ? null : val,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-background w-full lg:w-[210px] h-11 rounded-xl">
                        <SelectValue placeholder={t("All Employees")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("All Employees")}</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            <span dir="auto">
                              {employeeDisplayName(emp, language, emp.name) ||
                                emp.id}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "rounded-xl h-11 w-full sm:w-auto justify-center",
                      showFilters && "bg-muted/70 border-primary/25",
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    {showFilters ? t("Hide Filters") : t("Filters")}
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex justify-center items-center bg-primary/10 ms-1 px-1.5 rounded-full min-w-[1.25rem] h-5 font-semibold text-primary text-[11px] tabular-nums">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className="sm:hidden rounded-xl h-11"
                  >
                    <Download className="w-4 h-4" />
                    {t("Export")}
                  </Button>
                </div>
              </div>

              {(showFilters || activeFilterCount > 0) && (
                <div className="space-y-3 pt-3.5 border-border/60 border-t">
                  {showFilters ? (
                    <div className="slide-in-from-top-4 animate-in duration-300 fade-in">
                      <FilterPanel
                        statuses={statuses}
                        marketingChannels={marketingChannels}
                        onApplyFilters={(filters) =>
                          setFilterState((prev) => ({ ...prev, ...filters }))
                        }
                        onClearFilters={() =>
                          setFilterState((prev) => ({
                            ...prev,
                            statusId: null,
                            marketingChannel: null,
                            createdFromDate: null,
                            createdToDate: null,
                            updatedFromDate: null,
                            updatedToDate: null,
                          }))
                        }
                      />
                    </div>
                  ) : null}

                  <FilterChips
                    activeFilters={filterState}
                    statuses={statuses}
                    marketingChannels={marketingChannels}
                    employees={employees}
                    onRemoveFilter={handleRemoveFilter}
                  />
                </div>
              )}
            </div>
          </section>

          <section>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <div className="flex flex-col gap-3">
                <div className="overflow-x-auto -mx-1 px-1 scrollbar-none">
                  <TabsList className="bg-muted/60 p-1 border border-border/60 rounded-xl h-auto w-max min-w-full sm:min-w-0">
                    <TabsTrigger
                      value="All"
                      className="gap-1.5 sm:gap-2 data-[state=active]:bg-background px-3 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                    >
                      <User className="w-4 h-4" />
                      {t("All")}
                      <span
                        className="bg-muted/80 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums"
                        dir="ltr"
                      >
                        {allClients.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="Sale"
                      className="gap-1.5 sm:gap-2 data-[state=active]:bg-background px-3 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                    >
                      <Home className="w-4 h-4" />
                      {t("For Sale")}
                      <span
                        className="bg-muted/80 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums"
                        dir="ltr"
                      >
                        {saleClients.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="Rent"
                      className="gap-1.5 sm:gap-2 data-[state=active]:bg-background px-3 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                    >
                      <Key className="w-4 h-4" />
                      {t("For Rent")}
                      <span
                        className="bg-muted/80 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums"
                        dir="ltr"
                      >
                        {rentClients.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={
                          paginatedClients.length > 0 &&
                          paginatedClients.every((c) =>
                            selectedClientIds.includes(c.id),
                          )
                        }
                        onCheckedChange={toggleSelectAll}
                        id="select-all-clients"
                      />
                      <Label
                        htmlFor="select-all-clients"
                        className="font-medium text-sm cursor-pointer"
                      >
                        {t("Select All")}
                      </Label>
                    </div>
                    {selectedClientIds.length > 0 && (
                      <>
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/15"
                        >
                          {t("Selected")} {selectedClientIds.length}
                        </Badge>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsBulkModalOpen(true)}
                          className="sm:hidden gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg h-8"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {t("Assign Selected")}
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm tabular-nums">
                    {currentListings.length === 0
                      ? t("clients_showing_count", { count: 0 })
                      : t("Showing {{from}}–{{to}} of {{total}}", {
                          from: pageStart + 1,
                          to: pageEnd,
                          total: currentListings.length,
                        })}
                  </p>
                </div>
              </div>

              <TabsContent value="All" className="mt-0 space-y-4 outline-none">
                {renderGrid("All", allClients)}
              </TabsContent>

              <TabsContent value="Sale" className="mt-0 space-y-4 outline-none">
                {renderGrid("Sale", saleClients)}
              </TabsContent>

              <TabsContent value="Rent" className="mt-0 space-y-4 outline-none">
                {renderGrid("Rent", rentClients)}
              </TabsContent>
            </Tabs>
          </section>

          <BulkAssignModal
            isOpen={isBulkModalOpen}
            onClose={() => setIsBulkModalOpen(false)}
            onConfirm={handleBulkAssign}
            employees={employees}
            statuses={statuses}
            selectedCount={selectedClientIds.length}
          />
        </div>

        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md p-3 safe-area-pb">
          <Button
            onClick={() => openClient(null)}
            className="gap-2 rounded-xl w-full h-11 font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("Add Client")}
          </Button>
        </div>
      </main>
    </>
  );
};

export default ClientsPage;
