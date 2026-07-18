"use client";

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import PublicHeader from "@/components/PublicHeader";
import pb from "@/lib/pocketbaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { LegalPage } from "../../types/pocketbase.types";

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();
  const [pageData, setPageData] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const record = await pb
          .collection("legal_pages")
          .getFirstListItem<LegalPage>('page_type="privacy_policy"', {
            $autoCancel: false,
          });
        setPageData(record);
      } catch (err) {
        console.error("Error fetching privacy policy:", err);
        setError(t("Failed to load page content. Please try again later."));
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [t]);

  return (
    <>
      <Helmet>
        <title>{pageData?.title || t("Privacy Policy")} | MANDERA CRM</title>
      </Helmet>

      <PublicHeader />

      <main className="bg-background min-h-[calc(100vh-140px)]">
        <div className="mx-auto px-4 py-16 md:py-24 max-w-4xl container">
          {loading ? (
            <div className="space-y-8">
              <Skeleton className="rounded-lg w-3/4 max-w-sm h-12" />
              <div className="space-y-4">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-[90%] h-4" />
                <Skeleton className="w-[95%] h-4" />
                <Skeleton className="w-[80%] h-4" />
              </div>
              <div className="space-y-4 pt-8">
                <Skeleton className="w-1/3 h-8" />
                <Skeleton className="w-[85%] h-4" />
                <Skeleton className="w-full h-4" />
              </div>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <h2 className="mb-2 font-semibold text-destructive text-2xl">
                {error}
              </h2>
              <p className="text-muted-foreground">
                {t("If the problem persists, please contact support.")}
              </p>
            </div>
          ) : (
            <article className="animate-in duration-500 fade-in">
              <header className="mb-10">
                <h1 className="mb-4 font-outfit font-extrabold text-foreground text-4xl md:text-5xl tracking-tight">
                  {pageData.title}
                </h1>
                <p className="font-medium text-muted-foreground text-sm">
                  {t("Last updated:")}{" "}
                  {format(new Date(pageData.updated), "MMMM d, yyyy")}
                </p>
              </header>

              <div
                className="pb-16 rich-text-content"
                dangerouslySetInnerHTML={{ __html: pageData.content }}
              />
            </article>
          )}
        </div>
      </main>

      <footer className="bg-card mt-auto py-12 border-t">
        <div className="mx-auto px-4 text-center container">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} MANDERA CRM.{" "}
            {t("All rights reserved.")}
          </p>
        </div>
      </footer>
    </>
  );
};

export default PrivacyPolicyPage;
