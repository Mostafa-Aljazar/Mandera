"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SettingsTableShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Consistent bordered, horizontally scrollable table wrapper for settings lists. */
export default function SettingsTableShell({
  children,
  className,
}: SettingsTableShellProps) {
  return (
    <div
      className={cn(
        "border border-border/50 rounded-xl overflow-hidden",
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
