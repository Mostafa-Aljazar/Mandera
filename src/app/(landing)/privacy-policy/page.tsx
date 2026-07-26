"use client";

import { useTranslation } from "react-i18next";
import LegalDocumentPage from "../_components/LegalDocumentPage";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <LegalDocumentPage
      pageType="privacy_policy"
      fallbackTitle={t("Privacy Policy")}
    />
  );
}
