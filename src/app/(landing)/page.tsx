"use client";

import DocumentHead from "@/components/common/DocumentHead";
import AndroidAppSection from "@/components/landing/AndroidAppSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HeroSection from "@/components/landing/HeroSection";
import PricingSection from "@/components/landing/PricingSection";
import StepsSection from "@/components/landing/StepsSection";
import TrialBannerSection from "@/components/landing/TrialBannerSection";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <DocumentHead title={t("platformName")} description={t("hero_subtitle")} />

      <main>
        <HeroSection />
        <StepsSection />
        <FeaturesSection />
        <TrialBannerSection />
        <PricingSection />
        <AndroidAppSection />
      </main>
    </>
  );
}
