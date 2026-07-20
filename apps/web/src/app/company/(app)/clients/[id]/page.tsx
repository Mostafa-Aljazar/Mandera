"use client";

import React from "react";
import { useParams } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import ClientDetailView from "@/components/company/clients/ClientDetailView";

const ClientDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <DocumentHead title={`${t("Client Profile")} | MANDERA CRM`} />
      <CompanyAdminHeader />
      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <ClientDetailView clientId={id} />
      </main>
    </>
  );
};

export default ClientDetailPage;
