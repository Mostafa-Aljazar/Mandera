"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function SettingsSection({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden",
        className,
      )}
    >
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4 px-4 sm:px-6 py-4 sm:py-5 border-border/50 border-b">
        <div className="flex items-start gap-3 min-w-0">
          {Icon ? (
            <span className="flex justify-center items-center bg-muted rounded-xl w-9 h-9 sm:w-10 sm:h-10 text-foreground/70 shrink-0">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
            {action}
          </div>
        ) : null}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
