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
      <div className="relative flex sm:flex-row flex-col sm:justify-between sm:items-start gap-4 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent px-5 sm:px-6 py-5 border-border/50 border-b">
        <div
          className="top-0 absolute inset-x-0 bg-gradient-to-r from-primary to-primary/40 h-1"
          aria-hidden
        />
        <div className="flex items-start gap-3 min-w-0">
          {Icon ? (
            <span className="flex justify-center items-center bg-primary/10 mt-0.5 rounded-xl w-10 h-10 text-primary shrink-0">
              <Icon className="w-5 h-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-outfit font-semibold text-foreground text-lg tracking-tight">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? (
          <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
            {action}
          </div>
        ) : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
};
