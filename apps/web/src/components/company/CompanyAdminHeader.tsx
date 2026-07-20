"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  Banknote,
  Globe,
  LayoutDashboard,
  Home,
  Users,
  Briefcase,
  Building2,
  Settings,
  Menu,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const LOGO_URL =
  "https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  superAdminOnly?: boolean;
}

export default function CompanyAdminHeader() {
  const { logout, company, currentUser } = useCompanyAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = () => {
    setNavOpen(false);
    logout();
    router.push("/company/login");
  };

  const isSuperAdmin = currentUser?.role === "company_super_admin";

  const navItems: NavItem[] = [
    {
      href: "/company/dashboard",
      label: t("company_nav_dashboard"),
      icon: LayoutDashboard,
      match: (path: string) =>
        path === "/company/dashboard" || path === "/company/dashboard/",
    },
    {
      href: "/company/properties",
      label: t("Properties"),
      icon: Home,
      match: (path: string) => path.startsWith("/company/properties"),
    },
    {
      href: "/company/clients",
      label: t("Clients"),
      icon: Users,
      match: (path: string) => path.startsWith("/company/clients"),
    },
    {
      href: "/company/owners",
      label: t("Owners"),
      icon: Briefcase,
      match: (path: string) => path.startsWith("/company/owners"),
    },
    {
      href: "/company/employees",
      label: t("Employees"),
      icon: Building2,
      match: (path: string) => path.startsWith("/company/employees"),
      superAdminOnly: true,
    },
    {
      href: "/company/revenue",
      label: t("Revenue"),
      icon: Banknote,
      match: (path: string) => path.startsWith("/company/revenue"),
      superAdminOnly: true,
    },
    {
      href: "/company/settings",
      label: t("Company Settings"),
      icon: Settings,
      match: (path: string) => path.startsWith("/company/settings"),
      superAdminOnly: true,
    },
  ].filter((item) => !item.superAdminOnly || isSuperAdmin);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const drawerSide = language === "ar" ? "right" : "left";

  return (
    <>
      <header className="top-0 z-50 sticky bg-background/85 supports-[backdrop-filter]:bg-background/75 backdrop-blur-md border-border/50 border-b">
        <div
          className="top-0 absolute inset-x-0 bg-gradient-to-r from-transparent via-primary/70 to-transparent h-px pointer-events-none"
          aria-hidden
        />

        <div className="mx-auto px-4 container">
          <div className="flex justify-between items-center gap-3 h-[68px]">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/company/dashboard"
                className="group flex items-center gap-2.5 min-w-0 shrink-0"
              >
                <span className="flex justify-center items-center bg-primary/[0.08] group-hover:bg-primary/[0.12] border border-primary/10 group-hover:border-primary/20 rounded-xl w-10 h-10 transition-colors">
                  <img
                    src={LOGO_URL}
                    alt={t("platformName")}
                    className="w-auto h-7 object-contain"
                  />
                </span>
                <span className="hidden sm:block font-outfit font-bold text-foreground text-lg truncate tracking-tight">
                  {t("platformName")}
                </span>
              </Link>

              {company ? (
                <div className="hidden md:block ps-3 border-border/60 border-s min-w-0">
                  <p className="font-medium text-foreground/80 text-sm truncate max-w-[12rem] lg:max-w-[16rem]">
                    {company.company_name}
                  </p>
                </div>
              ) : null}
            </div>

            <nav className="hidden lg:flex items-center gap-0.5 bg-muted/50 shadow-[var(--shadow-subtle)] p-1 border border-border/60 rounded-full">
              {navItems.map(({ href, label, match }) => {
                const active = match(pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "inline-flex items-center px-3 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="rounded-lg h-9 text-muted-foreground hover:text-foreground"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">
                  {language === "ar" ? "English" : "العربية"}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden lg:inline-flex rounded-lg h-9"
              >
                <LogOut className="w-4 h-4 rtl:rotate-180" />
                <span className="hidden sm:inline">{t("Logout")}</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="lg:hidden rounded-lg w-9 h-9"
                onClick={() => setNavOpen(true)}
                aria-label={t("Open menu")}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side={drawerSide}
          className="flex flex-col gap-0 p-0 w-[min(100vw-1rem,20rem)] sm:max-w-xs [&>button]:end-4 [&>button]:start-auto"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("Navigation")}</SheetTitle>
            <SheetDescription>{t("company_mobile_nav_desc")}</SheetDescription>
          </SheetHeader>

          <div className="relative px-5 pt-6 pb-5 border-border/60 border-b overflow-hidden">
            <div
              className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.08] to-transparent h-24 pointer-events-none"
              aria-hidden
            />
            <div className="relative flex items-center gap-3">
              <span className="flex justify-center items-center bg-primary/10 border border-primary/15 rounded-xl w-11 h-11 shrink-0">
                <img
                  src={LOGO_URL}
                  alt={t("platformName")}
                  className="w-auto h-7 object-contain"
                />
              </span>
              <div className="min-w-0">
                <p className="font-outfit font-bold text-foreground text-base truncate tracking-tight">
                  {t("platformName")}
                </p>
                {company ? (
                  <p className="mt-0.5 font-medium text-muted-foreground text-sm truncate">
                    {company.company_name}
                  </p>
                ) : null}
                {currentUser?.name ? (
                  <p className="mt-1 text-muted-foreground text-xs truncate">
                    {currentUser.name}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <p className="px-3 mb-2 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">
              {t("Navigation")}
            </p>
            <ul className="space-y-1">
              {navItems.map(({ href, label, icon: Icon, match }) => {
                const active = match(pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setNavOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/85 hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex justify-center items-center border rounded-lg w-9 h-9 shrink-0 transition-colors",
                          active
                            ? "bg-primary/15 border-primary/20 text-primary"
                            : "bg-muted/50 border-border/60 text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 truncate">{label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60 rtl:rotate-180 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto px-4 py-4 border-border/60 border-t">
            <Button
              variant="outline"
              className="justify-start gap-3 hover:bg-destructive/5 px-3 border-destructive/20 rounded-xl w-full h-11 font-medium text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <span className="flex justify-center items-center bg-destructive/10 rounded-lg w-9 h-9 shrink-0">
                <LogOut className="w-4 h-4 rtl:rotate-180" />
              </span>
              {t("Logout")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
