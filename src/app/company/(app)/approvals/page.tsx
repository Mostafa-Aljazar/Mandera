"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import ApprovalsPageContent from "@/components/company/approvals/ApprovalsPageContent";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { canApproveProperties } from "@/lib/permissions";

export default function ApprovalsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentUser } = useCompanyAuth();
  const canReview = canApproveProperties(currentUser?.role);

  useEffect(() => {
    if (currentUser && !canReview) {
      router.replace("/company/dashboard");
    }
  }, [currentUser, canReview, router]);

  if (!canReview) {
    return (
      <>
        <DocumentHead title={t("Approvals")} />
        <div className="min-h-screen bg-background">
          <CompanyAdminHeader />
        </div>
      </>
    );
  }

  return (
    <>
      <DocumentHead title={t("Approvals")} />
      <div className="min-h-screen bg-background">
        <CompanyAdminHeader />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <ApprovalsPageContent />
        </main>
      </div>
    </>
  );
}
