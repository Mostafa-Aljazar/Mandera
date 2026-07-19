"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DocumentHead from "@/components/DocumentHead";
import MasterAdminHeader from "@/components/MasterAdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCompanies,
  useToggleCompanyFreeze,
  useDeleteCompanyCascade,
} from "@/hooks/queries/useCompanies";
import { useEmployeeCount } from "@/hooks/useEmployeeCount";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Company } from "@/types/supabase-entities.types";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Lock,
  Unlock,
  Loader2,
  Search,
  Mail,
  Users,
  Snowflake,
  CheckCircle2,
  LayoutGrid,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

type StatusFilter = "all" | "active" | "frozen";

const PAGE_SIZE = 10;

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

const toneStyles = {
  primary: {
    value: "text-foreground",
    glow: "from-primary/10",
  },
  emerald: {
    value: "text-emerald-700",
    glow: "from-emerald-500/10",
  },
  rose: {
    value: "text-rose-700",
    glow: "from-rose-500/10",
  },
} as const;

function StatCard({
  label,
  value,
  loading,
  tone = "primary",
}: {
  label: string;
  value: number;
  loading?: boolean;
  tone?: keyof typeof toneStyles;
}) {
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
        >
          {loading ? "—" : value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ frozen }: { frozen: boolean }) {
  const { t } = useTranslation();

  return frozen ? (
    <span className="inline-flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 border border-rose-500/20 rounded-full font-medium text-rose-600 text-xs">
      <Snowflake className="w-3 h-3" />
      {t("Frozen")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20 rounded-full font-medium text-emerald-600 text-xs">
      <CheckCircle2 className="w-3 h-3" />
      {t("Active")}
    </span>
  );
}

function CompanyRow({
  company,
  onDelete,
  onToggleFreeze,
}: {
  company: Company;
  onDelete: (company: Company) => void;
  onToggleFreeze: (company: Company) => void;
}) {
  const { t } = useTranslation();
  const { count: employeeCount } = useEmployeeCount(company.id);

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="min-w-[200px]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex justify-center items-center bg-primary/10 border border-primary/15 rounded-xl w-10 h-10 text-primary shrink-0">
            <Building2 className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {company.company_name || company.company_code}
            </p>
            <p className="font-mono text-muted-foreground text-xs truncate" dir="ltr">
              {company.company_code}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm"
          dir="ltr"
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[16rem]">{company.email}</span>
        </span>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="tabular-nums" dir="ltr">
            {employeeCount}
            <span className="font-normal text-muted-foreground text-xs">
              {" "}
              / {company.max_employee_count}
            </span>
          </span>
        </span>
      </TableCell>
      <TableCell>
        <StatusBadge frozen={!!company.is_frozen} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        <span dir="ltr">
          {new Date(company.created_at).toLocaleDateString()}
        </span>
      </TableCell>
      <TableCell className="w-[1%] whitespace-nowrap">
        <div className="flex justify-end items-center gap-0.5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-lg w-8 h-8 text-muted-foreground hover:text-primary"
          >
            <Link href={`/master/dashboard/companies/${company.id}`}>
              <Pencil className="w-4 h-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-lg w-8 h-8",
              company.is_frozen
                ? "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                : "text-amber-600 hover:bg-amber-500/10 hover:text-amber-700",
            )}
            onClick={() => onToggleFreeze(company)}
            title={company.is_frozen ? t("Unfreeze") : t("Freeze")}
          >
            {company.is_frozen ? (
              <Unlock className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg w-8 h-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(company)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CompanyMobileCard({
  company,
  onDelete,
  onToggleFreeze,
}: {
  company: Company;
  onDelete: (company: Company) => void;
  onToggleFreeze: (company: Company) => void;
}) {
  const { t } = useTranslation();
  const { count: employeeCount } = useEmployeeCount(company.id);

  return (
    <div className="bg-card shadow-[var(--shadow-subtle)] p-4 border border-border/60 rounded-2xl">
      <div className="flex items-start gap-3 mb-3">
        <span className="flex justify-center items-center bg-primary/10 border border-primary/15 rounded-xl w-11 h-11 text-primary shrink-0">
          <Building2 className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">
            {company.company_name || company.company_code}
          </p>
          <p className="mt-0.5 text-muted-foreground text-xs truncate">
            {company.email}
          </p>
        </div>
        <StatusBadge frozen={!!company.is_frozen} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-muted-foreground text-xs">
        <span className="inline-flex items-center gap-1 font-mono">
          {company.company_code}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span dir="ltr" className="tabular-nums">
            {employeeCount}/{company.max_employee_count}
          </span>
        </span>
        <span>{new Date(company.created_at).toLocaleDateString()}</span>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1 rounded-lg h-9">
          <Link href={`/master/dashboard/companies/${company.id}`}>
            <Pencil className="w-3.5 h-3.5" />
            {t("Edit")}
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-9"
          onClick={() => onToggleFreeze(company)}
        >
          {company.is_frozen ? (
            <Unlock className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-destructive/10 border-destructive/20 rounded-lg h-9 text-destructive hover:text-destructive"
          onClick={() => onDelete(company)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function CompanyListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    company: Company | null;
  }>({ open: false, company: null });
  const [freezeDialog, setFreezeDialog] = useState<{
    open: boolean;
    company: Company | null;
  }>({ open: false, company: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  const { data: companiesData, isLoading: loading } = useCompanies();
  const companies = companiesData ?? [];
  const toggleFreezeMutation = useToggleCompanyFreeze();
  const deleteCascadeMutation = useDeleteCompanyCascade();

  const stats = useMemo(() => {
    const frozen = companies.filter((c) => c.is_frozen).length;
    return {
      total: companies.length,
      active: companies.length - frozen,
      frozen,
    };
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((company) => {
      if (statusFilter === "active" && company.is_frozen) return false;
      if (statusFilter === "frozen" && !company.is_frozen) return false;
      if (!q) return true;
      return (
        company.company_name?.toLowerCase().includes(q) ||
        company.company_code?.toLowerCase().includes(q) ||
        company.email?.toLowerCase().includes(q)
      );
    });
  }, [companies, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filteredCompanies.length);

  const paginatedCompanies = useMemo(
    () => filteredCompanies.slice(pageStart, pageEnd),
    [filteredCompanies, pageStart, pageEnd],
  );

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  async function handleDeleteConfirm() {
    if (!deleteDialog.company) return;
    setIsDeleting(true);

    try {
      const result = await deleteCascadeMutation.mutateAsync(
        deleteDialog.company.id,
      );
      if (result.error) throw new Error(result.error);
      toast.success(t("Company deleted successfully"));
      setDeleteDialog({ open: false, company: null });
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error(t("Failed to delete company. Try again."), {
        action: {
          label: t("Retry"),
          onClick: handleDeleteConfirm,
        },
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleFreezeConfirm() {
    if (!freezeDialog.company) return;
    setIsFreezing(true);

    const isCurrentlyFrozen = freezeDialog.company.is_frozen;

    try {
      const result = await toggleFreezeMutation.mutateAsync({
        id: freezeDialog.company.id,
        isFrozen: !isCurrentlyFrozen,
      });
      if (result.error) throw new Error(result.error);

      toast.success(
        isCurrentlyFrozen
          ? t("Company unfreezed successfully")
          : t("Company freezed successfully"),
      );

      setFreezeDialog({ open: false, company: null });
    } catch (error) {
      console.error("Error toggling freeze state:", error);
      toast.error(t("Operation failed"));
    } finally {
      setIsFreezing(false);
    }
  }

  const filters: {
    id: StatusFilter;
    label: string;
    count: number;
    icon: LucideIcon;
  }[] = [
    { id: "all", label: t("All"), count: stats.total, icon: LayoutGrid },
    { id: "active", label: t("Active"), count: stats.active, icon: CheckCircle2 },
    { id: "frozen", label: t("Frozen"), count: stats.frozen, icon: Snowflake },
  ];

  return (
    <>
      <DocumentHead title={`${t("Manage Companies")} | MANDERA CRM`} />
      <MasterAdminHeader />

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
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl md:text-4xl tracking-tight">
                  {t("Companies")}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("Manage all registered companies")}
                </p>
              </div>

              <Button
                asChild
                size="sm"
                className="rounded-lg h-9 font-medium shrink-0"
              >
                <Link href="/master/dashboard/companies/new">
                  <Plus className="w-4 h-4" />
                  {t("Add company")}
                </Link>
              </Button>
            </div>

            <div className="gap-3 grid grid-cols-3 mt-6 sm:mt-8">
              <StatCard
                label={t("Total companies")}
                value={stats.total}
                loading={loading}
                tone="primary"
              />
              <StatCard
                label={t("Active")}
                value={stats.active}
                loading={loading}
                tone="emerald"
              />
              <StatCard
                label={t("Frozen")}
                value={stats.frozen}
                loading={loading}
                tone="rose"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl">
          <div className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
            <div className="flex md:flex-row flex-col md:items-center gap-3 p-4 sm:p-5 border-border/60 border-b">
              <div className="relative flex-1">
                <Search className="top-1/2 absolute start-3 w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Search companies...")}
                  className="bg-background ps-9 border-border/60 focus-visible:ring-primary/30 rounded-xl h-11"
                />
              </div>

              <div className="flex gap-1 bg-muted/50 p-1 border border-border/60 rounded-full w-full md:w-auto overflow-x-auto">
                {filters.map((filter) => {
                  const Icon = filter.icon;
                  const active = statusFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-2 rounded-full font-medium text-xs sm:text-sm whitespace-nowrap transition-colors",
                        active
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5",
                          active && filter.id === "active" && "text-emerald-600",
                          active && filter.id === "frozen" && "text-rose-500",
                          active && filter.id === "all" && "text-primary",
                        )}
                      />
                      {filter.label}
                      <span
                        className={cn(
                          "inline-flex justify-center items-center min-w-5 px-1.5 rounded-full text-[11px] tabular-nums",
                          active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted-foreground/10 text-muted-foreground",
                        )}
                      >
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-muted/50 border border-border/50 rounded-xl h-16 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="bg-muted/20 py-14 sm:py-16 border border-border border-dashed rounded-xl text-center">
                  <span className="inline-flex justify-center items-center bg-primary/10 mx-auto mb-4 border border-primary/15 rounded-2xl w-14 h-14 text-primary">
                    <Building2 className="w-7 h-7" />
                  </span>
                  <p className="mb-1 font-medium text-foreground">
                    {companies.length === 0
                      ? t("No companies found")
                      : t("No matching companies")}
                  </p>
                  <p className="mb-5 text-muted-foreground text-sm">
                    {companies.length === 0
                      ? t("Manage all registered companies")
                      : t("Try another search or filter")}
                  </p>
                  {companies.length === 0 ? (
                    <Button
                      asChild
                      className="shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)] rounded-xl h-11 font-semibold"
                    >
                      <Link href="/master/dashboard/companies/new">
                        <Plus className="w-4 h-4" />
                        {t("Add your first company")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="hidden md:block border border-border/60 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="min-w-[200px]">
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 opacity-70" />
                              {t("Company Name")}
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 opacity-70" />
                              {t("Email")}
                            </span>
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 opacity-70" />
                              {t("Employee Count")}
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 opacity-70" />
                              {t("Status")}
                            </span>
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 opacity-70" />
                              {t("Created Date")}
                            </span>
                          </TableHead>
                          <TableHead className="w-[1%] text-end whitespace-nowrap">
                            {t("Actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCompanies.map((company) => (
                          <CompanyRow
                            key={company.id}
                            company={company}
                            onDelete={(c) =>
                              setDeleteDialog({ open: true, company: c })
                            }
                            onToggleFreeze={(c) =>
                              setFreezeDialog({ open: true, company: c })
                            }
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {paginatedCompanies.map((company) => (
                      <CompanyMobileCard
                        key={company.id}
                        company={company}
                        onDelete={(c) =>
                          setDeleteDialog({ open: true, company: c })
                        }
                        onToggleFreeze={(c) =>
                          setFreezeDialog({ open: true, company: c })
                        }
                      />
                    ))}
                  </div>

                  {filteredCompanies.length > 0 ? (
                    <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3 mt-4 pt-4 border-border/60 border-t">
                      <p className="text-muted-foreground text-sm tabular-nums">
                        {t("Showing {{from}}–{{to}} of {{total}}", {
                          from: pageStart + 1,
                          to: pageEnd,
                          total: filteredCompanies.length,
                        })}
                      </p>

                      {totalPages > 1 ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-lg w-8 h-8"
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
                                className="rounded-lg w-8 h-8 tabular-nums"
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
                            className="rounded-lg w-8 h-8"
                            disabled={currentPage >= totalPages}
                            onClick={() =>
                              setPage((p) => Math.min(totalPages, p + 1))
                            }
                            aria-label={t("Next")}
                          >
                            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          !isDeleting && setDeleteDialog({ open, company: null })
        }
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {t("Confirm Deletion")}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2 text-foreground/80 text-base">
              {t(
                "Are you sure you want to delete this company? All related data will be permanently deleted.",
              )}
              <div className="bg-muted mt-4 p-3 border border-border rounded-xl font-medium">
                {deleteDialog.company?.company_name}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="items-center mt-4 pt-4 border-border border-t sm:justify-between">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className="bg-destructive hover:bg-destructive/90 rounded-xl text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="me-2 w-4 h-4 animate-spin" />
              ) : (
                t("Delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={freezeDialog.open}
        onOpenChange={(open) =>
          !isFreezing && setFreezeDialog({ open, company: null })
        }
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {freezeDialog.company?.is_frozen ? (
                <Unlock className="w-5 h-5 text-emerald-600" />
              ) : (
                <Lock className="w-5 h-5 text-amber-600" />
              )}
              {freezeDialog.company?.is_frozen
                ? t("Confirm Unfreeze")
                : t("Confirm Freeze")}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2 text-foreground/80 text-base">
              {freezeDialog.company?.is_frozen
                ? t("Do you want to unfreeze this company?")
                : t("Do you want to freeze this company?")}
              <div className="bg-muted mt-4 p-3 border border-border rounded-xl font-medium">
                {freezeDialog.company?.company_name}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="items-center mt-4 pt-4 border-border border-t sm:justify-between">
            <AlertDialogCancel disabled={isFreezing} className="rounded-xl">
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleFreezeConfirm();
              }}
              className={cn(
                "rounded-xl",
                freezeDialog.company?.is_frozen
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700",
              )}
              disabled={isFreezing}
            >
              {isFreezing ? (
                <Loader2 className="me-2 w-4 h-4 animate-spin" />
              ) : freezeDialog.company?.is_frozen ? (
                t("Unfreeze")
              ) : (
                t("Freeze")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
