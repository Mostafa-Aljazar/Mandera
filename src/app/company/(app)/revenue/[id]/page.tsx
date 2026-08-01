"use client";

import React from "react";
import { useParams } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import RevenueDetailView from "@/components/company/revenue/RevenueDetailView";

export default function RevenueDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <DocumentHead title={`${t("Revenue details")} | MANDERA CRM`} />
      <CompanyAdminHeader />
      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <RevenueDetailView revenueId={id} />
      </main>
    </>
  );
}
