"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LOGO_URL } from "@/components/landing/constants";

export default function LandingFooter() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background py-8 md:py-10 border-border/50 border-t">
      <div className="mx-auto px-4 container">
        <div className="flex md:flex-row flex-col md:justify-between items-center md:items-center gap-5 md:gap-6 text-center md:text-start">
          <div className="flex justify-center md:justify-start items-center gap-2.5">
            <img
              src={LOGO_URL}
              alt={t("platformName")}
              className="w-auto h-7"
            />
            <span className="font-semibold text-foreground/90 text-base md:text-lg tracking-tight">
              {t("platformName")}
            </span>
          </div>

          <nav className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 order-2 md:order-3">
            <Link
              href="/privacy-policy"
              className="font-medium text-muted-foreground hover:text-primary text-sm transition-colors"
            >
              {t("footer_privacy")}
            </Link>
            <Link
              href="/terms-of-service"
              className="font-medium text-muted-foreground hover:text-primary text-sm transition-colors"
            >
              {t("footer_terms")}
            </Link>
          </nav>

          <p className="order-3 md:order-2 md:max-w-none max-w-xs text-muted-foreground text-xs md:text-sm leading-relaxed md:leading-normal">
            {t("footer_rights", { year: currentYear })}
          </p>
        </div>
      </div>
    </footer>
  );
}
