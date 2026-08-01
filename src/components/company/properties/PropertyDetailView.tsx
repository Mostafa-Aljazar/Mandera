"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProperty, useDeleteProperty, useUpdatePropertyDocuments } from "@/hooks/queries/useProperties";
import { usePropertyPublications } from "@/hooks/queries/usePortalPublishing";
import { amenityI18nKey } from "@/lib/portals/amenities";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  canPublishToPortals,
  canViewRevenue,
  isAdministratorOrAbove,
  canAccessManagerModules,
  canOpenPropertyEditor,
  canLockRecords,
  canEditApprovedPropertyDirectly,
} from "@/lib/permissions";
import { usePendingStatusChangeRequestForProperty } from "@/hooks/queries/usePropertyApprovals";
import DocumentHead from "@/components/common/DocumentHead";
import PropertyForm from "./PropertyForm";
import PropertyApprovalActions from "./PropertyApprovalActions";
import PublishToPortalsModal from "./PublishToPortalsModal";
import StatusHistoryDisplay from "@/components/common/StatusHistoryDisplay";
import StatusUpdateModal from "@/components/common/StatusUpdateModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Share2,
  Upload,
  Loader2,
  MapPin,
  Maximize,
  BedDouble,
  Bath,
  Phone,
  Mail,
  MessageCircle,
  Sofa,
  Check,
  ChevronRight,
  Home,
  Key,
  Building2,
  Tag,
  User,
  Video,
  Banknote,
  FileText,
  EyeOff,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { employeeDisplayName, titleCaseName } from "@/lib/bilingualLabel";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import type { Portal } from "@/types/supabase-entities.types";

const STATUS_TONE: Record<string, string> = {
  Available: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  Sold: "bg-red-500/10 text-red-700 border-red-500/25",
  Rented: "bg-sky-500/10 text-sky-700 border-sky-500/25",
  Hold: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  "Deal Completed": "bg-primary/10 text-primary border-primary/25",
};

const PUB_TONE: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  failed: "bg-red-500/10 text-red-700 border-red-500/25",
  unpublished: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
};

const PORTAL_LABEL_KEY: Record<Portal, string> = {
  bayut: "Bayut",
  dubizzle: "Dubizzle",
  propertyfinder: "PropertyFinder",
};

