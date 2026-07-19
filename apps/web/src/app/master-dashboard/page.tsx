"use client";

import React from "react";
import Link from "next/link";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MasterAdminHeader from "@/components/MasterAdminHeader";
import { useCompanyDashboardStats } from "@/hooks/queries/useCompanies";
import {
  Building2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Users,
  FileText,
} from "lucide-react";
import { useEmployeeCount } from "@/hooks/useEmployeeCount";

const MasterDashboardPage = () => {
  const { t } = useTranslation();

  const { count: employeeCount, loading: loadingEmployees } =
    useEmployeeCount(undefined);

  const { data: statsData, isLoading: loading } = useCompanyDashboardStats();
  const stats = statsData ?? {
    totalCompanies: 0,
    activeSubscriptions: 0,
    inactiveSubscriptions: 0,
  };

  return (
    <>
      <Helmet>
        <title>
          {t("platformName")} - {t("Master admin dashboard")}
        </title>
      </Helmet>
      <MasterAdminHeader />
      <div className="bg-muted/30 min-h-[calc(100vh-80px)]">
        <div className="mx-auto px-4 py-12 container">
          <div className="mb-8">
            <h1 className="mb-2 font-outfit font-bold text-4xl tracking-tight">
              {t("Master admin dashboard")}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t("Manage companies and monitor subscriptions")}
            </p>
          </div>

          <div className="gap-6 grid md:grid-cols-4 mb-8">
            {loading ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="bg-muted rounded w-24 h-4 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded w-16 h-10 animate-pulse"></div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                    <Building2 className="w-4 h-4" />
                    {t("Total companies")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-3xl">
                    {stats.totalCompanies}
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingEmployees ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="bg-muted rounded w-32 h-4 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded w-16 h-10 animate-pulse"></div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                    <Users className="w-4 h-4 text-blue-500" />
                    {t("Platform Employees")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-blue-500 text-3xl">
                    {employeeCount}
                  </div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="bg-muted rounded w-32 h-4 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded w-16 h-10 animate-pulse"></div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {t("Active subscriptions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-emerald-500 text-3xl">
                    {stats.activeSubscriptions}
                  </div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="bg-muted rounded w-32 h-4 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded w-16 h-10 animate-pulse"></div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                    <XCircle className="w-4 h-4 text-destructive" />
                    {t("Inactive subscriptions")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-destructive text-3xl">
                    {stats.inactiveSubscriptions}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="gap-6 grid md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{t("Company Actions")}</CardTitle>
                <CardDescription>
                  {t("Manage your tenant organizations")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/master-dashboard/companies">
                  <Button variant="outline" className="justify-between w-full">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />{" "}
                      {t("View all companies")}
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </Link>
                <Link href="/master-dashboard/companies/new">
                  <Button className="justify-between w-full">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> {t("Add new company")}
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{t("Content Management")}</CardTitle>
                <CardDescription>
                  {t("Update public facing website content")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/admin/legal-pages">
                  <Button variant="outline" className="justify-between w-full">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />{" "}
                      {t("Legal Pages Management")}
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </Link>
                <p className="px-1 pt-2 text-muted-foreground text-sm">
                  {t(
                    "Manage Privacy Policy and Terms of Service content that is displayed publicly on the landing pages.",
                  )}
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
