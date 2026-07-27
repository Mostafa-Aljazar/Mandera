"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import {
  useOwners,
  useOwnerStatuses,
  useMarketingChannels,
  useBulkReassignOwners,
} from "@/hooks/queries/useOwners";
import { useDebounce } from "@/hooks/useDebounce";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { getOwnersExportData } from "@/actions/owners";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import OwnerCard from "@/components/company/owners/OwnerCard";
import FilterPanel from "@/components/common/FilterPanel";
import FilterChips from "@/components/common/FilterChips";
import EmployeeReassignmentModal from "@/components/company/employees/EmployeeReassignmentModal";
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
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateCSV, downloadCSV } from "@/utils/csvExport";

const PAGE_SIZE = 9;

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
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

const OwnersPage = () => {
  const { company, currentUser } = useCompanyAuth();
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
  const [isReassigning, setIsReassigning] = useState(false);
  const [page, setPage] = useState(1);

  const ownerFilters = {
    assignedEmployeeId:
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

  const { data: ownersData, isLoading } = useOwners(company?.id, ownerFilters);
  const owners = ownersData ?? [];
  const { data: statusesData } = useOwnerStatuses(company?.id);
  const statuses = statusesData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannels = marketingChannelsData ?? [];

  const bulkReassignMutation = useBulkReassignOwners();

  const activeSearch =
    debouncedSearch.length >= 3 ? debouncedSearch : "";

  const filteredOwners = useMemo(() => {
    if (!activeSearch) return owners;
    const q = activeSearch.toLowerCase();
    const digits = q.replace(/\D/g, "");
    return owners.filter((o) => {
      const matchesName =
        (o.name || "").toLowerCase().includes(q) ||
        (o.name_en || "").toLowerCase().includes(q) ||
        (o.name_ar || "").includes(activeSearch);
      const matchesPhone =
        digits.length > 0 && o.phone.replace(/\D/g, "").includes(digits);
      return matchesName || matchesPhone;
    });
  }, [owners, activeSearch]);

  useEffect(() => {
    setPage(1);
  }, [activeSearch, filterState]);

  const totalPages = Math.max(1, Math.ceil(filteredOwners.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredOwners.length);
  const paginatedOwners = useMemo(
    () => filteredOwners.slice(pageStart, pageEnd),
    [filteredOwners, pageStart, pageEnd],
  );
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const stats = useMemo(() => {
    const assigned = owners.filter((o) => o.assigned_employee_id).length;
    const withChannel = owners.filter((o) => o.marketing_channel).length;
    return {
      total: owners.length,
      assigned,
      unassigned: owners.length - assigned,
      withChannel,
    };
  }, [owners]);

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

  const handleExportCSV = async () => {
    if (owners.length === 0) {
      toast.info(t("No data to export"));
      return;
    }

    const loadingToast = toast.loading(t("Exporting CSV..."));
    try {
      const result = await getOwnersExportData(company!.id);
      if (result.error) throw new Error(result.error);
      const rows = result.data;

      const headers = [
        "اسم المالك",
        "رقم الهاتف",
        "الموظف المسؤول",
        "قناة التسويق",
        "الحالة",
        "عدد العقارات",
        "تاريخ آخر تحديث للحالة",
        "مؤشر الحالة",
        "تاريخ الإنشاء",
      ];
      const columns = [
        (o: (typeof rows)[number]) => o.name || "",
        (o: (typeof rows)[number]) => o.phone || "",
        (o: (typeof rows)[number]) => o.assigned_employee_name || "غير مسند",
        (o: (typeof rows)[number]) => o.marketing_channel || "",
        (o: (typeof rows)[number]) => o.status_name || "لا يوجد",
        (o: (typeof rows)[number]) => o.properties_count || 0,
        (o: (typeof rows)[number]) =>
          o.last_status_date
            ? format(new Date(o.last_status_date), "dd/MM/yyyy")
            : "لا يوجد",
        (o: (typeof rows)[number]) => {
          if (!o.last_status_date) return "محدث";
          const daysDiff =
            (new Date().getTime() - new Date(o.last_status_date).getTime()) /
            (1000 * 60 * 60 * 24);
          return daysDiff > 30 ? "قديم" : "محدث";
        },
        (o: (typeof rows)[number]) =>
          o.created_at ? format(new Date(o.created_at), "dd/MM/yyyy") : "",
      ];

      const csvString = generateCSV(rows, columns, headers);
      downloadCSV(csvString, `owners_${format(new Date(), "yyyy-MM-dd")}.csv`);
      toast.success(t("Exported successfully"), { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error(t("Export error"), { id: loadingToast });
    }
  };

  const handleBulkReassign = async (targetEmployeeId: string) => {
    setIsReassigning(true);
    try {
      const result = await bulkReassignMutation.mutateAsync({
        ownerIds: selectedOwners,
        targetEmployeeId,
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

  const toggleSelectOwner = (id: string) => {
    setSelectedOwners((prev) =>
      prev.includes(id) ? prev.filter((ownerId) => ownerId !== id) : [...prev, id],
    );
  };

  return (
    <>
      <DocumentHead title={`${t("Owners")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-gradient-to-b from-muted/35 via-background to-background min-h-[calc(100vh-68px)] pb-24 sm:pb-8">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.09] via-transparent to-primary/[0.03]"
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
                  <Building2 className="w-3.5 h-3.5" />
                  {t("Owners")}
                </Badge>
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl lg:text-4xl tracking-tight">
                  {t("Property Owners")}
                </h1>
                <p className="mt-2 text-muted-foreground text-sm sm:text-[15px] leading-relaxed">
                  {t("Manage individuals who own your listed properties.")}
                </p>
              </div>

              <div className="hidden sm:flex flex-wrap items-center gap-2 shrink-0">
                {selectedOwners.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsReassignModalOpen(true)}
                    className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl h-10"
                  >
                    <Users className="w-4 h-4" />
                    {t("Reassign Selected")}
                    <span className="bg-primary/15 px-1.5 rounded-md tabular-nums text-[11px]">
                      {selectedOwners.length}
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
                  onClick={() => router.push("/company/owners/new")}
                  size="sm"
                  className="gap-2 rounded-xl h-10 font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t("Add New Owner")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 sm:space-y-6 container max-w-6xl">
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
                            {employeeDisplayName(emp, language, emp.name) ||
                              emp.id}
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={
                    paginatedOwners.length > 0 &&
                    paginatedOwners.every((o) => selectedOwners.includes(o.id))
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
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/15"
                  >
                    {t("Selected")} {selectedOwners.length}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsReassignModalOpen(true)}
                    className="sm:hidden gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg h-8"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {t("Reassign Selected")}
                  </Button>
                </>
              )}
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm tabular-nums">
              {filteredOwners.length === 0
                ? t("owners_showing_count", { count: 0 })
                : t("Showing {{from}}–{{to}} of {{total}}", {
                    from: pageStart + 1,
                    to: pageEnd,
                    total: filteredOwners.length,
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
                  <Skeleton className="h-28 w-full rounded-none" />
                  <div className="space-y-3 p-4 sm:p-5">
                    <Skeleton className="w-2/3 h-5" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOwners.length === 0 ? (
            <div className="relative bg-card shadow-[var(--shadow-subtle)] px-5 sm:px-6 py-14 sm:py-20 border border-border border-dashed rounded-2xl text-center overflow-hidden">
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
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card shadow-[var(--shadow-subtle)] px-3.5 sm:px-4 py-3 border border-border/60 rounded-2xl">
                  <p className="order-2 sm:order-1 text-muted-foreground text-xs sm:text-sm tabular-nums">
                    {t("Showing {{from}}–{{to}} of {{total}}", {
                      from: pageStart + 1,
                      to: pageEnd,
                      total: filteredOwners.length,
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
                          variant={
                            item === currentPage ? "default" : "outline"
                          }
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
        </div>

        {/* Mobile sticky CTA */}
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md p-3 safe-area-pb">
          <Button
            onClick={() => router.push("/company/owners/new")}
            className="gap-2 rounded-xl w-full h-11 font-medium shadow-sm"
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
