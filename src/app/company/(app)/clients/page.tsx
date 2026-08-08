"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  canViewAllClients,
  canImportClientsOrOwners,
  canExportClientsOrOwners,
  canDeleteClientOrOwner,
  canAssignRecords,
} from "@/lib/permissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import {
  useClientsPage,
  useClientStatuses,
  useBulkAssignClients,
  useBulkDeleteClients,
} from "@/hooks/queries/useClients";
import { getClients } from "@/actions/clients";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { useMarketingChannels } from "@/hooks/queries/useOwners";
import { useDebounce } from "@/hooks/useDebounce";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import ClientCard from "@/components/company/clients/ClientCard";
import FilterPanel from "@/components/common/FilterPanel";
import FilterChips from "@/components/common/FilterChips";
import SelectionCountBadge from "@/components/common/SelectionCountBadge";
import BulkAssignModal from "@/components/common/BulkAssignModal";
import ImportClientsDialog from "@/components/company/clients/ImportClientsDialog";
import ExportClientsDialog from "@/components/company/clients/ExportClientsDialog";
import DeleteClientsDialog from "@/components/company/clients/DeleteClientsDialog";
import DuplicatesReviewPanel from "@/components/company/duplicates/DuplicatesReviewPanel";
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
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const role = currentUser?.role;
  const canExport = canExportClientsOrOwners(role);
  const canImport = canImportClientsOrOwners(role);
  const canDelete = canDeleteClientOrOwner(role);
  const canAssign = canAssignRecords(role);
  const canViewAll = canViewAllClients(role);
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportRows, setExportRows] = useState<Client[]>([]);
  const [page, setPage] = useState(1);

  const clientFilters = {
    employeeId:
      !canViewAll
        ? currentUser?.id
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
    search: activeSearch || undefined,
    interestType:
      activeTab === "Sale" || activeTab === "Rent" ? activeTab : undefined,
    page,
    pageSize: PAGE_SIZE,
    // Counts are filter-level, not page-level — only fetch on page 1.
    includeCounts: page === 1,
  };

  const { data: clientsPageData, isLoading } = useClientsPage(
    company?.id,
    clientFilters,
  );
  const paginatedClients = useMemo(
    () => clientsPageData?.items ?? [],
    [clientsPageData],
  );
  const listTotal = clientsPageData?.total ?? 0;
  const [cachedCounts, setCachedCounts] = useState(clientsPageData?.counts);
  useEffect(() => {
    if (clientsPageData?.counts) setCachedCounts(clientsPageData.counts);
  }, [clientsPageData?.counts]);
  const counts = clientsPageData?.counts ?? cachedCounts;
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = useMemo(() => employeesData ?? [], [employeesData]);
  const { data: statusesData } = useClientStatuses(company?.id);
  const statuses = useMemo(() => statusesData ?? [], [statusesData]);
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannels = useMemo(
    () => marketingChannelsData ?? [],
    [marketingChannelsData],
  );

  const bulkAssignMutation = useBulkAssignClients();
  const bulkDeleteMutation = useBulkDeleteClients();

  const openClient = (client: Client | null = null) => {
    if (client?.id) {
      router.push(`/company/clients/${client.id}`);
    } else {
      router.push("/company/clients/new");
    }
  };

  const stats = useMemo(
    () => ({
      total: counts?.all ?? 0,
      sale: counts?.sale ?? 0,
      rent: counts?.rent ?? 0,
      followUps: counts?.followUps ?? 0,
    }),
    [counts],
  );

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
      canViewAll
    ) {
      count += 1;
    }
    return count;
  }, [filterState, canViewAll]);

  useEffect(() => {
    setPage(1);
  }, [activeSearch, filterState, activeTab]);

  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = listTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + paginatedClients.length, listTotal);
  const pageNumbers = getPageNumbers(currentPage, totalPages);


  const openExportDialog = async () => {
    if (!company?.id) return;
    if (selectedClientIds.length > 0) {
      setExportRows(
        paginatedClients.filter((c) => selectedClientIds.includes(c.id)),
      );
      setIsExportDialogOpen(true);
      return;
    }
    // Full filtered export only when asked — avoids keeping all rows in memory.
    const { page: _p, pageSize: _ps, includeCounts: _c, ...exportFilters } =
      clientFilters;
    const result = await getClients(company.id, exportFilters);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setExportRows(result.data ?? []);
    setIsExportDialogOpen(true);
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
    if (checked) {
      setSelectedClientIds(paginatedClients.map((c) => c.id));
    } else {
      setSelectedClientIds([]);
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

  const handleBulkDelete = async () => {
    if (!company?.id) return;
    setIsDeleting(true);
    try {
      const result = await bulkDeleteMutation.mutateAsync({
        clientIds: selectedClientIds,
        companyId: company.id,
      });
      if (result.error) throw new Error(result.error);
      toast.success(
        selectedClientIds.length === 1
          ? t("Client deleted successfully.")
          : t("{{count}} clients deleted successfully.", {
              count: selectedClientIds.length,
            }),
      );
      setSelectedClientIds([]);
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("Error deleting clients."));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderGrid = (listType: string) => {
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

    if (paginatedClients.length === 0) {
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
              employees={employees}
              companyId={company?.id}
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
                total: listTotal,
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
                  <>
                    {canAssign ? (
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
                    ) : null}
                    {canDelete ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="gap-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive rounded-xl h-10"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("Delete Selected")}
                        <span className="bg-destructive/15 px-1.5 rounded-md tabular-nums text-[11px]">
                          {selectedClientIds.length}
                        </span>
                      </Button>
                    ) : null}
                  </>
                )}
                {canExport ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void openExportDialog()}
                    className="gap-2 rounded-xl h-10"
                  >
                    <Upload className="w-4 h-4" />
                    {t("Export")}
                  </Button>
                ) : null}
                {canImport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportDialogOpen(true)}
                    className="gap-2 rounded-xl h-10"
                  >
                    <Download className="w-4 h-4" />
                    {t("Import")}
                  </Button>
                )}
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

          {canViewAll && company?.id ? (
            <DuplicatesReviewPanel companyId={company.id} initialTab="clients" />
          ) : null}

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
                  {canViewAll && (
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

                  {canExport ? (
                    <Button
                      variant="outline"
                      onClick={() => void openExportDialog()}
                      className="sm:hidden rounded-xl h-11"
                    >
                      <Upload className="w-4 h-4" />
                      {t("Export")}
                    </Button>
                  ) : null}
                  {canImport && (
                    <Button
                      variant="outline"
                      onClick={() => setIsImportDialogOpen(true)}
                      className="sm:hidden rounded-xl h-11"
                    >
                      <Download className="w-4 h-4" />
                      {t("Import")}
                    </Button>
                  )}
                </div>
              </div>

              {(showFilters || activeFilterCount > 0) && (
                <div className="space-y-3 pt-3.5 border-border/60 border-t">
                  {showFilters ? (
                    <div className="slide-in-from-top-4 animate-in duration-300 fade-in">
                      <FilterPanel
                        statuses={statuses}
                        marketingChannels={marketingChannels}
                        initialValues={filterState}
                        onApplyFilters={(filters) =>
                          setFilterState((prev) => ({
                            ...prev,
                            statusId:
                              (filters.statusId as string | null) ?? null,
                            marketingChannel:
                              (filters.marketingChannel as string | null) ??
                              null,
                            createdFromDate:
                              (filters.createdFromDate as Date | null) ?? null,
                            createdToDate:
                              (filters.createdToDate as Date | null) ?? null,
                            updatedFromDate:
                              (filters.updatedFromDate as Date | null) ?? null,
                            updatedToDate:
                              (filters.updatedToDate as Date | null) ?? null,
                          }))
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
                        {stats.total}
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
                        {stats.sale}
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
                        {stats.rent}
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
                            ? true
                            : selectedClientIds.length > 0
                              ? "indeterminate"
                              : false
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
                        <SelectionCountBadge
                          count={selectedClientIds.length}
                          label={t("Selected")}
                          onClear={() => setSelectedClientIds([])}
                          clearLabel={t("Clear selection")}
                        />
                        {canAssign ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsBulkModalOpen(true)}
                            className="sm:hidden gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg h-8"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {t("Assign Selected")}
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="sm:hidden gap-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive rounded-lg h-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t("Delete")}
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm tabular-nums">
                    {listTotal === 0
                      ? t("clients_showing_count", { count: 0 })
                      : t("Showing {{from}}–{{to}} of {{total}}", {
                          from: pageStart + 1,
                          to: pageEnd,
                          total: listTotal,
                        })}
                  </p>
                </div>
              </div>

              <TabsContent value="All" className="mt-0 space-y-4 outline-none">
                {renderGrid("All")}
              </TabsContent>

              <TabsContent value="Sale" className="mt-0 space-y-4 outline-none">
                {renderGrid("Sale")}
              </TabsContent>

              <TabsContent value="Rent" className="mt-0 space-y-4 outline-none">
                {renderGrid("Rent")}
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

          <DeleteClientsDialog
            clientIds={selectedClientIds}
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={handleBulkDelete}
            isDeleting={isDeleting}
          />

          {company?.id && canImport ? (
            <ImportClientsDialog
              isOpen={isImportDialogOpen}
              onClose={() => setIsImportDialogOpen(false)}
              companyId={company.id}
              employees={employees}
              marketingChannels={marketingChannels.map((c) => c.name)}
              language={language}
            />
          ) : null}

          {canExport ? (
            <ExportClientsDialog
              isOpen={isExportDialogOpen}
              onClose={() => setIsExportDialogOpen(false)}
              rows={exportRows}
              selectedCount={selectedClientIds.length}
              employees={employees}
              statuses={statuses}
              language={language}
            />
          ) : null}
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
