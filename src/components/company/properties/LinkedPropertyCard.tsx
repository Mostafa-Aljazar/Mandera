"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Property } from "@/types/supabase-entities.types";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&auto=format&fit=crop&q=80";

function propertyDisplayTitle(
  prop: Pick<Property, "title" | "title_ar">,
  language: string,
): string {
  if (language === "ar") {
    return prop.title_ar || prop.title || "";
  }
  return prop.title || prop.title_ar || "";
}

function looksLikeId(value: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ) || /^[0-9a-f]{24,}$/i.test(value)
  );
}

function propertyLocation(
  prop: Pick<Property, "area_district" | "area" | "emirate">,
): string {
  const parts = [prop.area, prop.emirate, prop.area_district]
    .map((v) => (v || "").trim())
    .filter((v) => v && !looksLikeId(v));
  return [...new Set(parts)].join(", ");
}

interface LinkedPropertyCardProps {
  property: Property;
  className?: string;
}

export default function LinkedPropertyCard({
  property,
  className,
}: LinkedPropertyCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const isSale = property.listing_type === "Sale";
  const title = propertyDisplayTitle(property, language) || t("Unnamed");
  const location = propertyLocation(property);
  const imageUrl = property.images?.[0] || FALLBACK_IMAGE;

  return (
    <Link
      href={`/company/properties/${property.id}`}
      className={cn(
        "group @container/linked-property relative flex flex-col @[300px]/linked-property:flex-row",
        "bg-card hover:bg-muted/30 border border-border/60 hover:border-primary/30",
        "rounded-2xl overflow-hidden shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)]",
        "transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <div className="relative w-full @[300px]/linked-property:w-[128px] aspect-[16/10] @[300px]/linked-property:aspect-auto @[300px]/linked-property:self-stretch shrink-0 overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full min-h-[112px] @[300px]/linked-property:min-h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent @[300px]/linked-property:hidden pointer-events-none" />
        <Badge
          variant="outline"
          className={cn(
            "top-2 start-2 absolute shadow-sm backdrop-blur-md text-[10px] px-1.5 py-0 h-5 font-medium border",
            isSale
              ? "bg-emerald-500/90 text-white border-emerald-400/40"
              : "bg-sky-500/90 text-white border-sky-400/40",
          )}
        >
          {isSale ? t("For Sale") : t("For Rent")}
        </Badge>
      </div>

      <div className="flex flex-col flex-1 gap-2 p-3.5 sm:p-4 min-w-0 text-start">
        <div className="flex items-center gap-2">
          <p
            className="min-w-0 font-mono font-semibold text-primary text-[11px] tracking-wide truncate"
            dir="ltr"
          >
            {property.code}
          </p>
          <span className="inline-flex justify-center items-center bg-muted/70 group-hover:bg-primary/10 ms-auto rounded-full w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
            <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
          </span>
        </div>

        <h3
          className="font-semibold text-foreground group-hover:text-primary text-sm sm:text-[15px] leading-snug line-clamp-2 text-start transition-colors"
          lang={isRtl && property.title_ar ? "ar" : "en"}
        >
          {title}
        </h3>

        {location ? (
          <p className="flex justify-start items-center gap-1.5 text-muted-foreground text-xs min-w-0">
            <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate text-start">{location}</span>
          </p>
        ) : null}

        {/* Price stays LTR internally; block sits at reading-start (right in RTL). */}
        <div className="mt-auto pt-1 self-start">
          <p
            className="inline-flex items-center gap-1.5 font-outfit font-bold text-foreground text-base sm:text-lg tracking-tight"
            dir="ltr"
          >
            <DirhamIcon className="w-[0.95em] h-[0.95em]" title={t("AED")} />
            <span>{formatAedAmount(property.price)}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
