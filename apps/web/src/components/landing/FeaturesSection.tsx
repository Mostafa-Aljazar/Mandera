"use client";

import SectionBadge from "@/components/common/SectionBadge";
import { useTranslation } from "react-i18next";
import { featureBlocks } from "@/components/landing/constants";

export default function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section id="features" className="bg-background py-12 md:py-16">
      <div className="mx-auto px-4 container">
        <div className="mx-auto mb-8 md:mb-10 max-w-2xl text-center">
          <SectionBadge>{t("landing_features_label")}</SectionBadge>
          <h2 className="mt-4 font-outfit font-bold text-2xl md:text-3xl text-balance tracking-tight">
            {t("landing_features_title")}
          </h2>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            {t("landing_features_subtitle")}
          </p>
        </div>

        <div className="space-y-10 md:space-y-12 mx-auto max-w-5xl">
          {featureBlocks.map(
            ({
              step,
              icon: Icon,
              titleKey,
              descKey,
              image,
              imageAlt,
              reverse,
            }) => (
              <div
                key={step}
                className="items-start gap-5 md:gap-6 lg:gap-8 grid md:grid-cols-2"
              >
                <div className={`space-y-3 ${reverse ? "md:order-2" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-outfit font-bold text-primary text-sm tracking-widest">
                      {step}
                    </span>
                    <div className="flex-1 bg-border/80 h-px" />
                  </div>
                  <div className="flex justify-center items-center bg-primary/10 border border-primary/15 rounded-lg w-10 h-10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-outfit font-bold text-xl md:text-2xl lg:text-3xl text-balance tracking-tight">
                    {t(titleKey)}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                    {t(descKey)}
                  </p>
                </div>

                <div
                  className={`relative w-full overflow-hidden rounded-xl border border-border/60 shadow-[var(--shadow-subtle)] ${
                    reverse ? "md:order-1" : ""
                  }`}
                >
                  <div className="w-full max-h-[180px] md:max-h-none aspect-[16/10]">
                    <img
                      src={image}
                      alt={imageAlt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent pointer-events-none" />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