interface Props {
  propertyId?: string;
}

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-b border-border/60 bg-muted/25">
        <h2 className="font-outfit text-[15px] font-semibold tracking-tight flex items-center gap-2">
          {Icon ? <Icon className="w-4 h-4 text-primary" /> : null}
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function PropertyDetailView({ propertyId }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { currentUser, company } = useCompanyAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreate = !propertyId;
  const defaultListingType =
    searchParams.get("listingType") === "Sale" ? "Sale" : "Rent";
  const canDelete = isAdministratorOrAbove(currentUser?.role);
  const canSeeCommission = canViewRevenue(currentUser?.role);
  const canCompleteDeal = canAccessManagerModules(currentUser?.role);

  const { data: property, isLoading, refetch } = useProperty(propertyId);
  const { data: publications } = usePropertyPublications(propertyId);
  const deleteMutation = useDeleteProperty();
  const updateDocuments = useUpdatePropertyDocuments();
  const { data: pendingStatusRequest, refetch: refetchPendingStatus } =
    usePendingStatusChangeRequestForProperty(propertyId, company?.id);

  const canManageDocs = canEditApprovedPropertyDirectly(currentUser?.role);
  const canEditProperty =
    canOpenPropertyEditor(
      currentUser?.role,
      property?.employee_id,
      currentUser?.id,
      property?.approval_status,
    ) &&
    (!property?.is_locked || canLockRecords(currentUser?.role));

  const [isEditing, setIsEditing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const showPublish =
    canPublishToPortals(currentUser?.role) &&
    property?.approval_status === "approved" &&
    !property?.paused_at;

  const primary = (en?: string | null, ar?: string | null) =>
    language === "ar" ? ar || en || "" : en || ar || "";

  const handleDelete = async () => {
    if (!propertyId) return;
    if (!window.confirm(t("Delete this property? This cannot be undone."))) return;
    const result = await deleteMutation.mutateAsync(propertyId);
    if (result.error) {
      toast.error(t("Error deleting property."));
      return;
    }
    toast.success(t("Property deleted."));
    router.push("/company/properties");
  };

  if (isCreate) {
    return (
      <div className="pb-28 sm:pb-14">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.09] via-transparent to-primary/[0.03]"
            aria-hidden
          />
          <div
            className="absolute inset-0 pattern-grid-lg opacity-30"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 py-5 sm:py-8 container max-w-6xl">
            <Link
              href="/company/properties"
              className="inline-flex items-center gap-1.5 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("Back to Properties")}
            </Link>

            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-2xl text-start">
                <Badge
                  variant="secondary"
                  className="mb-3 bg-primary/10 hover:bg-primary/10 border-primary/15 text-primary gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {t("Portal-ready listing")}
                </Badge>
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl lg:text-4xl tracking-tight">
                  {t("Add Property")}
                </h1>
                <p className="mt-2 text-muted-foreground text-sm sm:text-[15px] leading-relaxed">
                  {t(
                    "Complete all required fields so this property can be published to Bayut, dubizzle and PropertyFinder.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-5 sm:py-7 container max-w-6xl">
          <PropertyForm
            mode="create"
            defaultListingType={defaultListingType}
            onSaved={(id) => router.push(`/company/properties/${id}`)}
            onCancel={() => router.push("/company/properties")}
          />
        </div>
      </div>
    );
  }

  if (isLoading || !property) {
    return (
      <div className="container mx-auto px-4 max-w-6xl py-8 space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[22rem] w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isEditing && canEditProperty) {
    return (
      <div className="pb-28 sm:pb-14">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.09] via-transparent to-primary/[0.03]"
            aria-hidden
          />
          <div
            className="absolute inset-0 pattern-grid-lg opacity-30"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 py-5 sm:py-8 container max-w-6xl">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t("Cancel")}
            </button>

            <div className="min-w-0 max-w-2xl text-start">
              <Badge
                variant="secondary"
                className="mb-3 bg-primary/10 hover:bg-primary/10 border-primary/15 text-primary gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("Edit Property")}
              </Badge>
              <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl tracking-tight">
                {t("Edit Property")}
              </h1>
              <p className="mt-2 font-mono text-sm text-muted-foreground" dir="ltr">
                {property.code}
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-5 sm:py-7 container max-w-6xl">
          <PropertyForm
            mode="edit"
            property={property}
            onSaved={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  const images = (property.images ?? []) as string[];
  const hero = activeImage ?? images[0] ?? null;
  const isRent = property.listing_type === "Rent";
  const title = primary(property.title, property.title_ar);
  const description = primary(property.description, property.description_ar);
  const note = primary(property.note_en, property.note_ar);
  const amenities = property.amenities ?? [];
  const videoUrls = (property.video_urls ?? []).filter(Boolean);
  const floorPlanUrls = (property.floor_plan_urls ?? []).filter(Boolean);

  const locationParts = [
    property.city,
    property.locality ?? property.area_district_ref?.name,
    property.sub_locality,
    property.tower_name,
  ].filter(Boolean) as string[];
  const locationFallback = [property.emirate, property.area].filter(Boolean) as string[];
  const locationTrail = locationParts.length > 0 ? locationParts : locationFallback;

  // Compact facts — only filled values, never stretch empty
  const facts: { icon: React.ElementType; label: string; value: string }[] = [];
  if (property.property_type) {
    facts.push({
      icon: Home,
      label: t("Property Type"),
      value: primary(property.property_type.name_en, property.property_type.name_ar),
    });
  }
  if (property.bedrooms) {
    facts.push({
      icon: BedDouble,
      label: t("Bedrooms"),
      value: property.bedrooms.toLowerCase() === "studio" ? t("studio") : property.bedrooms,
    });
  }
  if (property.bathrooms) {
    facts.push({ icon: Bath, label: t("Bathrooms"), value: property.bathrooms });
  }
  if (property.building_area) {
    facts.push({
      icon: Maximize,
      label: t("Area"),
      value: `${Number(property.building_area).toLocaleString()} ${t("sqft")}`,
    });
  }
  if (property.furnishing) {
    facts.push({ icon: Sofa, label: t("Furnishing"), value: t(property.furnishing) });
  }

  const detailRows = [
    { label: t("Reference"), value: property.code },
    { label: t("Emirate"), value: property.emirate ? t(property.emirate) : null },
    {
      label: t("Land Area"),
      value: property.land_area
        ? `${Number(property.land_area).toLocaleString()} ${t("sqft")}`
        : null,
    },
    {
      label: t("Building Area (sqft)"),
      value: property.building_area
        ? `${Number(property.building_area).toLocaleString()} ${t("sqft")}`
        : null,
    },
    { label: t("Off-plan property"), value: property.is_off_plan ? t("Yes") : null },
    {
      label: t("Project Status"),
      value: property.project_status ? t(property.project_status) : null,
    },
    {
      label: t("Rent Frequency"),
      value: isRent && property.rent_frequency ? t(property.rent_frequency) : null,
    },
    { label: t("Permit Type"), value: property.permit_type?.toUpperCase() },
    { label: t("Advertising Permit Number"), value: property.advertising_permit_number || null },
    { label: t("License Number"), value: property.issuing_license_number || null },
    ...(canSeeCommission
      ? [
          {
            label: t("Commission %"),
            value: property.commission_percentage
              ? `${property.commission_percentage}%`
              : null,
          },
        ]
      : []),
  ].filter((r) => r.value);

  const agentPhone = property.employee?.employee_record?.phone;
  const agentEmail = property.employee?.employee_record?.email;
  const employeeRecord = (() => {
    const raw = property.employee?.employee_record as
      | NonNullable<typeof property.employee>["employee_record"]
      | NonNullable<typeof property.employee>["employee_record"][]
      | null
      | undefined;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] ?? null : raw;
  })();
  const agentName = titleCaseName(
    employeeDisplayName(employeeRecord, language, property.employee?.name) ||
      property.employee?.name ||
      "",
  );
  const ownerName = (() => {
    const owner = property.owner;
    if (!owner) return "";
    const raw =
      language === "ar"
        ? owner.name_ar?.trim() ||
          owner.name_en?.trim() ||
          owner.name?.trim() ||
          ""
        : owner.name_en?.trim() ||
          owner.name_ar?.trim() ||
          owner.name?.trim() ||
          "";
    // Keep API mask intact (e.g. "أحمد *****") — don't title-case asterisks.
    if (property.owner_masked) return raw;
    return titleCaseName(raw);
  })();
  const hasSideThumbs = images.length > 1;

  return (
    <div className="pb-14">
      <DocumentHead
        title={`${title || property.code} | MANDERA CRM`}
        description={description || undefined}
      />

      {/* Toolbar */}
      <div className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 max-w-6xl py-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/company/properties">
            <Button variant="ghost" size="sm" className="-ms-2 h-9 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
              {t("Back to Properties")}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {canCompleteDeal &&
            property.approval_status === "approved" &&
            property.status !== "Sold" &&
            property.status !== "Rented" ? (
              <Button asChild size="sm" variant="secondary" className="h-9 rounded-lg">
                <Link href={`/company/revenue/new?propertyId=${property.id}`}>
                  <Banknote className="w-4 h-4 me-2" />
                  {t("Add Deal")}
                </Link>
              </Button>
            ) : null}
            {showPublish ? (
              <Button onClick={() => setPublishOpen(true)} size="sm" className="h-9 rounded-lg">
                <Share2 className="w-4 h-4 me-2" />
                {t("Publish to Portals")}
              </Button>
            ) : null}
            {canEditProperty ? (
              <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 me-2" />
                {t("Edit")}
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl pt-6 sm:pt-8">
        <div className="mb-5">
          <PropertyApprovalActions property={property} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 lg:items-start">
          {/* ===================== MAIN ===================== */}
          <div className="lg:col-span-8 space-y-5">
            {/* Gallery + overview as one composition */}
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
              {/* Media */}
              <div className="bg-muted/40 p-1.5 space-y-1.5">
                <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                  {hero ? (
                    <img src={hero} alt={title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                      {t("No images")}
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute top-3 start-3 flex flex-wrap gap-1.5">
                    <Badge className="bg-background/95 text-foreground border-0 shadow-sm gap-1 backdrop-blur">
                      {isRent ? <Key className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                      {isRent ? t("For Rent") : t("For Sale")}
                    </Badge>
                    {property.is_off_plan && (
                      <Badge className="bg-primary text-primary-foreground border-0 shadow-sm">
                        {t("Off-plan property")}
                      </Badge>
                    )}
                  </div>
                  <div className="absolute top-3 end-3 flex gap-1.5">
                    {images.length > 0 && (
                      <Badge className="bg-black/60 text-white border-0 tabular-nums" dir="ltr">
                        {images.length} {t("photos")}
                      </Badge>
                    )}
                    {property.status && (
                      <Badge
                        variant="outline"
                        className={cn("bg-background/95 backdrop-blur shadow-sm", STATUS_TONE[property.status])}
                      >
                        {t(property.status)}
                      </Badge>
                    )}
                  </div>
                </div>

                {hasSideThumbs && (
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                    {images.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setActiveImage(url)}
                        className={cn(
                          "relative h-16 w-20 sm:h-[4.5rem] sm:w-24 shrink-0 overflow-hidden rounded-lg transition-all",
                          hero === url
                            ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                            : "opacity-70 hover:opacity-100",
                        )}
                      >
                        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Overview body */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                    dir="ltr"
                  >
                    {property.code}
                  </span>
                  {property.status && (
                    <Badge variant="outline" className={cn("text-[11px]", STATUS_TONE[property.status])}>
                      {t(property.status)}
                    </Badge>
                  )}
                </div>

                <div>
                  <h1 className="font-outfit text-2xl sm:text-[1.75rem] font-extrabold tracking-tight leading-snug text-foreground">
                    {title || property.code}
                  </h1>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <p className="font-outfit text-[1.75rem] sm:text-3xl font-bold text-primary tabular-nums tracking-tight">
                    {property.price != null && Number(property.price) > 0 ? (
                      <bdi
                        dir="ltr"
                        className="inline-flex items-baseline gap-1.5"
                      >
                        <DirhamIcon
                          className="relative top-px w-[0.85em] h-[0.85em]"
                          title={t("AED")}
                        />
                        <span>{formatAedAmount(property.price)}</span>
                        {isRent && property.rent_frequency ? (
                          <span className="ms-0.5 text-sm font-medium text-muted-foreground">
                            / {t(property.rent_frequency)}
                          </span>
                        ) : null}
                      </bdi>
                    ) : (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {t("Price on request")}
                      </span>
                    )}
                  </p>
                </div>

                {locationTrail.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex flex-wrap items-center gap-1">
                      {locationTrail.map((part, i) => (
                        <span key={`${part}-${i}`} className="inline-flex items-center gap-1">
                          <span>{part}</span>
                          {i < locationTrail.length - 1 && (
                            <ChevronRight className="w-3.5 h-3.5 opacity-40 rtl:rotate-180" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compact facts as chips — never empty full-width bar */}
                {facts.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {facts.map((f) => {
                      const Icon = f.icon;
                      return (
                        <div
                          key={f.label}
                          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm"
                        >
                          <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">{f.value}</span>
                          <span className="text-[11px] text-muted-foreground">{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Description — current app language only */}
            {description ? (
              <Section title={t("Description")}>
                <div
                  className="space-y-3.5 text-start"
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  {description
                    .trim()
                    .split(/\n\s*\n/)
                    .map((block) => block.replace(/\n+/g, " ").trim())
                    .filter(Boolean)
                    .map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-[15px] leading-[1.85] text-foreground/80 text-justify [text-align-last:start]"
                      >
                        {paragraph}
                      </p>
                    ))}
                </div>
              </Section>
            ) : null}

            {/* Internal notes — current app language only */}
            {note ? (
              <Section title={t("Internal notes")}>
                <div
                  className="space-y-3.5 text-start"
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  {note
                    .trim()
                    .split(/\n\s*\n/)
                    .map((block) => block.replace(/\n+/g, " ").trim())
                    .filter(Boolean)
                    .map((paragraph, index) => (
                      <p
                        key={index}
                        className="text-[15px] leading-[1.85] text-foreground/80 text-justify [text-align-last:start]"
                      >
                        {paragraph}
                      </p>
                    ))}
                </div>
              </Section>
            ) : null}

            {/* Amenities */}
            {amenities.length > 0 && (
              <Section title={t("Amenities")}>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {amenities.map((slug) => (
                    <li key={slug} className="flex items-center gap-2.5 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                      </span>
                      <span>{t(amenityI18nKey(slug))}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Video & Floor Plans (Bayut/dubizzle) */}
            {(videoUrls.length > 0 || floorPlanUrls.length > 0) && (
              <Section title={t("Property Video")}>
                {videoUrls.length > 0 && (
                  <ul className="space-y-2">
                    {videoUrls.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          dir="ltr"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all"
                        >
                          <Video className="w-4 h-4 shrink-0" />
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {floorPlanUrls.length > 0 && (
                  <div className={cn(videoUrls.length > 0 && "mt-4 pt-4 border-t border-border/50")}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t("Floor Plans")}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {floorPlanUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg overflow-hidden border aspect-square block"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Details */}
            {detailRows.length > 0 && (
              <Section title={t("Property Details")} icon={Building2}>
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <dl className="grid grid-cols-1 sm:grid-cols-2">
                    {detailRows.map((row, i) => (
                      <div
                        key={row.label}
                        className={cn(
                          "flex items-center justify-between gap-3 px-4 py-3",
                          i % 2 === 0 ? "sm:border-e border-border/60" : "",
                          "border-b border-border/60 last:border-b-0",
                          // kill bottom border on last two when even count
                          detailRows.length % 2 === 0 && i >= detailRows.length - 2
                            ? "sm:border-b-0"
                            : "",
                          detailRows.length % 2 === 1 && i === detailRows.length - 1
                            ? "border-b-0 sm:col-span-2 sm:border-e-0"
                            : "",
                        )}
                      >
                        <dt className="text-sm text-muted-foreground">{row.label}</dt>
                        <dd className="text-sm font-semibold text-foreground text-end">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Section>
            )}

            {(canManageDocs && !property.owner_masked) ||
            ((property.document_urls?.length ?? 0) > 0 &&
              !property.owner_masked) ? (
              <Section title={t("Property documents")} icon={FileText}>
                <ul className="space-y-2">
                  {(property.document_urls ?? []).map((url, index) => (
                    <li
                      key={url}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline break-all min-w-0"
                      >
                        {t("Document")} {index + 1}
                      </a>
                      {canManageDocs &&
                      (!property.is_locked ||
                        canLockRecords(currentUser?.role)) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={updateDocuments.isPending}
                          onClick={async () => {
                            if (!company?.id || !propertyId) return;
                            const keepUrls = (property.document_urls ?? []).filter(
                              (u) => u !== url,
                            );
                            const result = await updateDocuments.mutateAsync({
                              propertyId,
                              companyId: company.id,
                              keepUrls,
                            });
                            if (result.error) {
                              toast.error(result.error);
                              return;
                            }
                            toast.success(t("Document deleted"));
                            void refetch();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canManageDocs &&
                (!property.is_locked || canLockRecords(currentUser?.role)) ? (
                  <div className="mt-3">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm font-medium cursor-pointer hover:bg-muted/50 transition-colors">
                      {updateDocuments.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {t("Upload documents")}
                      <input
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                        disabled={updateDocuments.isPending}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          e.target.value = "";
                          if (!files.length || !company?.id || !propertyId) return;
                          const result = await updateDocuments.mutateAsync({
                            propertyId,
                            companyId: company.id,
                            keepUrls: property.document_urls ?? [],
                            newFiles: files,
                          });
                          if (result.error) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success(t("Document added"));
                          void refetch();
                        }}
                      />
                    </label>
                  </div>
                ) : null}
              </Section>
            ) : null}
          </div>

          {/* ===================== SIDEBAR (not sticky) ===================== */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Publishing */}
            <Section
              title={t("Publishing")}
              icon={Tag}
              action={
                showPublish ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-md text-xs"
                    onClick={() => setPublishOpen(true)}
                  >
                    {t("Manage")}
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {t("Approve before publishing")}
                  </span>
                )
              }
            >
              <div className="space-y-2">
                {(Object.keys(PORTAL_LABEL_KEY) as Portal[]).map((portal) => {
                  const pub = (publications ?? []).find((p) => p.platform === portal);
                  const status = pub?.status ?? "draft";
                  return (
                    <div
                      key={portal}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2.5"
                    >
                      <span className="text-sm font-medium">{t(PORTAL_LABEL_KEY[portal])}</span>
                      <Badge variant="outline" className={cn("text-[10px] capitalize", PUB_TONE[status])}>
                        {t(status)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Agent */}
            {agentName ? (
              <Section title={t("Listing Agent")} icon={User}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-outfit text-base font-bold overflow-hidden">
                    {employeeRecord?.avatar_url ? (
                      <img
                        src={employeeRecord.avatar_url}
                        alt={agentName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      agentName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="font-semibold truncate leading-tight"
                      dir="auto"
                    >
                      {agentName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("Assigned Agent")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      href: agentPhone ? `tel:${agentPhone}` : undefined,
                      icon: Phone,
                      label: t("Call"),
                      color: "text-primary",
                      enabled: !!agentPhone,
                    },
                    {
                      href: agentPhone
                        ? `https://wa.me/${agentPhone.replace(/[^0-9]/g, "")}`
                        : undefined,
                      icon: MessageCircle,
                      label: t("WhatsApp"),
                      color: "text-emerald-600",
                      enabled: !!agentPhone,
                      external: true,
                    },
                    {
                      href: agentEmail ? `mailto:${agentEmail}` : undefined,
                      icon: Mail,
                      label: t("Email"),
                      color: "text-sky-600",
                      enabled: !!agentEmail,
                    },
                  ].map((a) => {
                    const Icon = a.icon;
                    return (
                      <a
                        key={a.label}
                        href={a.href}
                        target={a.external ? "_blank" : undefined}
                        rel={a.external ? "noreferrer" : undefined}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border border-border/70 px-1.5 py-2.5 text-[11px] font-medium transition-colors",
                          a.enabled
                            ? "hover:bg-muted/70 hover:border-primary/25 text-foreground"
                            : "opacity-35 pointer-events-none",
                        )}
                      >
                        <Icon className={cn("w-4 h-4", a.color)} />
                        {a.label}
                      </a>
                    );
                  })}
                </div>
              </Section>
            ) : null}

            {/* Owner */}
            {property.owner && ownerName ? (
              <Section
                title={t("Owner")}
                icon={User}
                action={
                  property.owner_masked ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-800 text-[10px] font-medium"
                    >
                      <EyeOff className="w-3 h-3" />
                      {t("Hidden")}
                    </Badge>
                  ) : null
                }
              >
                {property.owner_masked ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-outfit text-base font-bold">
                        {ownerName.charAt(0)}
                        <span className="absolute -bottom-0.5 -end-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-amber-500 text-white">
                          <Shield className="w-2.5 h-2.5" />
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p
                          className="font-semibold truncate leading-tight select-none tracking-wide"
                          dir="auto"
                        >
                          {ownerName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t("Contact details restricted")}
                        </p>
                      </div>
                    </div>

                    {property.owner.phone ? (
                      <div
                        className="flex items-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/30 px-3 py-2.5 select-none pointer-events-none"
                        dir="ltr"
                        aria-hidden
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background border border-border/60 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-mono text-sm tracking-wider text-muted-foreground">
                          {property.owner.phone}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3">
                      <EyeOff className="mt-0.5 w-4 h-4 shrink-0 text-amber-700" />
                      <p className="text-xs leading-relaxed text-amber-950/80">
                        {t(
                          "Owner contact is hidden for unassigned properties",
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-outfit text-base font-bold">
                        {ownerName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/company/owners/${property.owner.id}`}
                          className="font-semibold truncate leading-tight hover:text-primary transition-colors block"
                          dir="auto"
                        >
                          {ownerName}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t("Property owner")}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {property.owner.phone ? (
                        <a
                          href={`tel:${property.owner.phone}`}
                          className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2.5 text-sm hover:bg-muted/70 hover:border-primary/25 transition-colors"
                          dir="ltr"
                        >
                          <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{property.owner.phone}</span>
                        </a>
                      ) : null}
                      {property.owner.email ? (
                        <a
                          href={`mailto:${property.owner.email}`}
                          className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2.5 text-sm hover:bg-muted/70 hover:border-primary/25 transition-colors min-w-0"
                          dir="ltr"
                        >
                          <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="truncate">{property.owner.email}</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}
              </Section>
            ) : null}

            {/* Status update + timeline */}
            <div className="space-y-4">
              {pendingStatusRequest ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-3 text-start">
                  <p className="text-sm font-semibold text-amber-950">
                    {t("Final status change awaiting approval")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                    <span className="text-muted-foreground">
                      {t(pendingStatusRequest.previous_status)}
                    </span>
                    <span className="mx-1.5 text-muted-foreground" aria-hidden>
                      →
                    </span>
                    <span className="font-medium text-amber-950">
                      {t(pendingStatusRequest.new_status)}
                    </span>
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {t(
                      "The live listing status stays unchanged until an administrator approves this request.",
                    )}
                  </p>
                </div>
              ) : null}
              {canEditProperty ? (
                <StatusUpdateModal
                  entityType="property"
                  entityData={property}
                  onSuccess={() => {
                    setHistoryRefreshTrigger((n) => n + 1);
                    void refetch();
                    void refetchPendingStatus();
                  }}
                />
              ) : null}
              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <StatusHistoryDisplay
                  entityType="property"
                  entityId={property.id}
                  refreshTrigger={historyRefreshTrigger}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <PublishToPortalsModal
        property={property}
        isOpen={publishOpen && showPublish}
        onClose={() => setPublishOpen(false)}
      />
    </div>
  );
}
