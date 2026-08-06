"use client";

import { useEffect } from "react";
import Link from "next/link";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import EmployeeLeaderboard from "@/components/company/dashboard/EmployeeLeaderboard";
import FollowUpCalendarWidget from "@/components/company/dashboard/FollowUpCalendarWidget";
import ClientsBySourceWidget from "@/components/company/dashboard/ClientsBySourceWidget";
import ResponseRatesWidget from "@/components/company/dashboard/ResponseRatesWidget";
import RecentStatusChangesWidget from "@/components/company/dashboard/RecentStatusChangesWidget";
import CompanyActivityLogWidget from "@/components/company/dashboard/CompanyActivityLogWidget";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanyOperationsStats } from "@/hooks/queries/useProperties";
import { useBaseEmployee } from "@/hooks/queries/useEmployees";
import { cn } from "@/lib/utils";
import {
  companyDisplayName,
  employeeDisplayName,
  greetingDisplayName,
  profileDisplayName,
} from "@/lib/bilingualLabel";
import { canViewInsights, isAdministratorOrAbove, canAccessManagerModules } from "@/lib/permissions";
import { usePendingApprovalsCount, useStaleDraftNotificationCheck } from "@/hooks/queries/useNotifications";
import {
  Building2,
  Home,
  Key,
  Users,
  Briefcase,
  ArrowRight,
  ClipboardCheck,
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
  tone = "primary",
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
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
        <h3 className="font-outfit font-semibold text-foreground text-base tracking-tight truncate">
          {title}
        </h3>
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
  const { language } = useLanguage();

  useEffect(() => {
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  const showInsights = canViewInsights(currentUser?.role);
  const showPendingApprovals = isAdministratorOrAbove(currentUser?.role);
  const showManagerModules = canAccessManagerModules(currentUser?.role);
  const { data: pendingApprovals, isLoading: pendingLoading } =
    usePendingApprovalsCount(company?.id, showPendingApprovals);
  const pendingApprovalsCount = pendingApprovals?.total ?? 0;

  useStaleDraftNotificationCheck(company?.id, showPendingApprovals);

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

  const roleLoading = !currentUser;
  const canViewAdvancedStats = showInsights;

  const { data: employeeRecord } = useBaseEmployee(
    currentUser?.employee_id ?? undefined,
  );

  const greetingName = (() => {
    const fromEmployee = employeeRecord
      ? greetingDisplayName(
          employeeDisplayName(employeeRecord, language, currentUser?.name),
        )
      : "";
    const fromProfile = greetingDisplayName(
      profileDisplayName(currentUser, language) || currentUser?.name || "",
    );
    const firstName = fromEmployee || fromProfile;
    if (!firstName) return "";
    return language === "ar" ? `أ. ${firstName}` : `Mr. ${firstName}`;
  })();

  const roleLabel =
    currentUser?.role === "manager"
      ? t("Manager")
      : currentUser?.role === "administrator"
        ? t("Administrator")
        : currentUser?.role === "sales_agent"
          ? t("Sales Agent")
          : "";

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
                {roleLabel ? (
                  <p className="mt-1.5 text-sm sm:text-base font-medium text-primary/80">
                    {roleLabel}
                  </p>
                ) : null}
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("Here's a summary of operations at")}{" "}
                  <span className="font-semibold text-foreground/85">
                    {companyDisplayName(company, language) || "—"}
                  </span>
                </p>
              </div>

            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10 container max-w-6xl">
          <section>
            <h2 className="mb-4 sm:mb-5 font-outfit font-semibold text-foreground text-lg tracking-tight">
              {t("Operations overview")}
            </h2>
            <div className={`gap-3 sm:gap-4 grid grid-cols-2 ${showManagerModules ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
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
              {showManagerModules ? (
                <StatCard
                  label={t("Employees")}
                  value={stats.employees}
                  icon={Building2}
                  loading={loading}
                  tone="slate"
                />
              ) : null}
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
                    tone="emerald"
                  />
                  <ActionCard
                    href="/company/clients"
                    title={t("Manage Clients")}
                    description={t("company_action_clients_desc")}
                    icon={Users}
                    tone="primary"
                  />
                  <ActionCard
                    href="/company/owners"
                    title={t("Manage Owners")}
                    description={t("company_action_owners_desc")}
                    icon={Briefcase}
                    tone="amber"
                  />
                  {showManagerModules ? (
                    <ActionCard
                      href="/company/employees"
                      title={t("Manage Employees")}
                      description={t("company_action_employees_desc")}
                      icon={Building2}
                      tone="sky"
                    />
                  ) : null}
                </div>
              </div>

              <div className="lg:col-span-1 min-h-[280px]">
                <FollowUpCalendarWidget />
              </div>
            </div>
          </section>

          {showPendingApprovals ? (
            <section>
              <div className="mb-4">
                <h2 className="font-outfit font-semibold text-foreground text-lg sm:text-xl tracking-tight">
                  {t("Pending Approvals")}
                </h2>
                <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                  {t(
                    "Review drafts, new listings, change requests, and status changes.",
                  )}
                </p>
              </div>
              <div className="gap-3 sm:gap-4 grid sm:grid-cols-2 xl:grid-cols-4">
                <Link
                  href="/company/approvals?tab=drafts"
                  className="group relative flex flex-col gap-3 bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden transition-shadow"
                >
                  <div
                    className="top-0 absolute inset-x-0 bg-gradient-to-b from-violet-500/10 to-transparent h-14 pointer-events-none"
                    aria-hidden
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="flex justify-center items-center bg-violet-500/10 border border-violet-500/15 rounded-xl w-10 h-10 text-violet-600 shrink-0">
                      <ClipboardCheck className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-outfit font-semibold text-foreground text-sm sm:text-base tracking-tight">
                        {t("Drafts pending")}
                      </p>
                      {(pendingApprovals?.staleDrafts ?? 0) > 0 ? (
                        <p className="text-muted-foreground text-xs">
                          {t("{{count}} stale", {
                            count: pendingApprovals?.staleDrafts ?? 0,
                          })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="relative font-outfit font-bold text-violet-700 text-2xl tabular-nums">
                    {pendingLoading ? "—" : (pendingApprovals?.drafts ?? 0)}
                  </p>
                </Link>
                <Link
                  href="/company/approvals?tab=listings"
                  className="group relative flex flex-col gap-3 bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden transition-shadow"
                >
                  <div
                    className="top-0 absolute inset-x-0 bg-gradient-to-b from-amber-500/10 to-transparent h-14 pointer-events-none"
                    aria-hidden
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="flex justify-center items-center bg-amber-500/10 border border-amber-500/15 rounded-xl w-10 h-10 text-amber-600 shrink-0">
                      <ClipboardCheck className="w-5 h-5" />
                    </span>
                    <p className="font-outfit font-semibold text-foreground text-sm sm:text-base tracking-tight">
                      {t("New listings pending")}
                    </p>
                  </div>
                  <p className="relative font-outfit font-bold text-amber-700 text-2xl tabular-nums">
                    {pendingLoading ? "—" : (pendingApprovals?.newListings ?? 0)}
                  </p>
                </Link>
                <Link
                  href="/company/approvals?tab=edits"
                  className="group relative flex flex-col gap-3 bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden transition-shadow"
                >
                  <div
                    className="top-0 absolute inset-x-0 bg-gradient-to-b from-sky-500/10 to-transparent h-14 pointer-events-none"
                    aria-hidden
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="flex justify-center items-center bg-sky-500/10 border border-sky-500/15 rounded-xl w-10 h-10 text-sky-600 shrink-0">
                      <ClipboardCheck className="w-5 h-5" />
                    </span>
                    <p className="font-outfit font-semibold text-foreground text-sm sm:text-base tracking-tight">
                      {t("Change requests pending")}
                    </p>
                  </div>
                  <p className="relative font-outfit font-bold text-sky-700 text-2xl tabular-nums">
                    {pendingLoading
                      ? "—"
                      : (pendingApprovals?.changeRequests ?? 0)}
                  </p>
                </Link>
                <Link
                  href="/company/approvals?tab=status"
                  className="group relative flex flex-col gap-3 bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden transition-shadow"
                >
                  <div
                    className="top-0 absolute inset-x-0 bg-gradient-to-b from-emerald-500/10 to-transparent h-14 pointer-events-none"
                    aria-hidden
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="flex justify-center items-center bg-emerald-500/10 border border-emerald-500/15 rounded-xl w-10 h-10 text-emerald-600 shrink-0">
                      <ClipboardCheck className="w-5 h-5" />
                    </span>
                    <p className="font-outfit font-semibold text-foreground text-sm sm:text-base tracking-tight">
                      {t("Status changes pending")}
                    </p>
                  </div>
                  <p className="relative font-outfit font-bold text-emerald-700 text-2xl tabular-nums">
                    {pendingLoading
                      ? "—"
                      : (pendingApprovals?.statusChanges ?? 0)}
                  </p>
                </Link>
              </div>
              {pendingApprovalsCount > 0 ? (
                <p className="mt-3 text-muted-foreground text-sm">
                  {t("{{count}} items awaiting review", {
                    count: pendingApprovalsCount,
                  })}
                </p>
              ) : null}
            </section>
          ) : null}

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
                <div id="team-leaderboard">
                  <EmployeeLeaderboard companyId={company.id} />
                </div>
                <div id="clients-by-source">
                  <ClientsBySourceWidget companyId={company.id} />
                </div>
                <div id="clients-by-employee">
                  <ClientsBySourceWidget
                    companyId={company.id}
                    fixedGroupBy="employee"
                    title={t("Clients by Employee")}
                    description={t(
                      "Distribution of acquired clients across assigned employees.",
                    )}
                  />
                </div>
                <RecentStatusChangesWidget companyId={company.id} />
                {showManagerModules ? (
                  <CompanyActivityLogWidget companyId={company.id} />
                ) : null}
                <div id="employee-response-rates">
                  <ResponseRatesWidget companyId={company.id} />
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
