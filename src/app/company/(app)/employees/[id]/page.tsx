"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import EmployeeDetailView from "@/components/company/employees/EmployeeDetailView";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { canManageEmployees } from "@/lib/permissions";

const EmployeeDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useCompanyAuth();
  const canManage = canManageEmployees(currentUser?.role);

  useEffect(() => {
    if (!canManage) {
      router.replace("/company/dashboard");
    }
  }, [canManage, router]);

  if (!canManage) {
    return null;
  }

  return (
    <>
      <DocumentHead title={`${t("Employee Profile")} | MANDERA CRM`} />
      <CompanyAdminHeader />
      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <EmployeeDetailView profileId={id} />
      </main>
    </>
  );
};

export default EmployeeDetailPage;
