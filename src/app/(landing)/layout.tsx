"use client";

import PublicHeader from "@/components/common/PublicHeader";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <LandingFooter />
    </div>
  );
}
