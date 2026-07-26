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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, User, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CompanyEmployeeWithDetails } from "@/types/supabase-entities.types";

interface DeletionTarget {
  id: string;
  name: string;
  email: string;
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

const EmployeeListPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "employee">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">(
    "all",
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    employee: DeletionTarget | null;
  }>({ open: false, employee: null });

  const isSuperAdmin = currentUser?.role === "company_super_admin";

  const {
    data: employeesData,
    isLoading,
    refetch,
  } = useCompanyEmployees(isSuperAdmin ? company?.id : undefined);
  const employees = employeesData ?? [];
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
      const name = (emp.name || "").toLowerCase();
      const email = (emp.email || emp.employee?.email || "").toLowerCase();
      const phone = (emp.employee?.phone || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [employees, searchQuery, roleFilter, statusFilter]);

  const seatCount = employees.length;
  const seatLimit = company?.max_employee_count ?? 0;
  const atLimit = seatCount >= seatLimit;

  const handleToggleDisable = async (emp: CompanyEmployeeWithDetails) => {
    if (!emp.employee_id || !emp.employee) return;
    try {
      const result = await updateDisabledMutation.mutateAsync({
        employeeId: emp.employee_id,
        disabled: !emp.employee.disabled,
      });
      if (result.error) throw new Error(result.error);
      toast.success(
        emp.employee.disabled ? t("Employee enabled") : t("Employee disabled"),
      );
    } catch (error) {
      console.error("Error toggling employee status:", error);
      toast.error(t("Failed to update employee status"));
    }
  };

  const initiateDelete = (emp: CompanyEmployeeWithDetails) => {
    setDeleteDialog({
      open: true,
      employee: {
        id: emp.id,
        name: emp.name || "",
        email: emp.email || emp.employee?.email || "",
        employeeId: emp.employee_id,
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
                  {t("Employees")}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("Manage your team members and company admins.")}
                </p>
                <p className="mt-2 font-medium text-muted-foreground text-xs tabular-nums">
                  {seatCount} / {seatLimit} {t("seats used")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                <Button
                  onClick={() => router.push("/company/employees/new")}
                  size="sm"
                  className="rounded-lg h-9 font-medium"
                  disabled={atLimit}
                >
                  <Plus className="w-4 h-4" />
                  {t("Add employee")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 container max-w-6xl">
          <section className="gap-3 sm:gap-4 grid grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("Total Employees")} value={stats.total} />
            <StatCard label={t("Admins")} value={stats.admins} tone="sky" />
            <StatCard label={t("Active")} value={stats.active} tone="emerald" />
            <StatCard
              label={t("Disabled")}
              value={stats.disabled}
              tone="amber"
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
                  placeholder={t("Search by name, email, or phone...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background ps-9 h-10"
                />
              </div>

              <div className="flex sm:flex-row flex-col gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={(val) =>
                    setRoleFilter(val as "all" | "admin" | "employee")
                  }
                >
                  <SelectTrigger className="bg-background w-full sm:w-[160px] h-10">
                    <SelectValue placeholder={t("All Roles")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Roles")}</SelectItem>
                    <SelectItem value="admin">{t("Admin")}</SelectItem>
                    <SelectItem value="employee">{t("Employee")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(val) =>
                    setStatusFilter(val as "all" | "active" | "disabled")
                  }
                >
                  <SelectTrigger className="bg-background w-full sm:w-[160px] h-10">
                    <SelectValue placeholder={t("All Statuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Statuses")}</SelectItem>
                    <SelectItem value="active">{t("Active")}</SelectItem>
                    <SelectItem value="disabled">{t("Disabled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <div className="flex sm:flex-row flex-col justify-between items-center gap-4 bg-card shadow-[var(--shadow-subtle)] p-3.5 border border-border/60 rounded-xl">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4 text-primary/70" />
              <span>
                {t("employees_showing_count", {
                  count: filteredEmployees.length,
                })}
              </span>
            </div>
          </div>

          {isLoading ? (
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
          ) : filteredEmployees.length === 0 ? (
            <div className="relative bg-card shadow-[var(--shadow-subtle)] px-6 py-16 sm:py-20 border border-border border-dashed rounded-2xl text-center overflow-hidden">
              <div
                className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.05] to-transparent h-24 pointer-events-none"
                aria-hidden
              />
              <div className="relative">
                <User className="opacity-30 mx-auto mb-4 w-12 h-12 text-primary" />
                <p className="font-outfit font-semibold text-foreground text-lg">
                  {t("No employees found")}
                </p>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
                  {t("Adjust your filters or add a new employee.")}
                </p>
                <Button
                  onClick={() => router.push("/company/employees/new")}
                  className="mt-6 rounded-lg h-9"
                  disabled={atLimit}
                >
                  <Plus className="w-4 h-4" />
                  {t("Add employee")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredEmployees.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  isCurrentUser={emp.id === currentUser?.id}
                  onToggleDisable={handleToggleDisable}
                  onDelete={initiateDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>

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
