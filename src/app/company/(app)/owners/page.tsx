"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  canViewAllOwners,
  canImportClientsOrOwners,
  canExportClientsOrOwners,
  canDeleteClientOrOwner,
  canAssignRecords,
} from "@/lib/permissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import {
  useOwnersPage,
  useOwnerStatuses,
  useMarketingChannels,
  useBulkReassignOwners,
  useBulkDeleteOwners,
} from "@/hooks/queries/useOwners";
import { getOwners } from "@/actions/owners";
import type { Owner } from "@/types/supabase-entities.types";
import { useDebounce } from "@/hooks/useDebounce";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import OwnerCard from "@/components/company/owners/OwnerCard";
import FilterPanel from "@/components/common/FilterPanel";
import FilterChips from "@/components/common/FilterChips";
import SelectionCountBadge from "@/components/common/SelectionCountBadge";
import EmployeeReassignmentModal from "@/components/company/employees/EmployeeReassignmentModal";
import ImportOwnersDialog from "@/components/company/owners/ImportOwnersDialog";
import ExportOwnersDialog from "@/components/company/owners/ExportOwnersDialog";
import DeleteOwnersDialog from "@/components/company/owners/DeleteOwnersDialog";
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
import {
  Plus,
  Users,
  User,
  UserCheck,
  UserX,
  Megaphone,
  Filter,
  Download,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface OwnerFilterState {
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
      <div className="relative flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[11px] text-muted-foreground sm:text-xs truncate">
            {label}
          </p>
          <p
            className={cn(
              "mt-1.5 font-outfit font-bold tabular-nums text-2xl sm:text-3xl tracking-tight",
              styles.value,
            )}
            dir="ltr"
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex justify-center items-center rounded-xl w-9 sm:w-10 h-9 sm:h-10 shrink-0",
            styles.icon,
          )}
        >
          <Icon className="w-4 sm:w-[18px] h-4 sm:h-[18px]" />
        </span>
      </div>
    </div>
  );
}

const OwnersPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const role = currentUser?.role;
  const canExport = canExportClientsOrOwners(role);
  const canImport = canImportClientsOrOwners(role);
  const canDelete = canDeleteClientOrOwner(role);
  const canAssign = canAssignRecords(role);
  const canViewAll = canViewAllOwners(role);
  const { language } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput.trim(), 400);
  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<OwnerFilterState>({
    statusId: null,
    marketingChannel: null,
    createdFromDate: null,
    createdToDate: null,
    updatedFromDate: null,
    updatedToDate: null,
    employeeId: null,
  });

  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportRows, setExportRows] = useState<Owner[]>([]);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);

  const activeSearch = debouncedSearch.length >= 3 ? debouncedSearch : "";

  const ownerFilters = {
    assignedEmployeeId:
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
    page,
    pageSize: PAGE_SIZE,
    includeCounts: page === 1,
  };

  const { data: ownersPageData, isLoading } = useOwnersPage(
    company?.id,
    ownerFilters,
  );
  const paginatedOwners = useMemo(
    () => ownersPageData?.items ?? [],
    [ownersPageData],
  );
  const listTotal = ownersPageData?.total ?? 0;
  const [cachedCounts, setCachedCounts] = useState(ownersPageData?.counts);
  useEffect(() => {
    if (ownersPageData?.counts) setCachedCounts(ownersPageData.counts);
  }, [ownersPageData?.counts]);
  const counts = ownersPageData?.counts ?? cachedCounts;
  const { data: statusesData } = useOwnerStatuses(company?.id);
  const statuses = useMemo(() => statusesData ?? [], [statusesData]);
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = useMemo(() => employeesData ?? [], [employeesData]);
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannels = useMemo(
    () => marketingChannelsData ?? [],
    [marketingChannelsData],
  );

  const bulkReassignMutation = useBulkReassignOwners();
  const bulkDeleteMutation = useBulkDeleteOwners();

  useEffect(() => {
    setPage(1);
  }, [activeSearch, filterState]);

  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = listTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + paginatedOwners.length, listTotal);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const stats = useMemo(
    () => ({
      total: counts?.total ?? 0,
      assigned: counts?.assigned ?? 0,
      unassigned: counts?.unassigned ?? 0,
      withChannel: counts?.withChannel ?? 0,
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
    if (filterState.employeeId && canViewAll) {
      count += 1;
    }
    return count;
  }, [filterState, canViewAll]);

  const handleBulkReassign = async (targetEmployeeId: string) => {
    if (!company?.id) return;
    setIsReassigning(true);
    try {
      const result = await bulkReassignMutation.mutateAsync({
        ownerIds: selectedOwners,
        targetEmployeeId,
        companyId: company.id,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Owners reassigned successfully."));
      setSelectedOwners([]);
      setIsReassignModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("Error reassigning owners."));
    } finally {
      setIsReassigning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!company?.id) return;
    setIsDeleting(true);
    try {
      const result = await bulkDeleteMutation.mutateAsync({
        ownerIds: selectedOwners,
        companyId: company.id,
      });
      if (result.error) throw new Error(result.error);
      toast.success(
        selectedOwners.length === 1
          ? t("Owner deleted successfully.")
          : t("{{count}} owners deleted successfully.", {
              count: selectedOwners.length,
            }),
      );
      setSelectedOwners([]);
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("Error deleting owners."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveFilter = (key: keyof OwnerFilterState) => {
    setFilterState((prev) => ({ ...prev, [key]: null }));
  };

  const toggleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedOwners(paginatedOwners.map((o) => o.id));
    } else {
      setSelectedOwners([]);
    }
  };

  const openExportDialog = async () => {
    if (!company?.id) return;
    if (selectedOwners.length > 0) {
      setExportRows(
        paginatedOwners.filter((o) => selectedOwners.includes(o.id)),
      );
      setIsExportDialogOpen(true);
      return;
    }
    const { page: _p, pageSize: _ps, includeCounts: _c, ...exportFilters } =
      ownerFilters;
    const result = await getOwners(company.id, exportFilters);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setExportRows(result.data ?? []);
    setIsExportDialogOpen(true);
  };

  const toggleSelectOwner = (id: string) => {
    setSelectedOwners((prev) =>
      prev.includes(id)
        ? prev.filter((ownerId) => ownerId !== id)
        : [...prev, id],
    );
  };

  return (
    <>
      <DocumentHead title={`${t("Owners")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-gradient-to-b from-muted/35 via-background to-background pb-24 sm:pb-8 min-h-[calc(100vh-68px)]">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.09] via-transparent to-primary/[0.03]"
            aria-hidden
          />
          <div
            className="absolute inset-0 pattern-grid-lg opacity-30"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 py-6 sm:py-9 max-w-6xl container">
            <div className="flex lg:flex-row flex-col lg:justify-between lg:items-end gap-5">
              <div className="min-w-0 max-w-2xl text-start">
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-primary/10 hover:bg-primary/10 mb-3 border-primary/15 text-primary"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {t("Owners")}
                </Badge>
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl lg:text-4xl tracking-tight">
                  {t("Property Owners")}
                </h1>
                <p className="mt-2 text-muted-foreground sm:text-[15px] text-sm leading-relaxed">
                  {t("Manage individuals who own your listed properties.")}
                </p>
              </div>

              <div className="hidden sm:flex flex-wrap items-center gap-2 shrink-0">
                {selectedOwners.length > 0 && (
                  <>
                    {canAssign ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsReassignModalOpen(true)}
                        className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl h-10 text-primary"
                      >
                        <Users className="w-4 h-4" />
                        {t("Reassign Selected")}
                        <span className="bg-primary/15 px-1.5 rounded-md tabular-nums text-[11px]">
                          {selectedOwners.length}
                        </span>
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="gap-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-xl h-10 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("Delete Selected")}
                        <span className="bg-destructive/15 px-1.5 rounded-md tabular-nums text-[11px]">
                          {selectedOwners.length}
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
                  onClick={() => router.push("/company/owners/new")}
                  size="sm"
                  className="gap-2 shadow-sm rounded-xl h-10 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t("Add New Owner")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-5 sm:space-y-6 mx-auto px-4 sm:px-6 py-5 sm:py-7 max-w-6xl container">
          <section className="gap-3 grid grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("Total Owners")}
              value={stats.total}
              icon={Users}
            />
            <StatCard
              label={t("Assigned")}
              value={stats.assigned}
              icon={UserCheck}
              tone="emerald"
            />
            <StatCard
              label={t("Unassigned")}
              value={stats.unassigned}
              icon={UserX}
              tone="amber"
            />
            <StatCard
              label={t("With Source")}
              value={stats.withChannel}
              icon={Megaphone}
              tone="sky"
            />
          </section>

          {canViewAll && company?.id ? (
            <DuplicatesReviewPanel companyId={company.id} initialTab="owners" />
          ) : null}

          <section className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
            <div
              className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.05] to-transparent h-16 pointer-events-none"
              aria-hidden
            />

            <div className="relative space-y-3.5 sm:space-y-4 p-3.5 sm:p-5">
              <div className="flex lg:flex-row flex-col lg:items-center gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="top-1/2 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none start-3" />
                  <Input
                    placeholder={t("Search by name or phone...")}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="bg-background ps-9 rounded-xl h-11"
                  />
                </div>

                <div className="flex sm:flex-row flex-col gap-2 w-full lg:w-auto">
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
                      <SelectTrigger className="bg-background rounded-xl w-full lg:w-[210px] h-11">
                        <SelectValue placeholder={t("All Employees")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("All Employees")}
                        </SelectItem>
                        <SelectItem value="unassigned">
                          {t("Unassigned")}
                        </SelectItem>
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
                      "justify-center rounded-xl w-full sm:w-auto h-11",
                      showFilters && "bg-muted/70 border-primary/25",
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    {showFilters ? t("Hide Filters") : t("Filters")}
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex justify-center items-center bg-primary/10 ms-1 px-1.5 rounded-full min-w-[1.25rem] h-5 font-semibold tabular-nums text-[11px] text-primary">
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

          <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-3 px-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={
                    paginatedOwners.length > 0 &&
                    paginatedOwners.every((o) => selectedOwners.includes(o.id))
                      ? true
                      : selectedOwners.length > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={toggleSelectAll}
                  id="select-all-owners"
                />
                <Label
                  htmlFor="select-all-owners"
                  className="font-medium text-sm cursor-pointer"
                >
                  {t("Select All")}
                </Label>
              </div>
              {selectedOwners.length > 0 && (
                <>
                  <SelectionCountBadge
                    count={selectedOwners.length}
                    label={t("Selected")}
                    onClear={() => setSelectedOwners([])}
                    clearLabel={t("Clear selection")}
                  />
                  {canAssign ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsReassignModalOpen(true)}
                      className="sm:hidden gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg h-8 text-primary"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {t("Reassign Selected")}
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="sm:hidden gap-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-lg h-8 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("Delete")}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
            <p className="tabular-nums text-muted-foreground text-xs sm:text-sm">
              {paginatedOwners.length === 0
                ? t("owners_showing_count", { count: 0 })
                : t("Showing {{from}}–{{to}} of {{total}}", {
                    from: pageStart + 1,
                    to: pageEnd,
                    total: listTotal,
                  })}
            </p>
          </div>

          {isLoading ? (
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-card border border-border/60 rounded-2xl overflow-hidden"
                >
                  <Skeleton className="rounded-none w-full h-28" />
                  <div className="space-y-3 p-4 sm:p-5">
                    <Skeleton className="w-2/3 h-5" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedOwners.length === 0 ? (
            <div className="relative bg-card shadow-[var(--shadow-subtle)] px-5 sm:px-6 py-14 sm:py-20 border border-border border-dashed rounded-2xl overflow-hidden text-center">
              <div
                className="top-0 absolute inset-x-0 bg-gradient-to-b from-amber-500/[0.06] to-transparent h-24 pointer-events-none"
                aria-hidden
              />
              <div className="relative">
                <div className="flex justify-center items-center bg-primary/10 mx-auto mb-4 rounded-2xl w-14 h-14">
                  <User className="w-7 h-7 text-primary/70" />
                </div>
                <p className="font-outfit font-semibold text-foreground text-lg">
                  {t("No owners found")}
                </p>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
                  {t("Adjust your filters or add a new owner.")}
                </p>
                <Button
                  onClick={() => router.push("/company/owners/new")}
                  className="mt-6 rounded-xl h-10"
                >
                  <Plus className="w-4 h-4" />
                  {t("Add New Owner")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedOwners.map((owner) => (
                  <OwnerCard
                    key={owner.id}
                    owner={owner}
                    employees={employees}
                    companyId={company?.id}
                    isSelected={selectedOwners.includes(owner.id)}
                    onSelect={toggleSelectOwner}
                    propertyCount={
                      ownersPageData?.propertyCountsByOwnerId?.[owner.id] ?? 0
                    }
                    latestStatus={
                      ownersPageData?.latestStatusByOwnerId
                        ? (ownersPageData.latestStatusByOwnerId[owner.id] ??
                          null)
                        : undefined
                    }
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="flex sm:flex-row flex-col justify-between items-center gap-3 bg-card shadow-[var(--shadow-subtle)] px-3.5 sm:px-4 py-3 border border-border/60 rounded-2xl">
                  <p className="order-2 sm:order-1 tabular-nums text-muted-foreground text-xs sm:text-sm">
                    {t("Showing {{from}}–{{to}} of {{total}}", {
                      from: pageStart + 1,
                      to: pageEnd,
                      total: listTotal,
                    })}
                  </p>
                  <div className="flex items-center gap-1 order-1 sm:order-2">
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

          <EmployeeReassignmentModal
            isOpen={isReassignModalOpen}
            onClose={() => setIsReassignModalOpen(false)}
            selectedOwnerIds={selectedOwners}
            onConfirm={handleBulkReassign}
            isProcessing={isReassigning}
          />

          <DeleteOwnersDialog
            ownerIds={selectedOwners}
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={handleBulkDelete}
            isDeleting={isDeleting}
          />

          {company?.id && canImport ? (
            <ImportOwnersDialog
              isOpen={isImportDialogOpen}
              onClose={() => setIsImportDialogOpen(false)}
              companyId={company.id}
              employees={employees}
              marketingChannels={marketingChannels.map((c) => c.name)}
              language={language}
            />
          ) : null}

          {company?.id && canExport ? (
            <ExportOwnersDialog
              isOpen={isExportDialogOpen}
              onClose={() => setIsExportDialogOpen(false)}
              rows={exportRows}
              selectedCount={selectedOwners.length}
              employees={employees}
              companyId={company.id}
              language={language}
            />
          ) : null}
        </div>

        {/* Mobile sticky CTA */}
        <div className="sm:hidden bottom-0 z-40 fixed inset-x-0 bg-background/95 backdrop-blur-md p-3 border-border/60 border-t safe-area-pb">
          <Button
            onClick={() => router.push("/company/owners/new")}
            className="gap-2 shadow-sm rounded-xl w-full h-11 font-medium"
          >
            <Plus className="w-4 h-4" />
            {t("Add New Owner")}
          </Button>
        </div>
      </main>
    </>
  );
};

export default OwnersPage;
