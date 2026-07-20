"use client";

import React from "react";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import ClientDetailView from "@/components/company/clients/ClientDetailView";

const NewClientPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <DocumentHead title={`${t("Add New Client")} | MANDERA CRM`} />
      <CompanyAdminHeader />
      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <ClientDetailView />
      </main>
    </>
  );
};

export default NewClientPage;
