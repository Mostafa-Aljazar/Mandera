"use client";

import { useTranslation } from "react-i18next";
import { steps } from "@/components/landing/constants";
import SectionHeader from "@/components/landing/SectionHeader";

export default function StepsSection() {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="bg-muted/30 py-20 md:py-24">
      <div className="mx-auto px-4 container">
        <SectionHeader
          label={t("landing_steps_label")}
          title={t("landing_steps_title")}
          subtitle={t("landing_steps_subtitle")}
        />

        <div className="relative mx-auto max-w-6xl">
          <div
            className="hidden lg:block top-10 absolute bg-border h-px start-[12.5%] end-[12.5%]"
            aria-hidden
          />

          <div className="gap-6 lg:gap-5 grid sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ num, icon: Icon, titleKey, descKey }) => (
              <div
                key={num}
                className="relative flex flex-col bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] p-6 border border-border/70 rounded-xl h-full transition-shadow"
              >
                <div className="flex justify-between items-center gap-3 mb-5">
                  <div className="flex justify-center items-center bg-primary shadow-sm rounded-lg w-11 h-11 text-primary-foreground">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-outfit font-bold text-primary/20 text-3xl leading-none">
                    {num}
                  </span>
                </div>
                <h3 className="font-outfit font-semibold text-foreground text-lg">
                  {t(titleKey)}
                </h3>
                <p className="flex-1 mt-2 text-muted-foreground text-sm leading-relaxed">
                  {t(descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
