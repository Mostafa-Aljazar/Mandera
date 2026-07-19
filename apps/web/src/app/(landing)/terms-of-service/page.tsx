"use client";

import { useTranslation } from "react-i18next";
import LegalDocumentPage from "../_components/LegalDocumentPage";

export default function TermsOfServicePage() {
  const { t } = useTranslation();

  return (
    <LegalDocumentPage
      pageType="terms_of_service"
      fallbackTitle={t("Terms of Service")}
    />
  );
}
