'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MasterAdminHeader from '@/components/MasterAdminHeader.jsx';
import pb from '@/lib/pocketbaseClient';
import { Building2, CheckCircle2, XCircle, ArrowRight, Users, FileText } from 'lucide-react';
import { useEmployeeCount } from '@/hooks/useEmployeeCount.js';

const MasterDashboardPage = () => {
  const { t } = useTranslation();

  const { count: employeeCount, loading: loadingEmployees } = useEmployeeCount(null);

  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeSubscriptions: 0,
    inactiveSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const companies = await pb.collection('companies').getFullList({ $autoCancel: false });

        const now = new Date();
        const active = companies.filter(c => {
          const endDate = new Date(c.subscriptionEndDate);
          return c.isActive && now <= endDate;
        }).length;

        setStats({
          totalCompanies: companies.length,
          activeSubscriptions: active,
          inactiveSubscriptions: companies.length - active
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <>
      <Helmet>
        <title>{t('platformName')} - {t('Master admin dashboard')}</title>
      </Helmet>
      <MasterAdminHeader />
      <div className="min-h-[calc(100vh-80px)] bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2 font-outfit">{t('Master admin dashboard')}</h1>
            <p className="text-muted-foreground text-lg">{t('Manage companies and monitor subscriptions')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-4 mb-8">
            {loading ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3"><div className="h-4 bg-muted rounded animate-pulse w-24"></div></CardHeader>
                <CardContent><div className="h-10 bg-muted rounded animate-pulse w-16"></div></CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t('Total companies')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalCompanies}</div>
                </CardContent>
              </Card>
            )}

            {loadingEmployees ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3"><div className="h-4 bg-muted rounded animate-pulse w-32"></div></CardHeader>
                <CardContent><div className="h-10 bg-muted rounded animate-pulse w-16"></div></CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    {t('Platform Employees')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">{employeeCount}</div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3"><div className="h-4 bg-muted rounded animate-pulse w-32"></div></CardHeader>
                <CardContent><div className="h-10 bg-muted rounded animate-pulse w-16"></div></CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {t('Active subscriptions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-500">{stats.activeSubscriptions}</div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3"><div className="h-4 bg-muted rounded animate-pulse w-32"></div></CardHeader>
                <CardContent><div className="h-10 bg-muted rounded animate-pulse w-16"></div></CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    {t('Inactive subscriptions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">{stats.inactiveSubscriptions}</div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{t('Company Actions')}</CardTitle>
                <CardDescription>{t('Manage your tenant organizations')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/master-dashboard/companies">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> {t('View all companies')}</span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </Link>
                <Link href="/master-dashboard/companies/new">
                  <Button className="w-full justify-between">
                    <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> {t('Add new company')}</span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{t('Content Management')}</CardTitle>
                <CardDescription>{t('Update public facing website content')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/admin/legal-pages">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> {t('Legal Pages Management')}</span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground pt-2 px-1">
                  {t('Manage Privacy Policy and Terms of Service content that is displayed publicly on the landing pages.')}
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </>
  );
};

export default MasterDashboardPage;
