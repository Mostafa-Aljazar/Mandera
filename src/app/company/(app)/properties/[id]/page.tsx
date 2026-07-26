"use client";

import React from "react";
import { useParams } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import PropertyDetailView from "@/components/company/properties/PropertyDetailView";

const PropertyDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <DocumentHead title={`${t("Property Details")} | MANDERA CRM`} />
      <CompanyAdminHeader />
      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <PropertyDetailView propertyId={id} />
      </main>
    </>
  );
};

export default PropertyDetailPage;
