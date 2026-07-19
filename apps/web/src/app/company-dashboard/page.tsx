'use client';

import React from 'react';
import DocumentHead from "@/components/DocumentHead";
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CompanyAdminHeader from '@/components/CompanyAdminHeader';
import EmployeeLeaderboard from '@/components/EmployeeLeaderboard';
import FollowUpCalendarWidget from '@/components/FollowUpCalendarWidget';
import ClientPipelineWidget from '@/components/ClientPipelineWidget';
import ClientsBySourceWidget from '@/components/ClientsBySourceWidget';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useCompanyOperationsStats } from '@/hooks/queries/useProperties';
import { useBaseEmployee } from '@/hooks/queries/useEmployees';
import { Building2, Home, Key, Users, Briefcase, Settings, ArrowRight, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  loading: boolean;
  colorClass?: string;
}

const StatCard = ({ title, value, icon: Icon, loading, colorClass = "text-primary" }: StatCardProps) => (
  <Card className="hover:shadow-md transition-shadow border-border/60">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`p-2 rounded-lg bg-muted/50 ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <div className="text-4xl font-bold font-outfit">{value}</div>
      )}
    </CardContent>
  </Card>
);

const CompanyDashboardPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();

  const isSuperAdmin = currentUser?.role === 'company_super_admin';

  const { data: statsData, isLoading: loading } = useCompanyOperationsStats(company?.id);
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
    isSuperAdmin || employeeRecord?.job_title === 'manager' || employeeRecord?.job_title === 'admin';

  return (
    <>
      <DocumentHead title={`${t('platformName')} - ${t('Dashboard Overview')}`} />
      <CompanyAdminHeader />

      <main className="min-h-[calc(100vh-80px)] bg-muted/20 py-8">
        <div className="container mx-auto px-4 space-y-8">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-outfit">{t('Dashboard Overview')}</h1>
              <p className="text-muted-foreground mt-1">{t("Welcome back")}. {t("Here's a summary of operations at")} <span className="font-semibold text-foreground/80">{company?.company_name}</span>.</p>
            </div>
            {isSuperAdmin && (
              <Link href="/settings">
                <Button variant="outline" className="gap-2 bg-background hover:bg-muted">
                  <Settings className="h-4 w-4" /> {t('Company Settings')}
                </Button>
              </Link>
            )}
          </div>

          {/* Client Pipeline Widget */}
          <ClientPipelineWidget />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard title={t('Rental Properties')} value={stats.propertiesRent} icon={Key} loading={loading} colorClass="text-blue-500" />
            <StatCard title={t('Sale Properties')} value={stats.propertiesSale} icon={Home} loading={loading} colorClass="text-emerald-500" />
            <StatCard title={t('Total Clients')} value={stats.clients} icon={Users} loading={loading} colorClass="text-purple-500" />
            <StatCard title={t('Total Owners')} value={stats.owners} icon={Briefcase} loading={loading} colorClass="text-amber-500" />
            <StatCard title={t('Employees')} value={stats.employees} icon={Building2} loading={loading} colorClass="text-primary" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 h-fit">
              <Card className="hover:border-primary/50 transition-colors border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t('Manage Properties')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/properties">
                    <Button className="w-full justify-between group" variant="secondary">
                      {t('View Properties')} <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors rtl:rotate-180" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t('Manage Clients')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/clients">
                    <Button className="w-full justify-between group" variant="secondary">
                      {t('View Clients')} <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors rtl:rotate-180" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t('Manage Owners')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/owners">
                    <Button className="w-full justify-between group" variant="secondary">
                      {t('View Owners')} <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors rtl:rotate-180" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{t('Manage Employees')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/company-dashboard/employees">
                    <Button className="w-full justify-between group" variant="secondary">
                      {t('View Employees')} <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors rtl:rotate-180" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <FollowUpCalendarWidget />
            </div>
          </div>

          {roleLoading ? (
            <div className="mt-8 space-y-8">
              <Skeleton className="h-[300px] w-full rounded-2xl" />
              <Skeleton className="h-[300px] w-full rounded-2xl" />
            </div>
          ) : (
            canViewAdvancedStats && company?.id && (
              <div className="space-y-8 mt-4">
                <EmployeeLeaderboard companyId={company.id} />
                <ClientsBySourceWidget companyId={company.id} />
              </div>
            )
          )}

        </div>
      </main>
    </>
  );
};

export default CompanyDashboardPage;
