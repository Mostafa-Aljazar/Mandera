"use client";

import { Helmet } from "react-helmet";
import PublicHeader from "@/components/PublicHeader";
import AndroidAppSection from "@/components/AndroidAppSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import HeroSection from "@/components/home/HeroSection";
import LandingFooter from "@/components/home/LandingFooter";
import PricingSection from "@/components/home/PricingSection";
import StepsSection from "@/components/home/StepsSection";
import TrialBannerSection from "@/components/home/TrialBannerSection";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("platformName")}</title>
        <meta name="description" content={t("hero_subtitle")} />
      </Helmet>

      <PublicHeader />

      <main>
        <HeroSection />
        <StepsSection />
        <FeaturesSection />
        <TrialBannerSection />
        <PricingSection />
        <AndroidAppSection />
      </main>

      <LandingFooter />
    </>
  );
}
