"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import AddDealForm from "@/components/company/revenue/AddDealForm";
import { Skeleton } from "@/components/ui/skeleton";

function AddDealPageBody() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId") || undefined;
  return <AddDealForm initialPropertyId={propertyId} />;
}

export default function AddDealPage() {
  const { t } = useTranslation();

  return (
    <>
      <DocumentHead title={`${t("Add Deal")} | MANDERA CRM`} />
      <CompanyAdminHeader />
      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <Suspense
          fallback={
            <div className="mx-auto px-4 sm:px-6 py-8 container max-w-6xl space-y-4">
              <Skeleton className="w-40 h-9" />
              <Skeleton className="w-full h-80 rounded-2xl" />
            </div>
          }
        >
          <AddDealPageBody />
        </Suspense>
      </main>
    </>
  );
}
