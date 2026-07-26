"use client";

import Link from "next/link";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SectionBadge from "@/components/common/SectionBadge";
import MasterAdminHeader from "@/components/master/MasterAdminHeader";
import { useCompanyDashboardStats } from "@/hooks/queries/useCompanies";
import { useEmployeeCount } from "@/hooks/useEmployeeCount";
import { cn } from "@/lib/utils";
import {
  Building2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Users,
  FileText,
  Plus,
  type LucideIcon,
} from "lucide-react";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
  tone?: "primary" | "sky" | "emerald" | "rose";
};

const toneStyles = {
  primary: {
    icon: "bg-primary/10 text-primary border-primary/15",
    value: "text-foreground",
    glow: "from-primary/10",
  },
  sky: {
    icon: "bg-sky-500/10 text-sky-600 border-sky-500/15",
    value: "text-sky-700",
    glow: "from-sky-500/10",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600 border-emerald-500/15",
    value: "text-emerald-700",
    glow: "from-emerald-500/10",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600 border-rose-500/15",
    value: "text-rose-700",
    glow: "from-rose-500/10",
  },
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  tone = "primary",
}: StatCardProps) {
  const styles = toneStyles[tone];

  return (
    <div className="relative bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-5 sm:p-6 border border-border/60 rounded-2xl overflow-hidden transition-shadow">
      <div
        className={cn(
          "top-0 absolute inset-x-0 bg-gradient-to-b to-transparent h-16 pointer-events-none",
          styles.glow,
        )}
        aria-hidden
      />
      <div className="relative flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="font-medium text-muted-foreground text-xs sm:text-sm truncate">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-3 w-16 h-9" />
          ) : (
            <p
              className={cn(
                "mt-2 font-outfit font-bold text-3xl sm:text-4xl tracking-tight tabular-nums",
                styles.value,
              )}
            >
              {value}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex justify-center items-center border rounded-xl w-11 h-11 shrink-0",
            styles.icon,
          )}
        >
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </div>
  );
}

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  primary?: boolean;
};

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  primary,
}: ActionCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-4 bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-5 sm:p-6 border rounded-2xl transition-all",
        primary
          ? "border-primary/25 hover:border-primary/40"
          : "border-border/60 hover:border-primary/25",
      )}
    >
      <span
        className={cn(
          "flex justify-center items-center rounded-xl w-12 h-12 border",
          primary
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-primary/10 text-primary border-primary/15",
        )}
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
          {title}
        </h3>
        <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 font-medium text-primary text-sm">
        {t("Open")}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180" />
      </span>
    </Link>
  );
}

export default function MasterDashboardPage() {
  const { t } = useTranslation();
  const { count: employeeCount, loading: loadingEmployees } =
    useEmployeeCount(undefined);
  const { data: statsData, isLoading: loading } = useCompanyDashboardStats();

  const stats = statsData ?? {
    totalCompanies: 0,
    activeSubscriptions: 0,
    inactiveSubscriptions: 0,
  };

  const documentTitle = `${t("platformName")} - ${t("Master admin dashboard")}`;
  const activeRate =
    stats.totalCompanies > 0
      ? Math.round((stats.activeSubscriptions / stats.totalCompanies) * 100)
      : 0;

  return (
    <>
      <DocumentHead title={documentTitle} />
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
            <div className="flex md:flex-row flex-col md:justify-between md:items-end gap-6">
              <div className="min-w-0">
                <SectionBadge className="mb-3">
                  {t("master_nav_dashboard")}
                </SectionBadge>
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl md:text-4xl tracking-tight">
                  {t("Welcome back")}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("Manage companies and monitor subscriptions")}
                </p>
              </div>

              <div className="flex sm:flex-row flex-col gap-2.5 shrink-0">
                <Button asChild variant="outline" className="rounded-xl h-11">
                  <Link href="/master/dashboard/companies">
                    <Building2 className="w-4 h-4" />
                    {t("View all companies")}
                  </Link>
                </Button>
                <Button asChild className="rounded-xl h-11 font-semibold">
                  <Link href="/master/dashboard/companies/new">
                    <Plus className="w-4 h-4" />
                    {t("Add new company")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10 container max-w-6xl">
          <section>
            <div className="flex justify-between items-end gap-3 mb-4 sm:mb-5">
              <h2 className="font-outfit font-semibold text-foreground text-lg tracking-tight">
                {t("Platform overview")}
              </h2>
              {!loading && stats.totalCompanies > 0 ? (
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {t("Active rate")}:{" "}
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {activeRate}%
                  </span>
                </p>
              ) : null}
            </div>

            <div className="gap-3 sm:gap-4 grid grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t("Total companies")}
                value={stats.totalCompanies}
                icon={Building2}
                loading={loading}
                tone="primary"
              />
              <StatCard
                label={t("Platform Employees")}
                value={employeeCount}
                icon={Users}
                loading={loadingEmployees}
                tone="sky"
              />
              <StatCard
                label={t("Active subscriptions")}
                value={stats.activeSubscriptions}
                icon={CheckCircle2}
                loading={loading}
                tone="emerald"
              />
              <StatCard
                label={t("Inactive subscriptions")}
                value={stats.inactiveSubscriptions}
                icon={XCircle}
                loading={loading}
                tone="rose"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 sm:mb-5 font-outfit font-semibold text-foreground text-lg tracking-tight">
              {t("Quick actions")}
            </h2>
            <div className="gap-3 sm:gap-4 grid sm:grid-cols-2 lg:grid-cols-3">
              <ActionCard
                href="/master/dashboard/companies"
                title={t("View all companies")}
                description={t("master_action_companies_desc")}
                icon={Building2}
              />
              <ActionCard
                href="/master/dashboard/companies/new"
                title={t("Add new company")}
                description={t("Create a new company account")}
                icon={Plus}
                primary
              />
              <ActionCard
                href="/master/legal-pages"
                title={t("master_nav_legal")}
                description={t("master_action_legal_desc")}
                icon={FileText}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
