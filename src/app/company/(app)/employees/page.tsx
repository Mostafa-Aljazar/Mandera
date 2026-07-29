"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useCompanyEmployees,
  useUpdateEmployeeDisabled,
} from "@/hooks/queries/useEmployees";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import EmployeeCard from "@/components/company/employees/EmployeeCard";
import EmployeeDeletionDialog from "@/components/company/employees/EmployeeDeletionDialog";
import EmployeeStatusDialog from "@/components/company/employees/EmployeeStatusDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Search,
  Shield,
  UserCheck,
  UserX,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CompanyEmployeeWithDetails } from "@/types/supabase-entities.types";

const PAGE_SIZE = 9;

interface DeletionTarget {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  avatarUrl?: string | null;
}

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

const EmployeeListPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "employee">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "disabled"
  >("all");
  const [page, setPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    employee: DeletionTarget | null;
  }>({ open: false, employee: null });
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    employee: CompanyEmployeeWithDetails | null;
  }>({ open: false, employee: null });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isSuperAdmin = currentUser?.role === "company_super_admin";

  const {
    data: employeesData,
    isLoading,
    refetch,
  } = useCompanyEmployees(isSuperAdmin ? company?.id : undefined);
  const employees = useMemo(() => employeesData ?? [], [employeesData]);
  const updateDisabledMutation = useUpdateEmployeeDisabled();

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace("/company/dashboard");
    }
  }, [isSuperAdmin, router]);

  const stats = useMemo(() => {
    const total = employees.length;
    const admins = employees.filter(
      (e) => e.role === "company_super_admin",
    ).length;
    const active = employees.filter((e) => !e.employee?.disabled).length;
    const disabled = employees.filter((e) => e.employee?.disabled).length;
    return { total, admins, active, disabled };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      if (roleFilter === "admin" && emp.role !== "company_super_admin") {
        return false;
      }
      if (roleFilter === "employee" && emp.role !== "company_employee") {
        return false;
      }
      if (statusFilter === "active" && emp.employee?.disabled) return false;
      if (statusFilter === "disabled" && !emp.employee?.disabled) return false;

      if (!q) return true;
      const name = (
        employeeDisplayName(emp.employee, language, emp.name) ||
        emp.name ||
        ""
      ).toLowerCase();
      const email = (emp.email || emp.employee?.email || "").toLowerCase();
      const phone = (emp.employee?.phone || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [employees, searchQuery, roleFilter, statusFilter, language]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredEmployees.length);
  const paginatedEmployees = useMemo(
    () => filteredEmployees.slice(pageStart, pageEnd),
    [filteredEmployees, pageStart, pageEnd],
  );
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const seatCount = employees.length;
  const seatLimit = company?.max_employee_count ?? 0;
  const atLimit = seatCount >= seatLimit;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (roleFilter !== "all") count += 1;
    if (statusFilter !== "all") count += 1;
    return count;
  }, [roleFilter, statusFilter]);

  const handleToggleDisable = async () => {
    const emp = statusDialog.employee;
    if (!emp?.employee_id || !emp.employee) return;
    if (emp.role === "company_super_admin") {
      toast.error(t("Company managers cannot be disabled."));
      setStatusDialog({ open: false, employee: null });
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const result = await updateDisabledMutation.mutateAsync({
        employeeId: emp.employee_id,
        disabled: !emp.employee.disabled,
      });
      if (result.error) throw new Error(result.error);
      toast.success(
        emp.employee.disabled ? t("Employee enabled") : t("Employee disabled"),
      );
      setStatusDialog({ open: false, employee: null });
    } catch (error) {
      console.error("Error toggling employee status:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("Failed to update employee status");
      toast.error(
        message === "Company managers cannot be disabled."
          ? t("Company managers cannot be disabled.")
          : t("Failed to update employee status"),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const initiateDelete = (emp: CompanyEmployeeWithDetails) => {
    setDeleteDialog({
      open: true,
      employee: {
        id: emp.id,
        name:
          employeeDisplayName(emp.employee, language, emp.name) ||
          emp.name ||
          "",
        email: emp.email || emp.employee?.email || "",
        employeeId: emp.employee_id,
        avatarUrl: emp.employee?.avatar_url || null,
      },
    });
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <>
      <DocumentHead
        title={`${t("Employees")} | MANDERA CRM`}
        description="View and manage company employees"
      />
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
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 hover:bg-primary/10 border-primary/15 text-primary gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {t("Employees")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-background/70 border-border/60 text-muted-foreground font-medium tabular-nums"
                  >
                    <span dir="ltr">
                      {seatCount} / {seatLimit}
                    </span>
                    <span className="ms-1">{t("seats used")}</span>
                  </Badge>
                </div>
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl lg:text-4xl tracking-tight">
                  {t("Team Members")}
                </h1>
                <p className="mt-2 text-muted-foreground text-sm sm:text-[15px] leading-relaxed">
                  {t("Manage your team members and company admins.")}
                </p>
              </div>

              <div className="hidden sm:flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  onClick={() => router.push("/company/employees/new")}
                  size="sm"
                  className="gap-2 rounded-xl h-10 font-medium shadow-sm"
                  disabled={atLimit}
                >
                  <Plus className="w-4 h-4" />
                  {t("Add employee")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 sm:space-y-6 container max-w-6xl">
          <section className="gap-3 grid grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("Total Employees")}
              value={stats.total}
              icon={Users}
            />
            <StatCard
              label={t("Admins")}
              value={stats.admins}
              icon={Shield}
              tone="sky"
            />
            <StatCard
              label={t("Active")}
              value={stats.active}
              icon={UserCheck}
              tone="emerald"
            />
            <StatCard
              label={t("Disabled")}
              value={stats.disabled}
              icon={UserX}
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
                    placeholder={t("Search by name, email, or phone...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background ps-9 h-11 rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
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
                </div>
              </div>

              {(showFilters || activeFilterCount > 0) && (
                <div className="space-y-3 pt-3.5 border-border/60 border-t">
                  {showFilters ? (
                    <div className="slide-in-from-top-4 animate-in duration-300 fade-in gap-3 grid grid-cols-1 sm:grid-cols-2">
                      <Select
                        value={roleFilter}
                        onValueChange={(val) =>
                          setRoleFilter(val as "all" | "admin" | "employee")
                        }
                      >
                        <SelectTrigger className="bg-background h-11 rounded-xl">
                          <SelectValue placeholder={t("All Roles")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("All Roles")}</SelectItem>
                          <SelectItem value="admin">{t("Admin")}</SelectItem>
                          <SelectItem value="employee">
                            {t("Employee")}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={statusFilter}
                        onValueChange={(val) =>
                          setStatusFilter(val as "all" | "active" | "disabled")
                        }
                      >
                        <SelectTrigger className="bg-background h-11 rounded-xl">
                          <SelectValue placeholder={t("All Statuses")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("All Statuses")}</SelectItem>
                          <SelectItem value="active">{t("Active")}</SelectItem>
                          <SelectItem value="disabled">
                            {t("Disabled")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {activeFilterCount > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {roleFilter !== "all" ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-primary/10 hover:bg-primary/15 border-primary/15 text-primary pe-1"
                        >
                          {roleFilter === "admin" ? t("Admin") : t("Employee")}
                          <button
                            type="button"
                            className="inline-flex justify-center items-center rounded-full hover:bg-primary/20 w-4 h-4"
                            onClick={() => setRoleFilter("all")}
                            aria-label={t("Clear")}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ) : null}
                      {statusFilter !== "all" ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-primary/10 hover:bg-primary/15 border-primary/15 text-primary pe-1"
                        >
                          {statusFilter === "active"
                            ? t("Active")
                            : t("Disabled")}
                          <button
                            type="button"
                            className="inline-flex justify-center items-center rounded-full hover:bg-primary/20 w-4 h-4"
                            onClick={() => setStatusFilter("all")}
                            aria-label={t("Clear")}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <div className="flex items-center gap-3 px-1">
            <p className="ms-auto text-muted-foreground text-xs sm:text-sm tabular-nums">
              {filteredEmployees.length === 0
                ? t("employees_showing_count", { count: 0 })
                : t("Showing {{from}}–{{to}} of {{total}}", {
                    from: pageStart + 1,
                    to: pageEnd,
                    total: filteredEmployees.length,
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
          ) : filteredEmployees.length === 0 ? (
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
                  {t("No employees found")}
                </p>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
                  {t("Adjust your filters or add a new employee.")}
                </p>
                <Button
                  onClick={() => router.push("/company/employees/new")}
                  className="mt-6 rounded-xl h-10"
                  disabled={atLimit}
                >
                  <Plus className="w-4 h-4" />
                  {t("Add employee")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedEmployees.map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    employee={emp}
                    isCurrentUser={emp.id === currentUser?.id}
                    onToggleDisable={(employee) =>
                      setStatusDialog({ open: true, employee })
                    }
                    onDelete={initiateDelete}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-card shadow-[var(--shadow-subtle)] px-3.5 sm:px-4 py-3 border border-border/60 rounded-2xl">
                  <p className="order-2 sm:order-1 ltr:me-auto rtl:ms-auto text-muted-foreground text-xs sm:text-sm tabular-nums">
                    {t("Showing {{from}}–{{to}} of {{total}}", {
                      from: pageStart + 1,
                      to: pageEnd,
                      total: filteredEmployees.length,
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
        </div>

        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md p-3 safe-area-pb">
          <Button
            onClick={() => router.push("/company/employees/new")}
            className="gap-2 rounded-xl w-full h-11 font-medium shadow-sm"
            disabled={atLimit}
          >
            <Plus className="w-4 h-4" />
            {t("Add employee")}
          </Button>
        </div>
      </main>

      <EmployeeStatusDialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!isUpdatingStatus) {
            setStatusDialog({
              open,
              employee: open ? statusDialog.employee : null,
            });
          }
        }}
        employeeName={
          employeeDisplayName(
            statusDialog.employee?.employee,
            language,
            statusDialog.employee?.name,
          ) ||
          statusDialog.employee?.name ||
          t("Unnamed")
        }
        employeeEmail={
          statusDialog.employee?.email ||
          statusDialog.employee?.employee?.email ||
          ""
        }
        avatarUrl={statusDialog.employee?.employee?.avatar_url}
        isDisabled={Boolean(statusDialog.employee?.employee?.disabled)}
        isSubmitting={isUpdatingStatus}
        onConfirm={() => void handleToggleDisable()}
      />

      <EmployeeDeletionDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, employee: null })}
        employeeToDelete={deleteDialog.employee}
        onSuccess={() => refetch()}
        companyId={company?.id}
      />
    </>
  );
};

export default EmployeeListPage;
