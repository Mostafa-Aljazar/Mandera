"use client";

import React from "react";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import OwnerDetailView from "@/components/company/owners/OwnerDetailView";

const NewOwnerPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <DocumentHead title={`${t("Add New Owner")} | MANDERA CRM`} />
      <CompanyAdminHeader />
      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <OwnerDetailView />
      </main>
    </>
  );
};

export default NewOwnerPage;
