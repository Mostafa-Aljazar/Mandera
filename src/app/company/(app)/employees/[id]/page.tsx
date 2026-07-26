"use client";

import React from "react";
import { useParams } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import EmployeeDetailView from "@/components/company/employees/EmployeeDetailView";

const EmployeeDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

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
