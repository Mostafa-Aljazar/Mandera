"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import {
  ArrowUpRight,
  MapPin,
  Maximize,
  BedDouble,
  Bath,
  Building2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import { propertyDisplayTitle } from "@/components/company/properties/LinkedPropertyCard";
import type { PropertyWithRelations as Property } from "@/types/supabase-entities.types";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80";

const STATUS_STYLES: Record<string, string> = {
  Available:
    "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-200",
  Sold: "bg-sky-500/15 text-sky-800 border-sky-500/30 dark:text-sky-200",
  Rented:
    "bg-violet-500/15 text-violet-800 border-violet-500/30 dark:text-violet-200",
  Hold: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200",
  "Deal Completed":
    "bg-slate-500/15 text-slate-800 border-slate-500/30 dark:text-slate-200",
};

interface PropertyCardProps {
  property: Property;
  onView: (property: Property) => void;
}

export default function PropertyCard({ property, onView }: PropertyCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const imageUrl = property.images?.length
    ? property.images[0]
    : FALLBACK_IMAGE;

  const currentStatus = property.status || "Available";
  const statusStyle =
    STATUS_STYLES[currentStatus] || STATUS_STYLES.Available;

  const title =
    propertyDisplayTitle(property, language) || t("Untitled property");
  const hasArabicTitle = Boolean(property.title_ar?.trim());
  const titleIsArabic = language === "ar" && hasArabicTitle;

  const areaName =
    property.area_district_ref?.name ||
    property.area ||
    (property.emirate ? t(property.emirate) : "") ||
    t("Location not set");

  const propertyTypeName =
    language === "ar"
      ? property.property_type?.name_ar || property.property_type?.name_en
      : property.property_type?.name_en || property.property_type?.name_ar;

  const employeeRecord = property.employee?.employee_record;
  const employeeName =
    employeeDisplayName(
      employeeRecord,
      language,
      property.employee?.name,
    ) || t("Unassigned");
  const employeeAvatar = employeeRecord?.avatar_url || null;
  const employeeInitial = (employeeName || "?").charAt(0).toUpperCase();
  const employeeNameIsArabic =
    language === "ar" &&
    Boolean(
      employeeRecord?.first_name_ar?.trim() ||
        employeeRecord?.last_name_ar?.trim(),
    );

  const sizeValue = property.building_area || property.land_area;
  const isSale = property.listing_type === "Sale";
  const listingLabel = isSale ? t("For Sale") : t("For Rent");
  const hasPrice = property.price != null && Number(property.price) > 0;

  const specs = [
    property.bedrooms
      ? { icon: BedDouble, value: property.bedrooms, label: t("Beds") }
      : null,
    property.bathrooms
      ? { icon: Bath, value: property.bathrooms, label: t("Baths") }
      : null,
    sizeValue
      ? { icon: Maximize, value: sizeValue, label: t("sqft") }
      : null,
  ].filter(Boolean) as {
    icon: typeof BedDouble;
    value: string | number;
    label: string;
  }[];

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onView(property)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(property);
        }
      }}
      className={cn(
        "group flex flex-col bg-card border border-border/60 rounded-2xl h-full overflow-hidden",
        "shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] hover:border-primary/25",
        "transition-all duration-300 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
      )}
    >
      <div className="relative bg-muted aspect-[16/10] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none"
          aria-hidden
        />

        <div className="top-3 start-3 absolute flex flex-wrap items-center gap-1.5 max-w-[65%]">
          <Badge
            className={cn(
              "shadow-sm border-0 font-medium text-[11px]",
              isSale
                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                : "bg-sky-600 text-white hover:bg-sky-600",
            )}
          >
            {listingLabel}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "shadow-sm backdrop-blur-md bg-background/90 font-medium text-[11px]",
              statusStyle,
            )}
          >
            {t(currentStatus)}
          </Badge>
        </div>

        {property.code ? (
          <div className="top-3 end-3 absolute">
            <Badge
              variant="outline"
              className="bg-background/90 shadow-sm backdrop-blur-sm font-mono text-[11px]"
            >
              <bdi dir="ltr">{property.code}</bdi>
            </Badge>
          </div>
        ) : null}

        <div className="bottom-3 inset-x-3 absolute">
          <p className="font-outfit font-bold text-white text-xl sm:text-2xl tracking-tight drop-shadow-sm">
            {hasPrice ? (
              <bdi dir="ltr" className="inline-flex items-baseline gap-1.5">
                <DirhamIcon
                  className="relative top-px w-[0.9em] h-[0.9em] opacity-95"
                  title={t("AED")}
                />
                <span>{formatAedAmount(property.price)}</span>
                {!isSale ? (
                  <span className="font-medium text-white/80 text-xs sm:text-sm">
                    / {t("month")}
                  </span>
                ) : null}
              </bdi>
            ) : (
              <span className="font-semibold text-base">
                {t("Price on request")}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-3.5 p-4 sm:p-5 text-start">
        <div className="space-y-1.5 min-w-0">
          {propertyTypeName ? (
            <p className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              <Building2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span className="truncate">{propertyTypeName}</span>
            </p>
          ) : null}

          <div className="flex items-start gap-2">
            <h3
              className="flex-1 min-w-0 font-outfit font-semibold text-foreground text-base sm:text-[1.05rem] leading-snug line-clamp-2 group-hover:text-primary transition-colors"
              lang={titleIsArabic ? "ar" : "en"}
            >
              <bdi dir={titleIsArabic ? "rtl" : "ltr"}>{title}</bdi>
            </h3>
            <span className="inline-flex justify-center items-center bg-muted/70 group-hover:bg-primary/10 mt-0.5 rounded-full w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-muted-foreground text-sm min-w-0">
            <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate">
              <bdi>{areaName}</bdi>
            </span>
          </p>
        </div>

        {specs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {specs.map(({ icon: Icon, value, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-lg text-muted-foreground text-xs"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <bdi dir="ltr" className="font-semibold text-foreground tabular-nums">
                  {value}
                </bdi>
                <span>{label}</span>
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex justify-between items-center gap-3 mt-auto pt-3 border-border/50 border-t">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex justify-center items-center bg-primary/10 rounded-full w-9 h-9 font-semibold text-primary text-xs shrink-0 overflow-hidden ring-1 ring-primary/15">
              {employeeAvatar ? (
                <img
                  src={employeeAvatar}
                  alt={employeeName}
                  className="w-full h-full object-cover"
                />
              ) : (
                employeeInitial
              )}
            </span>
            <div className="min-w-0 text-start">
              <p className="flex items-center gap-1 text-muted-foreground text-[11px] leading-none">
                <UserRound className="w-3 h-3 shrink-0" />
                {t("Assigned agent")}
              </p>
              <p
                className="mt-1 font-medium text-foreground text-sm truncate"
                lang={employeeNameIsArabic ? "ar" : "en"}
              >
                <bdi dir={employeeNameIsArabic ? "rtl" : "ltr"}>
                  {employeeName}
                </bdi>
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 bg-primary/10 group-hover:bg-primary px-2.5 py-1.5 rounded-lg font-medium text-primary group-hover:text-primary-foreground text-xs whitespace-nowrap transition-colors shrink-0">
            {t("View details")}
            <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
          </span>
        </div>
      </div>
    </article>
  );
}
