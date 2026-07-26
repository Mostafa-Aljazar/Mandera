"use client";

import Link from "next/link";
import { Check, Info } from "lucide-react";
import SectionBadge from "@/components/common/SectionBadge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function PricingSection() {
  const { t } = useTranslation();

  return (
    <section
      id="pricing"
      className="relative bg-primary/[0.04] py-10 md:py-14 overflow-hidden"
    >
      <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent h-px pointer-events-none" />

      <div className="relative mx-auto px-4 container">
        <div className="mx-auto mb-6 md:mb-8 max-w-2xl text-center">
          <SectionBadge>{t("nav_pricing")}</SectionBadge>
          <h2 className="mt-4 font-bold text-xl sm:text-2xl md:text-3xl tracking-tight">
            {t("pricing_title")}
          </h2>
          <p className="mt-1.5 text-muted-foreground text-xs sm:text-sm md:text-base">
            {t("pricing_subtitle")}
          </p>
        </div>

        <div className="md:items-stretch gap-3 sm:gap-4 md:gap-5 grid md:grid-cols-2 mx-auto w-full max-w-md sm:max-w-lg md:max-w-4xl">
          <div className="group flex flex-col bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-4 sm:p-5 border border-border/70 hover:border-primary/35 rounded-xl transition-all hover:-translate-y-0.5 duration-300 ease-out">
            <span className="inline-flex items-center bg-muted/40 px-2 py-0.5 border border-border/80 rounded-full w-fit font-semibold text-[10px] text-muted-foreground sm:text-[11px]">
              {t("plan_trial_title")}
            </span>

            <p className="mt-3 font-outfit font-bold text-primary text-xl sm:text-2xl md:text-3xl tracking-tight">
              {t("plan_trial_price")}
            </p>

            <p className="mt-1.5 mb-4 text-muted-foreground text-xs sm:text-sm">
              {t("plan_trial_desc")}
            </p>

            <ul className="flex-1 space-y-1.5 mb-4">
              {[t("feat1_title"), t("feat2_title"), t("feat3_title")].map(
                (item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="flex justify-center items-center bg-primary/10 mt-0.5 rounded-full w-4 h-4 shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </span>
                    <span className="text-[11px] text-foreground/85 sm:text-xs md:text-sm leading-snug">
                      {item}
                    </span>
                  </li>
                ),
              )}
            </ul>

            <Link href="/company/login" className="mt-auto">
              <Button
                variant="outline"
                className="group-hover:bg-primary/5 group-hover:border-primary rounded-lg w-full h-9 sm:h-10 group-hover:text-primary text-xs sm:text-sm transition-all duration-300"
              >
                {t("hero_cta")}
              </Button>
            </Link>
          </div>

          <div className="group relative flex flex-col bg-gradient-to-b from-primary to-primary/90 shadow-[var(--shadow-hover)] hover:shadow-[0_14px_32px_-12px_hsl(var(--primary)/0.4)] p-4 sm:p-5 border-2 border-primary rounded-xl overflow-hidden text-primary-foreground transition-all hover:-translate-y-0.5 duration-300 ease-out">
            <div className="-top-8 absolute bg-white/10 group-hover:bg-white/15 blur-2xl rounded-full w-28 h-28 group-hover:scale-110 transition-all duration-500 pointer-events-none -end-8" />

            <div className="top-0 absolute start-0">
              <span className="inline-block bg-primary-foreground shadow-sm px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-tl-xl rounded-br-lg font-bold text-[10px] text-primary sm:text-[11px] tracking-wide">
                {t("pricing_recommended")}
              </span>
            </div>

            <div className="relative pt-3 sm:pt-4">
              <h3 className="font-semibold text-white text-sm sm:text-base md:text-lg">
                {t("plan_paid_title")}
              </h3>

              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-2">
                <span className="font-outfit font-bold text-2xl sm:text-3xl md:text-4xl">
                  {t("plan_paid_price")}
                </span>
                <span className="text-[11px] text-primary-foreground/80 sm:text-xs md:text-sm">
                  {t("plan_paid_unit")}
                </span>
              </div>

              <p className="mt-1.5 text-[11px] text-primary-foreground/90 sm:text-xs md:text-sm leading-snug">
                {t("plan_paid_desc")}
              </p>
            </div>

            <div className="relative bg-primary-foreground/10 group-hover:bg-primary-foreground/15 mt-3 p-2.5 sm:p-3 border border-primary-foreground/20 group-hover:border-primary-foreground/30 rounded-lg transition-colors duration-300">
              <div className="flex items-start gap-2">
                <span className="flex justify-center items-center bg-primary-foreground/15 rounded-full w-4 sm:w-5 h-4 sm:h-5 shrink-0">
                  <Info className="opacity-90 w-2.5 sm:w-3 h-2.5 sm:h-3" />
                </span>
                <p className="text-[11px] sm:text-xs md:text-sm leading-snug">
                  {t("calc_example_1")}
                </p>
              </div>
            </div>

            <ul className="relative flex-1 space-y-1.5 mt-3 mb-4">
              {[
                t("Unlimited property listings"),
                t("Advanced client tracking"),
                t("Full team management"),
                t("Revenue & commission analytics"),
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="flex justify-center items-center bg-primary-foreground/15 mt-0.5 rounded-full w-4 h-4 shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span className="text-[11px] sm:text-xs md:text-sm leading-snug">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <Link href="/company/login" className="relative mt-auto">
              <Button
                variant="secondary"
                className="hover:bg-white shadow-md hover:shadow-lg group-hover:shadow-lg rounded-lg w-full h-9 sm:h-10 font-semibold text-primary text-xs sm:text-sm hover:scale-[1.01] transition-all duration-300"
              >
                {t("hero_cta")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
