"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useOwners,
  useOwnerStatuses,
  useMarketingChannels,
  useBulkReassignOwners,
} from "@/hooks/queries/useOwners";
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
  Filter,
  Download,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateCSV, downloadCSV } from "@/utils/csvExport";

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
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "sky" | "emerald" | "amber";
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
            "mt-1.5 font-outfit font-bold text-xl sm:text-3xl tracking-tight tabular-nums",
            styles.value,
          )}
          dir="ltr"
        >
          {value}
        </p>
      </div>
    </div>
  );
}

const OwnersPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredOwners = useMemo(() => {
    if (!searchQuery.trim()) return owners;
    const q = searchQuery.toLowerCase();
    const digits = q.replace(/\D/g, "");
    return owners.filter((o) => {
      const matchesName = o.name.toLowerCase().includes(q);
      const matchesPhone =
        digits.length > 0 && o.phone.replace(/\D/g, "").includes(digits);
      return matchesName || matchesPhone;
    });
  }, [owners, searchQuery]);

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
      setSelectedOwners(filteredOwners.map((o) => o.id));
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

      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent"
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
                  {t("Property Owners")}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("Manage individuals who own your listed properties.")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                {selectedOwners.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsReassignModalOpen(true)}
                    className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg h-9"
                  >
                    <Users className="w-4 h-4" />
                    {t("Reassign Selected")} ({selectedOwners.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="gap-2 rounded-lg h-9"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("Export")}</span>
                </Button>
                <Button
                  onClick={() => router.push("/company/owners/new")}
                  size="sm"
                  className="rounded-lg h-9 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t("Add New Owner")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 container max-w-6xl">
          <section className="gap-3 sm:gap-4 grid grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("Total Owners")} value={stats.total} />
            <StatCard
              label={t("Assigned")}
              value={stats.assigned}
              tone="emerald"
            />
            <StatCard
              label={t("Unassigned")}
              value={stats.unassigned}
              tone="amber"
            />
            <StatCard
              label={t("With Source")}
              value={stats.withChannel}
              tone="sky"
            />
          </section>

          <section className="relative bg-card shadow-[var(--shadow-subtle)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden">
            <div
              className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.04] to-transparent h-16 pointer-events-none"
              aria-hidden
            />

            <div className="relative flex lg:flex-row flex-col lg:justify-between lg:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="top-1/2 start-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder={t("Search by name or phone...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background ps-9 h-10"
                />
              </div>

              <div className="flex sm:flex-row flex-col gap-2">
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
                    <SelectTrigger className="bg-background w-full sm:w-[200px] h-10">
                      <SelectValue placeholder={t("All Employees")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("All Employees")}</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name || emp.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "rounded-lg h-10",
                    showFilters && "bg-muted/70 border-primary/20",
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {showFilters ? t("Hide Filters") : t("Filters")}
                  {activeFilterCount > 0 ? (
                    <span className="inline-flex justify-center items-center bg-primary/10 ms-1.5 px-1.5 rounded-full min-w-[1.25rem] h-5 font-semibold text-primary text-[11px] tabular-nums">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>

            {(showFilters || activeFilterCount > 0) && (
              <div className="relative space-y-3 mt-4 pt-4 border-border/60 border-t">
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
          </section>

          <div className="flex sm:flex-row flex-col justify-between items-center gap-4 bg-card shadow-[var(--shadow-subtle)] p-3.5 border border-border/60 rounded-xl">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={
                  filteredOwners.length > 0 &&
                  selectedOwners.length === filteredOwners.length
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
              {selectedOwners.length > 0 && (
                <span className="bg-primary/10 px-3 py-1 rounded-full font-medium text-primary text-xs">
                  {t("Selected")} {selectedOwners.length}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {t("owners_showing_count", { count: filteredOwners.length })}
            </p>
          </div>

          {isLoading ? (
            <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 8 }).map((_, index) => (
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
          ) : filteredOwners.length === 0 ? (
            <div className="relative bg-card shadow-[var(--shadow-subtle)] px-6 py-16 sm:py-20 border border-border border-dashed rounded-2xl text-center overflow-hidden">
              <div
                className="top-0 absolute inset-x-0 bg-gradient-to-b from-amber-500/[0.05] to-transparent h-24 pointer-events-none"
                aria-hidden
              />
              <div className="relative">
                <User className="opacity-30 mx-auto mb-4 w-12 h-12 text-primary" />
                <p className="font-outfit font-semibold text-foreground text-lg">
                  {t("No owners found")}
                </p>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
                  {t("Adjust your filters or add a new owner.")}
                </p>
                <Button
                  onClick={() => router.push("/company/owners/new")}
                  className="mt-6 rounded-lg h-9"
                >
                  <Plus className="w-4 h-4" />
                  {t("Add New Owner")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredOwners.map((owner) => (
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
          )}

          <EmployeeReassignmentModal
            isOpen={isReassignModalOpen}
            onClose={() => setIsReassignModalOpen(false)}
            selectedOwnerIds={selectedOwners}
            onConfirm={handleBulkReassign}
            isProcessing={isReassigning}
          />
        </div>
      </main>
    </>
  );
};

export default OwnersPage;
