"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Smartphone, Check } from "lucide-react";

const highlights = ["Properties", "Clients", "Dashboard"] as const;

const storeButtonClass =
  "inline-flex h-11 w-full max-w-[172px] items-center gap-2.5 rounded-lg border px-3.5 transition-all duration-300 sm:w-[172px]";

function GooglePlayBadge({ label, title }: { label: string; title: string }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3.5 2.5C3.2 2.7 3 3.1 3 3.6v16.8c0 .5.2.9.5 1.1l.1.1 9.4-9.4v-.2L3.6 2.4l-.1.1z"
          fill="#00e676"
        />
        <path
          d="M13 12v-.2l3.1-3.1 1 .6 2.9 1.6c.9.5.9 1.3 0 1.8l-2.9 1.6-1 .6-3.1-3.1V12z"
          fill="#ffea00"
        />
        <path
          d="M13 12.2l-9.5 9.5c.3.3.7.3 1.2 0L16.1 15 13 12.2z"
          fill="#ff2a2a"
        />
        <path
          d="M13 11.8L16.1 9l-11.4-6.6c-.5-.3-.9-.3-1.2 0L13 11.8z"
          fill="#29b6f6"
        />
      </svg>
      <span className="min-w-0 rtl:text-right text-start">
        <span className="block opacity-90 font-medium text-[9px] leading-none tracking-wide">
          {label}
        </span>
        <span className="block mt-0.5 font-semibold text-sm leading-none">
          {title}
        </span>
      </span>
    </>
  );
}

function AppStoreBadge({ label, title }: { label: string; title: string }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 text-white shrink-0"
        fill="currentColor"
      >
        <path d="M16.175 10.371c-.046-2.559 2.083-3.812 2.179-3.874-1.196-1.745-3.056-1.982-3.717-2.012-1.585-.16-3.096.936-3.899.936-.803 0-2.056-.913-3.371-.888-1.705.025-3.278.991-4.153 2.518-1.776 3.076-.454 7.625 1.278 10.126.845 1.222 1.841 2.593 3.149 2.543 1.258-.05 1.745-.815 3.267-.815 1.509 0 1.961.815 3.279.79 1.358-.025 2.213-1.247 3.045-2.456 1.01-1.468 1.425-2.894 1.442-2.969-.033-.016-2.775-1.066-2.822-3.924C15.82 12.067 16.175 10.371 16.175 10.371M14.975 4.908c.691-.837 1.156-2.002 1.029-3.158-1.014.041-2.227.674-2.934 1.502-.559.646-1.118 1.834-.974 2.973 1.135.088 2.188-.479 2.879-1.317" />
      </svg>
      <span className="min-w-0 rtl:text-right text-start">
        <span className="block opacity-90 font-medium text-[9px] leading-none">
          {label}
        </span>
        <span className="block mt-0.5 font-semibold text-sm leading-none">
          {title}
        </span>
      </span>
    </>
  );
}

function PhoneMockup() {
  return (
    <div className="relative shrink-0">
      <div className="absolute inset-4 bg-white/10 blur-xl rounded-[1.5rem] pointer-events-none" />
      <div className="relative flex flex-col items-center bg-background shadow-[0_14px_36px_-12px_rgba(0,0,0,0.4)] border-[3px] border-primary-foreground/25 rounded-[1.25rem] w-[108px] sm:w-[116px] lg:w-[122px] aspect-[9/18] overflow-hidden">
        <div className="top-0 absolute inset-x-0 bg-muted mx-auto rounded-b-md w-[42%] h-3.5" />
        <img
          src="https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/5fba707efa6344304a51c6d02e75286d.png"
          alt="MANDERA CRM App"
          className="opacity-95 mt-9 w-11 sm:w-12 lg:w-[3.25rem]"
        />
        <div className="space-y-1 mt-auto mb-5 px-4 sm:px-5 w-full">
          <div className="bg-primary/15 rounded-full w-full h-1" />
          <div className="bg-primary/10 rounded-full w-4/5 h-1" />
          <div className="bg-muted rounded-full w-3/5 h-1" />
        </div>
      </div>
    </div>
  );
}

export default function AndroidAppSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-background py-12 md:py-14">
      <div className="mx-auto px-4 container">
        <div className="group relative bg-gradient-to-br from-primary via-primary to-primary/90 shadow-[var(--shadow-hover)] hover:shadow-[0_20px_44px_-14px_hsl(var(--primary)/0.42)] mx-auto border border-primary/20 rounded-2xl max-w-5xl overflow-hidden text-primary-foreground transition-all duration-300">
          <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-primary-foreground/15 via-primary-foreground/80 to-primary-foreground/15 h-px" />
          <div className="-top-20 absolute bg-white/10 blur-3xl rounded-full w-48 h-48 group-hover:scale-110 transition-transform duration-500 pointer-events-none -end-20" />
          <div className="-bottom-24 absolute bg-white/5 blur-3xl rounded-full w-40 h-40 pointer-events-none -start-16" />

          <div className="relative items-center gap-8 md:gap-8 lg:gap-10 grid md:grid-cols-[minmax(0,1fr)_auto] p-6 sm:p-7 md:px-10">
            <div className="flex flex-col md:justify-center items-center md:items-start gap-2 text-center rtl:md:text-right md:text-start">
              <span className="inline-flex items-center bg-primary-foreground/10 px-3 py-1 border border-primary-foreground/20 rounded-full font-semibold text-[11px] sm:text-xs">
                <Smartphone className="me-1.5 w-3.5 h-3.5 shrink-0" />
                {t("Mobile Experience")}
              </span>

              <h2 className="mt-3 max-w-md font-bold lg:text-[1.65rem] text-xl sm:text-2xl text-balance tracking-tight">
                {t("Android App Available")}
              </h2>

              <p className="mt-2 lg:max-w-md max-w-lg text-primary-foreground/85 text-xs sm:text-sm leading-relaxed">
                {t(
                  "Manage your CRM system on the go. Download the dedicated Android app to access all features from your mobile device easily and efficiently.",
                )}
              </p>

              <ul className="flex flex-wrap justify-center rtl:md:justify-end md:justify-start gap-2 mt-4">
                {highlights.map((key) => (
                  <li
                    key={key}
                    className="inline-flex items-center gap-1 bg-primary-foreground/10 px-2.5 py-1 border border-primary-foreground/15 rounded-full font-medium text-[11px] sm:text-xs"
                  >
                    <Check className="opacity-90 w-3 h-3 shrink-0" />
                    {t(key)}
                  </li>
                ))}
              </ul>

              <div className="flex sm:justify-center md:justify-start items-center gap-2.5 mt-5 w-full max-w-[360px] md:max-w-none">
                <button
                  type="button"
                  className={`${storeButtonClass} border-white/25 bg-black text-white shadow-sm hover:scale-[1.02] hover:border-white/40 hover:bg-black/90 hover:shadow-md`}
                >
                  <GooglePlayBadge label={t("GET IT ON")} title="Google Play" />
                </button>

                <div className="relative w-full sm:w-[172px] max-w-[172px]">
                  <span className="-top-2.5 z-10 absolute bg-background shadow-sm px-2 py-0.5 border border-border rounded-md font-semibold text-[10px] text-foreground end-2">
                    {t("Coming Soon")}
                  </span>
                  <div
                    className={`${storeButtonClass} cursor-not-allowed border-white/10 bg-black/55 text-white opacity-85`}
                  >
                    <AppStoreBadge
                      label={t("Download on the")}
                      title="App Store"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-1 md:justify-center md:items-center lg:pe-1">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
