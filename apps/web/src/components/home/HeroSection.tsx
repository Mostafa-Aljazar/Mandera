"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { heroHighlights, LOGO_URL } from "@/components/home/constants";

export default function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative flex flex-col justify-center bg-gradient-to-b from-background via-background to-muted/40 border-border/50 border-b min-h-0 md:min-h-[calc(100vh-68px)] overflow-hidden">
      <div className="absolute inset-0 pattern-grid-lg bg-primary/[0.04] opacity-40 mix-blend-multiply" />

      <div className="z-10 relative mx-auto px-4 py-16 md:py-10 container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center bg-card shadow-[var(--shadow-subtle)] px-4 py-1.5 border border-primary/15 rounded-full font-medium text-primary text-sm">
            <ShieldCheck className="me-2 w-4 h-4" />
            {t("hero_badge")}
          </div>

          <div className="flex justify-center mt-8">
            <img
              src={LOGO_URL}
              alt={t("platformName")}
              className="w-auto h-16 md:h-20"
            />
          </div>

          <h1 className="mt-8 font-outfit font-bold text-foreground text-3xl md:text-5xl text-balance leading-[1.12] tracking-tight">
            {t("hero_title")}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground text-lg md:text-xl leading-relaxed">
            {t("hero_subtitle")}
          </p>

          <div className="mt-9">
            <Link href="/company-login">
              <Button
                size="lg"
                className="shadow-[var(--shadow-hover)] hover:shadow-lg px-8 rounded-lg min-w-[220px] h-12 font-semibold text-base transition-shadow"
              >
                {t("hero_cta")}
                <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
              </Button>
            </Link>
          </div>

          <div className="bg-card shadow-[var(--shadow-subtle)] mx-auto mt-10 border border-border/70 rounded-xl max-w-xl overflow-hidden">
            <div className="grid grid-cols-3 divide-x rtl:divide-x-reverse divide-border/70">
              {heroHighlights.map(({ icon: Icon, labelKey }) => (
                <div
                  key={labelKey}
                  className="flex flex-col items-center gap-2 px-3 sm:px-4 py-4 text-center"
                >
                  <div className="flex justify-center items-center bg-primary/10 rounded-md w-9 h-9 text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-foreground/90 text-xs sm:text-sm">
                    {t(labelKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
