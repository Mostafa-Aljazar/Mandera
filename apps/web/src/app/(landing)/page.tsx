"use client";

import DocumentHead from "@/components/DocumentHead";
import AndroidAppSection from "@/components/AndroidAppSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HeroSection from "@/components/home/HeroSection";
import PricingSection from "@/components/home/PricingSection";
import StepsSection from "@/components/home/StepsSection";
import TrialBannerSection from "@/components/home/TrialBannerSection";
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
