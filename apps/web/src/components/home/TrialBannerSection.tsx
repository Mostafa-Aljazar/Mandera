"use client";

import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function TrialBannerSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-background py-16 md:py-20">
      <div className="mx-auto px-4 container">
        <div className="relative bg-card shadow-[var(--shadow-subtle)] mx-auto border border-border/60 rounded-2xl max-w-2xl overflow-hidden">
          <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-transparent via-primary to-transparent h-1" />

          <div className="space-y-8 px-8 md:px-12 py-10 md:py-12 text-center">
            <div className="space-y-3">
              <h2 className="font-outfit font-bold text-foreground text-2xl md:text-3xl tracking-tight">
                <span className="text-primary">14</span>{" "}
                {t("trial_banner_title_suffix")}
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                {t("plan_trial_desc")}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {t("trial_banner_register")}
              </p>

              <div className="flex sm:flex-row flex-col sm:justify-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="justify-start gap-3 px-4 py-3 border-border/70 rounded-xl w-full sm:w-auto sm:min-w-[240px] h-auto min-h-11"
                  asChild
                >
                  <a
                    href="https://wa.me/971502048865"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="flex justify-center items-center bg-[#25D366]/10 rounded-md w-9 h-9 text-[#1a9e4b] shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 rtl:text-right text-start">
                      <span className="block text-muted-foreground text-xs">
                        {t("trial_banner_whatsapp")}
                      </span>
                      <span className="block font-semibold text-foreground">
                        971502048865
                      </span>
                    </span>
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="justify-start gap-3 px-4 py-3 border-border/70 rounded-xl w-full sm:w-auto sm:min-w-[240px] h-auto min-h-11"
                  asChild
                >
                  <a href="mailto:info@mandera.site">
                    <span className="flex justify-center items-center bg-primary/10 rounded-md w-9 h-9 text-primary shrink-0">
                      <Mail className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 rtl:text-right text-start">
                      <span className="block text-muted-foreground text-xs">
                        {t("Email")}
                      </span>
                      <span className="block font-semibold text-foreground">
                        info@mandera.site
                      </span>
                    </span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
