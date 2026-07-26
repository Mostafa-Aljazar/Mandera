"use client";

import Link from "next/link";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useLegalPage } from "@/hooks/queries/useLegalPages";
import { getLocalizedLegalPage } from "@/lib/legalPages";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Scale,
  Shield,
} from "lucide-react";
import type { LegalPageType } from "@/types/supabase-entities.types";

type LegalDocumentPageProps = {
  pageType: LegalPageType;
  fallbackTitle: string;
};

export default function LegalDocumentPage({
  pageType,
  fallbackTitle,
}: LegalDocumentPageProps) {
  const { t, i18n } = useTranslation();
  const { data: pageData, isLoading: loading, isError } = useLegalPage(pageType);
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const localized = pageData
    ? getLocalizedLegalPage(pageData, language)
    : null;
  const isArabic = language === "ar" || language.startsWith("ar");
  const pageTitle = localized?.title || fallbackTitle;
  const dir = isArabic ? "rtl" : "ltr";
  const isPrivacy = pageType === "privacy_policy";
  const Icon = isPrivacy ? Shield : Scale;
  const BackArrow = isArabic ? ArrowRight : ArrowLeft;
  const dateLocale = isArabic ? ar : enUS;

  const relatedHref = isPrivacy ? "/terms-of-service" : "/privacy-policy";
  const relatedLabel = isPrivacy
    ? t("Terms of Service")
    : t("Privacy Policy");
  const RelatedIcon = isPrivacy ? Scale : Shield;

  return (
    <>
      <DocumentHead title={`${pageTitle} | MANDERA CRM`} />

      <main dir={dir} className="bg-background">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-muted/30 to-background"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-8 sm:pb-12 container max-w-5xl">
            <div className="flex justify-between items-center gap-3 mb-6 sm:mb-8">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 min-w-0 font-medium text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                <BackArrow className="w-4 h-4 shrink-0" />
                <span className="truncate">{t("Back to home")}</span>
              </Link>
              <Link
                href={relatedHref}
                className="inline-flex items-center gap-1.5 bg-card/90 hover:bg-card px-2.5 sm:px-3 py-1.5 border border-border/60 rounded-full font-medium text-muted-foreground hover:text-primary text-xs sm:text-sm shrink-0 transition-colors"
              >
                <RelatedIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[9rem] sm:max-w-none truncate">
                  {relatedLabel}
                </span>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="rounded-xl w-12 h-12" />
                <Skeleton className="rounded-xl w-3/4 max-w-xs h-9" />
                <Skeleton className="rounded-lg w-36 h-4" />
              </div>
            ) : (
              <div className="flex items-start gap-3.5 sm:gap-5">
                <span className="flex justify-center items-center bg-card shadow-[var(--shadow-subtle)] border border-primary/15 rounded-xl sm:rounded-2xl w-11 h-11 sm:w-14 sm:h-14 text-primary shrink-0">
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl md:text-4xl leading-snug tracking-tight">
                    {isError || !localized ? fallbackTitle : localized.title}
                  </h1>
                  {pageData?.updated_at ? (
                    <p className="flex items-center gap-1.5 mt-2 sm:mt-2.5 text-muted-foreground text-xs sm:text-sm">
                      <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/80 shrink-0" />
                      <span>
                        {t("Last updated:")}{" "}
                        <span className="text-foreground/75">
                          {format(new Date(pageData.updated_at), "d MMMM yyyy", {
                            locale: dateLocale,
                          })}
                        </span>
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto px-4 sm:px-6 py-6 sm:py-10 md:py-12 container max-w-5xl">
          {loading ? (
            <div className="space-y-4 bg-card px-5 py-6 sm:p-10 border border-border/60 rounded-2xl">
              <Skeleton className="w-1/3 h-7" />
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-[95%] h-4" />
              <Skeleton className="w-[90%] h-4" />
            </div>
          ) : isError || !pageData || !localized ? (
            <div className="bg-card shadow-[var(--shadow-subtle)] mx-auto px-5 py-8 sm:p-10 border border-border/60 rounded-2xl max-w-lg text-center">
              <span className="inline-flex justify-center items-center bg-destructive/10 mb-4 rounded-xl w-12 h-12 text-destructive">
                <Icon className="w-6 h-6" />
              </span>
              <h2 className="mb-2 font-outfit font-semibold text-foreground text-xl">
                {t("Failed to load page content. Please try again later.")}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("If the problem persists, please contact support.")}
              </p>
            </div>
          ) : (
            <article className="animate-in duration-500 fade-in">
              <div className="bg-card shadow-[var(--shadow-subtle)] px-6 py-7 sm:px-8 sm:py-8 md:px-12 md:py-12 border border-border/60 rounded-2xl">
                <div
                  dir={dir}
                  className="legal-document-body rich-text-content"
                  dangerouslySetInnerHTML={{ __html: localized.content }}
                />
              </div>
            </article>
          )}
        </section>
      </main>
    </>
  );
}
