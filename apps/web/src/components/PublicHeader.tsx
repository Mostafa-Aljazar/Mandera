"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { Globe, LayoutDashboard, LogIn } from "lucide-react";

const LOGO_URL =
  "https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png";

const PublicHeader = () => {
  const { isAuthenticated } = useCompanyAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const homeNavLinks = [
    { href: "/#how-it-works", label: t("landing_steps_label") },
    { href: "/#features", label: t("landing_features_label") },
    { href: "/#pricing", label: t("nav_pricing") },
  ];

  const loginHref = isAuthenticated ? "/company-dashboard" : "/company-login";
  const loginLabel = isAuthenticated ? t("Dashboard") : t("Company Login");
  const nextLanguageLabel =
    language === "ar" ? t("language_switch_en") : t("language_switch_ar");
  const nextLanguageShort = language === "ar" ? "EN" : "ع";

  return (
    <header className="top-0 z-50 sticky bg-background/85 supports-[backdrop-filter]:bg-background/75 backdrop-blur-md border-border/50 border-b">
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-r from-transparent via-primary/70 to-transparent h-px pointer-events-none"
        aria-hidden
      />

      <div className="mx-auto px-4 container">
        <div className="flex justify-between items-center gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] h-[68px]">
          <Link
            href="/"
            className="group flex items-center gap-2.5 min-w-0 shrink-0"
          >
            <span className="flex justify-center items-center bg-primary/[0.08] group-hover:bg-primary/[0.12] border border-primary/10 group-hover:border-primary/20 rounded-xl w-10 h-10 transition-colors">
              <img
                src={LOGO_URL}
                alt={t("platformName")}
                className="w-auto h-7 object-contain"
              />
            </span>
            <span className="sm:hidden font-outfit font-bold text-foreground text-base truncate tracking-tight">
              {t("platformNameShort")}
            </span>
            <span className="hidden sm:block font-outfit font-bold text-foreground text-lg truncate tracking-tight">
              {t("platformName")}
            </span>
          </Link>

          {isHome ? (
            <nav
              className="hidden lg:flex items-center gap-0.5 bg-muted/50 shadow-[var(--shadow-subtle)] p-1 border border-border/60 rounded-full"
              aria-label="Main"
            >
              {homeNavLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="hover:bg-background/80 px-4 py-2 rounded-full font-medium text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="hidden lg:block" aria-hidden />
          )}

          <div className="flex justify-end items-center gap-1 sm:gap-2">
            {!isHome ? (
              <Link
                href="/"
                className="hidden md:inline px-3 py-2 font-medium text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                {t("Home")}
              </Link>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-1 px-2 sm:px-2.5 h-9 text-muted-foreground hover:text-foreground"
              aria-label={nextLanguageLabel}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-sm leading-none">
                {nextLanguageShort}
              </span>
            </Button>

            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/90 shadow-[var(--shadow-subtle)] hover:shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.35)] px-3.5 sm:px-5 rounded-full h-9 font-semibold text-xs sm:text-sm hover:-translate-y-px transition-all duration-200"
            >
              <Link href={loginHref} className="gap-1.5">
                {isAuthenticated ? (
                  <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                ) : (
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 rtl:rotate-180" />
                )}
                <span className="max-w-[7.5rem] sm:max-w-none truncate">
                  {loginLabel}
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
