"use client";

import Link from "next/link";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import EmployeeLeaderboard from "@/components/company/dashboard/EmployeeLeaderboard";
import FollowUpCalendarWidget from "@/components/company/dashboard/FollowUpCalendarWidget";
import ClientPipelineWidget from "@/components/company/dashboard/ClientPipelineWidget";
import ClientsBySourceWidget from "@/components/company/dashboard/ClientsBySourceWidget";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useCompanyOperationsStats } from "@/hooks/queries/useProperties";
import { useBaseEmployee } from "@/hooks/queries/useEmployees";
import { cn } from "@/lib/utils";
import {
  Building2,
  Home,
  Key,
  Users,
  Briefcase,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

type StatTone = "primary" | "sky" | "emerald" | "amber" | "slate";

const toneStyles: Record<
  StatTone,
  { icon: string; value: string; glow: string }
> = {
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
  amber: {
    icon: "bg-amber-500/10 text-amber-600 border-amber-500/15",
    value: "text-amber-700",
    glow: "from-amber-500/10",
  },
  slate: {
    icon: "bg-slate-500/10 text-slate-600 border-slate-500/15",
    value: "text-slate-700",
    glow: "from-slate-500/10",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  tone = "primary",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
  tone?: StatTone;
}) {
  const styles = toneStyles[tone];

  return (
    <div className="relative bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden transition-shadow">
      <div
        className={cn(
          "top-0 absolute inset-x-0 bg-gradient-to-b to-transparent h-14 pointer-events-none",
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
            <Skeleton className="mt-3 w-14 h-8" />
          ) : (
            <p
              className={cn(
                "mt-2 font-outfit font-bold text-2xl sm:text-3xl tracking-tight tabular-nums",
                styles.value,
              )}
            >
              {value}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex justify-center items-center border rounded-xl w-10 h-10 sm:w-11 sm:h-11 shrink-0",
            styles.icon,
          )}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </span>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  count,
  loading,
  tone = "primary",
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  count?: number;
  loading?: boolean;
  tone?: StatTone;
}) {
  const { t } = useTranslation();
  const styles = toneStyles[tone];

  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 bg-background/80 hover:bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-4 sm:p-5 border border-border/50 hover:border-primary/25 rounded-2xl overflow-hidden transition-all"
    >
      <div
        className={cn(
          "start-0 absolute inset-y-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity",
          tone === "sky" && "bg-sky-500",
          tone === "emerald" && "bg-emerald-500",
          tone === "amber" && "bg-amber-500",
          tone === "slate" && "bg-slate-500",
          tone === "primary" && "bg-primary",
        )}
        aria-hidden
      />

      <span
        className={cn(
          "flex justify-center items-center border rounded-xl w-12 h-12 shrink-0 transition-transform group-hover:scale-105",
          styles.icon,
        )}
      >
        <Icon className="w-5 h-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-outfit font-semibold text-foreground text-base tracking-tight truncate">
            {title}
          </h3>
          {loading ? (
            <Skeleton className="rounded-full w-8 h-5" />
          ) : typeof count === "number" ? (
            <span className="inline-flex items-center bg-muted/80 px-2 py-0.5 rounded-full font-medium text-muted-foreground text-xs tabular-nums">
              {count}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-muted-foreground text-sm line-clamp-1 sm:line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>

      <span className="hidden sm:inline-flex justify-center items-center bg-muted/40 group-hover:bg-primary/10 rounded-full w-9 h-9 text-muted-foreground group-hover:text-primary shrink-0 transition-colors">
        <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        <span className="sr-only">{t("Open")}</span>
      </span>
    </Link>
  );
}

export default function CompanyDashboardPage() {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();

  const isSuperAdmin = currentUser?.role === "company_super_admin";

  const { data: statsData, isLoading: loading } = useCompanyOperationsStats(
    company?.id,
  );
  const stats = statsData ?? {
    propertiesRent: 0,
    propertiesSale: 0,
    clients: 0,
    owners: 0,
    employees: 0,
  };

  const { data: employeeRecord, isLoading: employeeLoading } = useBaseEmployee(
    !isSuperAdmin ? (currentUser?.employee_id ?? undefined) : undefined,
  );

  const roleLoading = !currentUser || (!isSuperAdmin && employeeLoading);
  const canViewAdvancedStats =
    isSuperAdmin ||
    employeeRecord?.job_title === "manager" ||
    employeeRecord?.job_title === "admin";

  const greetingName =
    currentUser?.name?.split(" ")[0] || company?.company_name || "";

  return (
    <>
      <DocumentHead
        title={`${t("platformName")} - ${t("Dashboard Overview")}`}
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
                  {t("Welcome back")}
                  {greetingName ? (
                    <span className="text-primary">, {greetingName}</span>
                  ) : null}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("Here's a summary of operations at")}{" "}
                  <span className="font-semibold text-foreground/85">
                    {company?.company_name ?? "—"}
                  </span>
                </p>
              </div>

            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10 container max-w-6xl">
          <section>
            <ClientPipelineWidget />
          </section>

          <section>
            <h2 className="mb-4 sm:mb-5 font-outfit font-semibold text-foreground text-lg tracking-tight">
              {t("Operations overview")}
            </h2>
            <div className="gap-3 sm:gap-4 grid grid-cols-2 lg:grid-cols-5">
              <StatCard
                label={t("Rental Properties")}
                value={stats.propertiesRent}
                icon={Key}
                loading={loading}
                tone="sky"
              />
              <StatCard
                label={t("Sale Properties")}
                value={stats.propertiesSale}
                icon={Home}
                loading={loading}
                tone="emerald"
              />
              <StatCard
                label={t("Total Clients")}
                value={stats.clients}
                icon={Users}
                loading={loading}
                tone="primary"
              />
              <StatCard
                label={t("Total Owners")}
                value={stats.owners}
                icon={Briefcase}
                loading={loading}
                tone="amber"
              />
              <StatCard
                label={t("Employees")}
                value={stats.employees}
                icon={Building2}
                loading={loading}
                tone="slate"
              />
            </div>
          </section>

          <section>
            <div className="gap-4 lg:gap-5 grid lg:grid-cols-3">
              <div className="relative bg-card shadow-[var(--shadow-subtle)] lg:col-span-2 p-5 sm:p-6 border border-border/60 rounded-2xl overflow-hidden">
                <div
                  className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.06] to-transparent h-20 pointer-events-none"
                  aria-hidden
                />

                <div className="relative mb-5 sm:mb-6">
                  <h2 className="font-outfit font-semibold text-foreground text-lg sm:text-xl tracking-tight">
                    {t("Quick actions")}
                  </h2>
                  <p className="mt-1.5 max-w-lg text-muted-foreground text-sm leading-relaxed">
                    {t("company_quick_actions_desc")}
                  </p>
                </div>

                <div className="relative gap-3 grid sm:grid-cols-2">
                  <ActionCard
                    href="/company/properties"
                    title={t("Manage Properties")}
                    description={t("company_action_properties_desc")}
                    icon={Home}
                    count={stats.propertiesRent + stats.propertiesSale}
                    loading={loading}
                    tone="emerald"
                  />
                  <ActionCard
                    href="/company/clients"
                    title={t("Manage Clients")}
                    description={t("company_action_clients_desc")}
                    icon={Users}
                    count={stats.clients}
                    loading={loading}
                    tone="primary"
                  />
                  <ActionCard
                    href="/company/owners"
                    title={t("Manage Owners")}
                    description={t("company_action_owners_desc")}
                    icon={Briefcase}
                    count={stats.owners}
                    loading={loading}
                    tone="amber"
                  />
                  <ActionCard
                    href="/company/employees"
                    title={t("Manage Employees")}
                    description={t("company_action_employees_desc")}
                    icon={Building2}
                    count={stats.employees}
                    loading={loading}
                    tone="sky"
                  />
                </div>
              </div>

              <div className="lg:col-span-1 min-h-[280px]">
                <FollowUpCalendarWidget />
              </div>
            </div>
          </section>

          {roleLoading ? (
            <div className="space-y-6">
              <Skeleton className="rounded-2xl w-full h-[280px]" />
              <Skeleton className="rounded-2xl w-full h-[280px]" />
            </div>
          ) : canViewAdvancedStats && company?.id ? (
            <section className="relative bg-muted/20 shadow-[var(--shadow-subtle)] p-5 sm:p-6 border border-border/60 rounded-2xl overflow-hidden">
              <div
                className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.05] to-transparent h-24 pointer-events-none"
                aria-hidden
              />

              <div className="relative mb-5 sm:mb-6">
                <h2 className="font-outfit font-semibold text-foreground text-lg sm:text-xl tracking-tight">
                  {t("Insights")}
                </h2>
                <p className="mt-1.5 max-w-xl text-muted-foreground text-sm leading-relaxed">
                  {t("company_insights_desc")}
                </p>
              </div>

              <div className="relative space-y-5 sm:space-y-6">
                <EmployeeLeaderboard companyId={company.id} />
                <ClientsBySourceWidget companyId={company.id} />
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
