"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  usePropertyTypes,
  useOwnersLookup,
  useCompanyEmployeesLookup,
  useAreasDistrictsLookup,
  useCreateProperty,
  useUpdateProperty,
} from "@/hooks/queries/useProperties";
import { PropertySchema, type TPropertySchema } from "@/validations/property.schema";
import { PF_AMENITIES, amenityI18nKey } from "@/lib/portals/amenities";
import PfLocationPicker from "./PfLocationPicker";
import type { PropertyWithRelations } from "@/types/supabase-entities.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  UploadCloud,
  ChevronDown,
  CheckCircle2,
  Circle,
  AlertCircle,
  Globe,
  Building2,
  ImageIcon,
  FileCheck2,
  Plus,
  Trash2,
  Video,
  Layers,
  MapPinned,
  Home,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { employeeDisplayName } from "@/lib/bilingualLabel";

const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];
const STATUS_OPTIONS = ["Available", "Sold", "Rented", "Hold", "Deal Completed"];
const FURNISHING_OPTIONS = ["furnished", "semi-furnished", "unfurnished"];
const RENT_FREQUENCIES = ["yearly", "monthly", "weekly", "daily"];
const PERMIT_TYPES = ["rera", "dtcm", "adrec"];
const PROJECT_STATUSES = [
  "completed",
  "off_plan",
  "completed_primary",
  "off_plan_primary",
];
const MAX_IMAGES = 12;
const MAX_FLOOR_PLANS = 6;

const FIELD =
  "h-9 rounded-md bg-background border-input shadow-sm";

function FieldBlock({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5 text-start">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive ms-0.5">*</span> : null}
      </Label>
      {children}
      {hint && !error ? (
        <p className="text-[11px] text-muted-foreground/80 text-start">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-[11px] text-destructive text-start">{error}</p>
      ) : null}
    </div>
  );
}

function FormCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-xl overflow-hidden",
        className,
      )}
    >
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="-mx-4 sm:-mx-5 -mt-4 sm:-mt-5 mb-1 flex items-start gap-2.5 bg-muted/30 px-4 sm:px-5 py-3.5 border-border/50 border-b text-start">
      <span className="flex justify-center items-center bg-primary/10 rounded-lg w-7 h-7 text-primary shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 pt-0.5">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type ReadinessCheck = { key: string; label: string; portals: string; ok: boolean };

function ReadinessProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" dir="ltr">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-out",
          pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : "bg-amber-500",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PortalReadinessPanel({
  checks,
  done,
  total,
  ready,
  compact = false,
}: {
  checks: ReadinessCheck[];
  done: number;
  total: number;
  ready: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const pending = checks.filter((c) => !c.ok);
  const completed = checks.filter((c) => c.ok);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className={cn(
        "bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-xl overflow-hidden",
        compact && "border-0 shadow-none rounded-none bg-transparent",
      )}
    >
      {!compact ? (
        <div className="relative px-4 py-4 border-b border-border/50 overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 pointer-events-none",
              ready
                ? "bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent"
                : "bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent",
            )}
            aria-hidden
          />
          <div className="relative space-y-3 text-start">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex justify-center items-center rounded-xl w-10 h-10 shrink-0",
                  ready
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-primary/10 text-primary",
                )}
              >
                {ready ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <FileCheck2 className="w-5 h-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-outfit font-semibold text-sm text-foreground">
                      {t("Portal readiness")}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                      {ready
                        ? t("Ready to publish on all portals")
                        : t("Complete the checklist to publish")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "tabular-nums shrink-0 font-semibold",
                      ready
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                        : "bg-background text-foreground border-border/70",
                    )}
                    dir="ltr"
                  >
                    {pct}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground tabular-nums" dir="ltr">
                  {done} / {total}
                </span>
                <span className="font-medium text-foreground/80">
                  {ready
                    ? t("All set")
                    : t("{{count}} remaining", { count: total - done })}
                </span>
              </div>
              <ReadinessProgressBar done={done} total={total} />
            </div>

            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {["Bayut", "Dubizzle", "PropertyFinder"].map((portal) => (
                <span
                  key={portal}
                  className="inline-flex items-center rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {portal}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="p-3 space-y-3">
        {pending.length > 0 ? (
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700/80">
              {t("{{count}} remaining", { count: pending.length })}
            </p>
            <ul className="space-y-1">
              {pending.map((c) => (
                <li
                  key={c.key}
                  className="flex items-start gap-2.5 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-2.5 py-2 text-start"
                >
                  <Circle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600/70" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {c.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground" dir="ltr">
                      {c.portals}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {completed.length > 0 ? (
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
              {t("{{count}} completed", { count: completed.length })}
            </p>
            <ul className="space-y-0.5">
              {completed.map((c) => (
                <li
                  key={c.key}
                  className="flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-start"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/75 leading-snug">{c.label}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/80" dir="ltr">
                      {c.portals}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "px-3.5 py-3 border-t text-start",
          ready
            ? "border-emerald-500/20 bg-emerald-500/[0.06]"
            : "border-border/50 bg-muted/20",
        )}
      >
        {ready ? (
          <p className="flex items-start gap-2 text-xs text-emerald-800 leading-relaxed">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{t("This listing meets the requirements for Bayut, dubizzle and PropertyFinder.")}</span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
            <span>
              {t(
                "Fill all required fields to publish this listing to Bayut, dubizzle and PropertyFinder.",
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function defaultValues(
  property: PropertyWithRelations | null,
  fallbackListingType: string,
  currentUserId: string | undefined,
  isEmployee: boolean,
): TPropertySchema {
  if (property) {
    return {
      listing_type: property.listing_type,
      type: property.type,
      land_area: property.land_area ?? "",
      building_area: property.building_area ?? "",
      emirate: property.emirate || "Dubai",
      area_district: property.area_district || "",
      area: property.area || "",
      owner_id: property.owner_id,
      price: property.price,
      commission_percentage: property.commission_percentage ?? "",
      employee_id: property.employee_id,
      title: property.title,
      description: property.description || "",
      note_en: property.note_en || "",
      note_ar: property.note_ar || "",
      status: property.status || "Available",
      advertising_permit_number: property.advertising_permit_number || "",
      title_ar: property.title_ar || "",
      description_ar: property.description_ar || "",
      bedrooms: property.bedrooms || "",
      bathrooms: property.bathrooms || "",
      furnishing: property.furnishing || "",
      size_unit: property.size_unit || "SQFT",
      rent_frequency: property.rent_frequency || "",
      is_off_plan: property.is_off_plan ?? false,
      project_status: property.project_status || "",
      amenities: property.amenities ?? [],
      video_urls: property.video_urls ?? [],
      permit_type: property.permit_type || "",
      issuing_license_number: property.issuing_license_number || "",
      city: property.city || "",
      locality: property.locality || "",
      sub_locality: property.sub_locality || "",
      tower_name: property.tower_name || "",
      pf_location_id: property.pf_location_id ?? "",
      offplan_sale_type: property.offplan_sale_type || "",
      offplan_dld_waiver: property.offplan_dld_waiver ?? "",
      offplan_original_price: property.offplan_original_price ?? "",
      offplan_amount_paid: property.offplan_amount_paid ?? "",
      available_from: property.available_from || "",
      parking_slots: property.parking_slots ?? "",
    };
  }
  return {
    listing_type: fallbackListingType,
    type: "",
    land_area: "",
    building_area: "",
    emirate: "Dubai",
    area_district: "",
    area: "",
    owner_id: "",
    price: "",
    commission_percentage: "",
    employee_id: isEmployee ? (currentUserId ?? "") : "",
    title: "",
    description: "",
    note_en: "",
    note_ar: "",
    status: "Available",
    advertising_permit_number: "",
    title_ar: "",
    description_ar: "",
    bedrooms: "",
    bathrooms: "",
    furnishing: "",
    size_unit: "SQFT",
    rent_frequency: "",
    is_off_plan: false,
    project_status: "",
    amenities: [],
    video_urls: [],
    permit_type: "",
    issuing_license_number: "",
    city: "",
    locality: "",
    sub_locality: "",
    tower_name: "",
    pf_location_id: "",
    offplan_sale_type: "",
    offplan_dld_waiver: "",
    offplan_original_price: "",
    offplan_amount_paid: "",
    available_from: "",
    parking_slots: "",
  };
}

export interface PropertyFormProps {
  mode: "create" | "edit";
  property?: PropertyWithRelations | null;
  defaultListingType?: string;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}

export default function PropertyForm({
  mode,
  property = null,
  defaultListingType = "Rent",
  onSaved,
  onCancel,
}: PropertyFormProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { company, currentUser } = useCompanyAuth();
  const isEmployee = currentUser?.role === "company_employee";

  const typeLabel = (pt: { name_en: string; name_ar: string }) =>
    language === "ar" ? pt.name_ar || pt.name_en : pt.name_en || pt.name_ar;

  const form = useForm<TPropertySchema>({
    resolver: zodResolver(PropertySchema(t)),
    defaultValues: defaultValues(property, defaultListingType, currentUser?.id, isEmployee),
    mode: "onBlur",
  });
  const formData = form.watch();
  const errors = form.formState.errors;

  const TAB_FIELDS: Record<string, (keyof TPropertySchema)[]> = {
    basic: ["type", "title", "title_ar", "description", "description_ar", "owner_id", "employee_id", "price", "rent_frequency"],
    specs: ["bedrooms", "bathrooms", "furnishing", "building_area", "emirate", "city", "locality", "pf_location_id", "project_status", "offplan_sale_type", "offplan_dld_waiver", "offplan_original_price", "offplan_amount_paid"],
    media: [],
    compliance: ["permit_type", "advertising_permit_number"],
  };
  const tabHasError = (tab: keyof typeof TAB_FIELDS) =>
    TAB_FIELDS[tab].some((field) => Boolean(errors[field]));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagesFiles, setImagesFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    (property?.images ?? []) as string[],
  );
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = imagesFiles.map((f) => URL.createObjectURL(f));
    setNewImageUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [imagesFiles]);

  useEffect(() => {
    const combined = [...existingImageUrls, ...newImageUrls];
    setActiveImageUrl((prev) =>
      prev && combined.includes(prev) ? prev : combined[0] ?? null,
    );
  }, [existingImageUrls, newImageUrls]);

  // Bayut/dubizzle's <Floor_Plans> tag — same upload pattern as property images.
  const [floorPlanFiles, setFloorPlanFiles] = useState<File[]>([]);
  const [existingFloorPlanUrls, setExistingFloorPlanUrls] = useState<string[]>(
    (property?.floor_plan_urls ?? []) as string[],
  );
  const [newFloorPlanUrls, setNewFloorPlanUrls] = useState<string[]>([]);
  const floorPlanFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = floorPlanFiles.map((f) => URL.createObjectURL(f));
    setNewFloorPlanUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [floorPlanFiles]);

  const { data: typesData } = usePropertyTypes(company?.id);
  const types = typesData ?? [];
  const { data: ownersData } = useOwnersLookup(company?.id);
  const owners = ownersData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: areasData, isFetching: isLoadingAreas } = useAreasDistrictsLookup(
    company?.id,
    formData.emirate || undefined,
  );
  const areasDistricts = areasData ?? [];

  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();

  const imageCount = existingImageUrls.length + imagesFiles.length;
  const isRent = formData.listing_type === "Rent";

  const readiness = useMemo(() => {
    const checks: { key: string; label: string; portals: string; ok: boolean }[] = [
      { key: "title", label: `${t("Title")} (EN)`, portals: "Bayut · PF", ok: !!String(formData.title || "").trim() },
      { key: "title_ar", label: `${t("Title")} (AR)`, portals: "Bayut · PF", ok: !!String(formData.title_ar || "").trim() },
      { key: "description", label: `${t("Description")} (EN)`, portals: "Bayut · PF", ok: !!String(formData.description || "").trim() },
      { key: "description_ar", label: `${t("Description")} (AR)`, portals: "Bayut · PF", ok: !!String(formData.description_ar || "").trim() },
      { key: "type", label: t("Property Type"), portals: "Bayut · PF", ok: !!formData.type },
      { key: "price", label: t("Price"), portals: "Bayut · PF", ok: Number(formData.price) > 0 },
      { key: "building_area", label: t("Building Area"), portals: "Bayut · PF", ok: Number(formData.building_area) > 0 },
      { key: "bedrooms", label: t("Bedrooms"), portals: "Bayut · PF", ok: !!formData.bedrooms },
      { key: "bathrooms", label: t("Bathrooms"), portals: "Bayut · PF", ok: !!formData.bathrooms },
      { key: "furnishing", label: t("Furnishing"), portals: "Bayut · PF", ok: !!formData.furnishing },
      { key: "images", label: t("Images"), portals: "Bayut · PF", ok: imageCount > 0 },
      { key: "permit", label: t("Permit number"), portals: "Bayut · PF", ok: !!String(formData.advertising_permit_number || "").trim() },
      { key: "permit_type", label: t("Permit Type"), portals: "Bayut · PF", ok: !!formData.permit_type },
      { key: "city", label: t("City"), portals: "Bayut", ok: !!String(formData.city || "").trim() },
      { key: "locality", label: t("Locality"), portals: "Bayut", ok: !!String(formData.locality || "").trim() },
      { key: "pf_location", label: t("PropertyFinder map location"), portals: "PF", ok: !!formData.pf_location_id && Number(formData.pf_location_id) > 0 },
      {
        key: "rent_freq",
        label: t("Rent Frequency"),
        portals: "Bayut · PF",
        ok: !isRent || !!formData.rent_frequency,
      },
    ];
    const done = checks.filter((c) => c.ok).length;
    return { checks, done, total: checks.length, ready: done === checks.length };
  }, [formData, imageCount, isRent, t]);

  const handleEmirateChange = (value: string) => {
    form.setValue("emirate", value, { shouldValidate: true });
    form.setValue("area_district", "");
    if (!formData.city) form.setValue("city", value, { shouldValidate: true });
  };

  const toggleAmenity = (slug: string) => {
    const current = form.getValues("amenities") ?? [];
    form.setValue(
      "amenities",
      current.includes(slug) ? current.filter((a) => a !== slug) : [...current, slug],
      { shouldDirty: true },
    );
  };

  const addFilesRespectingLimit = (files: File[]) => {
    const remaining = MAX_IMAGES - existingImageUrls.length - imagesFiles.length;
    if (files.length > remaining) {
      toast.warning(t("Maximum 12 images allowed."));
      return;
    }
    setImagesFiles((prev) => [...prev, ...files]);
    setImageError(null);
  };

  const floorPlanCount = existingFloorPlanUrls.length + floorPlanFiles.length;

  const addFloorPlanFilesRespectingLimit = (files: File[]) => {
    const remaining = MAX_FLOOR_PLANS - floorPlanCount;
    if (files.length > remaining) {
      toast.warning(t("Maximum 6 floor plans allowed."));
      return;
    }
    setFloorPlanFiles((prev) => [...prev, ...files]);
  };

  const addVideoUrl = () => {
    form.setValue("video_urls", [...(formData.video_urls ?? []), ""], { shouldDirty: true });
  };
  const updateVideoUrl = (index: number, value: string) => {
    const next = [...(formData.video_urls ?? [])];
    next[index] = value;
    form.setValue("video_urls", next, { shouldDirty: true });
  };
  const removeVideoUrl = (index: number) => {
    form.setValue(
      "video_urls",
      (formData.video_urls ?? []).filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  const submit = form.handleSubmit(async (values) => {
    if (!company || !currentUser) return;
    if (imageCount < 1) {
      setImageError(t("At least one image is required"));
      toast.error(t("At least one image is required"));
      return;
    }
    setIsSubmitting(true);
    try {
      const finalEmployeeId =
        mode === "create" && isEmployee ? currentUser.id : values.employee_id;

      const portalPayload = {
        title_ar: values.title_ar || "",
        description_ar: values.description_ar || "",
        bedrooms: values.bedrooms || null,
        bathrooms: values.bathrooms || null,
        furnishing: values.furnishing || null,
        size_unit: values.size_unit || "SQFT",
        rent_frequency: values.rent_frequency || null,
        is_off_plan: !!values.is_off_plan,
        project_status: values.project_status || null,
        amenities: values.amenities ?? [],
        video_urls: (values.video_urls ?? []).map((u) => u.trim()).filter(Boolean),
        permit_type: values.permit_type || null,
        issuing_license_number: values.issuing_license_number || null,
        city: values.city || null,
        locality: values.locality || null,
        sub_locality: values.sub_locality || null,
        tower_name: values.tower_name || null,
        pf_location_id: values.pf_location_id ? Number(values.pf_location_id) : null,
        offplan_sale_type: values.offplan_sale_type || null,
        offplan_dld_waiver: values.offplan_dld_waiver !== "" ? Number(values.offplan_dld_waiver) : null,
        offplan_original_price:
          values.offplan_original_price !== "" ? Number(values.offplan_original_price) : null,
        offplan_amount_paid:
          values.offplan_amount_paid !== "" ? Number(values.offplan_amount_paid) : null,
        available_from: values.available_from || null,
        parking_slots: values.parking_slots !== "" ? Number(values.parking_slots) : null,
      };

      const basePayload = {
        listing_type: values.listing_type,
        type: values.type,
        land_area: values.land_area ? Number(values.land_area) : null,
        building_area: values.building_area ? Number(values.building_area) : null,
        emirate: values.emirate,
        area_district: values.area_district || null,
        area: values.area || "",
        owner_id: values.owner_id,
        price: Number(values.price),
        commission_percentage: values.commission_percentage
          ? Number(values.commission_percentage)
          : null,
        employee_id: finalEmployeeId,
        title: values.title,
        description: values.description || "",
        note_en: values.note_en || "",
        note_ar: values.note_ar || "",
        status: values.status || "Available",
        advertising_permit_number: values.advertising_permit_number || "",
        images: imagesFiles,
        floor_plans: floorPlanFiles,
        ...portalPayload,
      };

      if (mode === "edit" && property) {
        const result = await updateMutation.mutateAsync({
          id: property.id,
          companyId: company.id,
          ...basePayload,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Property updated."));
        onSaved?.(property.id);
      } else {
        const result = await createMutation.mutateAsync({
          companyId: company.id,
          companyCode: company.company_code,
          createdByUserId: currentUser.id,
          createdByName: currentUser.name || currentUser.email || "Unknown User",
          ...basePayload,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Property added successfully"));
        if (result.data) onSaved?.(result.data.id);
      }
    } catch (err) {
      console.error("Property Save Error:", err);
      toast.error((err as Error).message || t("Error saving property."));
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Form {...form}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Main form */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          <Tabs defaultValue="basic" className="flex flex-col">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 rounded-xl bg-muted/60 gap-0.5">
              <TabsTrigger
                value="basic"
                className="relative gap-1.5 rounded-lg data-[state=active]:shadow-sm py-2.5 text-xs sm:text-sm"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("Basic Info")}</span>
                {tabHasError("basic") && (
                  <span className="absolute top-1.5 end-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="specs"
                className="relative gap-1.5 rounded-lg data-[state=active]:shadow-sm py-2.5 text-xs sm:text-sm"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("Specs & Location")}</span>
                {tabHasError("specs") && (
                  <span className="absolute top-1.5 end-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="relative gap-1.5 rounded-lg data-[state=active]:shadow-sm py-2.5 text-xs sm:text-sm"
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("Media")}</span>
                {imageError && (
                  <span className="absolute top-1.5 end-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="compliance"
                className="relative gap-1.5 rounded-lg data-[state=active]:shadow-sm py-2.5 text-xs sm:text-sm"
              >
                <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("Compliance")}</span>
                {tabHasError("compliance") && (
                  <span className="absolute top-1.5 end-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Compact readiness strip — visible below the sidebar's breakpoint (lg) */}
            <details className="lg:hidden mt-4 rounded-xl border border-border/60 bg-card shadow-[var(--shadow-subtle)] overflow-hidden group">
              <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1 text-start">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-sm font-semibold truncate">
                        {t("Portal readiness")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "tabular-nums shrink-0",
                        readiness.ready
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                          : "bg-amber-500/10 text-amber-700 border-amber-500/25",
                      )}
                      dir="ltr"
                    >
                      {Math.round((readiness.done / Math.max(readiness.total, 1)) * 100)}%
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <ReadinessProgressBar done={readiness.done} total={readiness.total} />
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="border-t border-border/60">
                <PortalReadinessPanel
                  checks={readiness.checks}
                  done={readiness.done}
                  total={readiness.total}
                  ready={readiness.ready}
                  compact
                />
              </div>
            </details>

            {/* -------- BASIC -------- */}
            <TabsContent value="basic" className="mt-5 space-y-5">
              <FormCard>
                <SectionHeader
                  icon={Building2}
                  title={t("Basic Info")}
                  description={t("Listing type, title, description, owner and agent.")}
                />

                <div className="space-y-2.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {t("Listing Type")} <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {(
                      [
                        { value: "Sale", label: t("For Sale"), icon: Home },
                        { value: "Rent", label: t("For Rent"), icon: Key },
                      ] as const
                    ).map((opt) => {
                      const selected = formData.listing_type === opt.value;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={mode === "edit"}
                          onClick={() =>
                            form.setValue("listing_type", opt.value, {
                              shouldValidate: true,
                            })
                          }
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-start transition-colors",
                            selected
                              ? "border-primary/35 bg-primary/[0.05]"
                              : "border-border/60 bg-background hover:bg-muted/30",
                            mode === "edit" && "opacity-70 cursor-not-allowed",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                              selected
                                ? "bg-primary/15 text-primary"
                                : "bg-background text-muted-foreground",
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">
                              {opt.label}
                            </span>
                          </span>
                          {selected ? (
                            <CheckCircle2 className="absolute top-2.5 end-2.5 w-4 h-4 text-primary" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldBlock label={t("Property Type")} required error={errors.type?.message}>
                    <Select value={formData.type} onValueChange={(v) => form.setValue("type", v, { shouldValidate: true })}>
                      <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select Type")} /></SelectTrigger>
                      <SelectContent>
                        {types.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id}>{typeLabel(pt)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Status")}>
                    <Select value={formData.status} onValueChange={(v) => form.setValue("status", v)}>
                      <SelectTrigger className={FIELD}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>
                </div>

                {/* Bilingual title + description — required by Bayut & PropertyFinder */}
                <div className="rounded-lg border border-border/50 bg-muted/15 p-3.5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 text-start">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">{t("Bilingual listing content")}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {t("English and Arabic title & description are required for Bayut, dubizzle and PropertyFinder.")}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px]" dir="ltr">EN</Badge>
                      <Badge variant="outline" className="text-[10px]" dir="ltr">AR</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldBlock
                      label={`${t("Title")} (EN)`}
                      required
                      error={errors.title?.message}
                      hint={`${formData.title?.length || 0}/150`}
                    >
                      <Input
                        dir="ltr"
                        className={FIELD}
                        maxLength={150}
                        placeholder="e.g. Spacious 2BR apartment in Marina"
                        value={formData.title}
                        onChange={(e) => form.setValue("title", e.target.value, { shouldValidate: true })}
                      />
                    </FieldBlock>

                    <FieldBlock
                      label={`${t("Title")} (AR)`}
                      required
                      error={errors.title_ar?.message}
                      hint={`${formData.title_ar?.length || 0}/150`}
                    >
                      <Input
                        dir="rtl"
                        className={FIELD}
                        maxLength={150}
                        placeholder="مثال: شقة غرفتين فسيحة في المارينا"
                        value={formData.title_ar}
                        onChange={(e) => form.setValue("title_ar", e.target.value, { shouldValidate: true })}
                      />
                    </FieldBlock>

                    <FieldBlock
                      label={`${t("Description")} (EN)`}
                      required
                      error={errors.description?.message}
                      hint={`${formData.description?.length || 0}/2000`}
                    >
                      <Textarea
                        dir="ltr"
                        maxLength={2000}
                        className="min-h-[120px] resize-y rounded-md"
                        placeholder="Full English description for the portals…"
                        value={formData.description}
                        onChange={(e) => form.setValue("description", e.target.value, { shouldValidate: true })}
                      />
                    </FieldBlock>

                    <FieldBlock
                      label={`${t("Description")} (AR)`}
                      required
                      error={errors.description_ar?.message}
                      hint={`${formData.description_ar?.length || 0}/2000`}
                    >
                      <Textarea
                        dir="rtl"
                        maxLength={2000}
                        className="min-h-[120px] resize-y rounded-md"
                        placeholder="الوصف الكامل بالعربية للمنصات…"
                        value={formData.description_ar}
                        onChange={(e) => form.setValue("description_ar", e.target.value, { shouldValidate: true })}
                      />
                    </FieldBlock>
                  </div>
                </div>

                {/* Internal bilingual notes — company employees only, not portal-published */}
                <div className="rounded-lg border border-border/50 bg-muted/15 p-3.5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 text-start">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">{t("Internal notes")}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {t("Visible only to your company — not published to portals.")}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px]" dir="ltr">EN</Badge>
                      <Badge variant="outline" className="text-[10px]" dir="ltr">AR</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldBlock
                      label={`${t("Internal note")} (EN)`}
                      error={errors.note_en?.message}
                    >
                      <Textarea
                        dir="ltr"
                        className="min-h-[96px] resize-y rounded-md"
                        placeholder={t("Optional note for your team…")}
                        value={formData.note_en}
                        onChange={(e) => form.setValue("note_en", e.target.value, { shouldValidate: true })}
                      />
                    </FieldBlock>

                    <FieldBlock
                      label={`${t("Internal note")} (AR)`}
                      error={errors.note_ar?.message}
                    >
                      <Textarea
                        dir="rtl"
                        className="min-h-[96px] resize-y rounded-md"
                        placeholder={t("Optional note for your team…")}
                        value={formData.note_ar}
                        onChange={(e) => form.setValue("note_ar", e.target.value, { shouldValidate: true })}
                      />
                    </FieldBlock>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldBlock label={t("Owner")} required error={errors.owner_id?.message}>
                    <Select value={formData.owner_id} onValueChange={(v) => form.setValue("owner_id", v, { shouldValidate: true })}>
                      <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select Owner")} /></SelectTrigger>
                      <SelectContent>
                        {owners.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            <span dir="auto">{o.name}</span>
                            <span className="text-muted-foreground" dir="ltr"> ({o.phone})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Assigned Agent")} required error={errors.employee_id?.message}>
                    <Select
                      value={formData.employee_id}
                      onValueChange={(v) => form.setValue("employee_id", v, { shouldValidate: true })}
                      disabled={isEmployee}
                    >
                      <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select Agent")} /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            <span dir="auto">
                              {employeeDisplayName(e, language, e.name) || e.id}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Price (AED)")} required error={errors.price?.message}>
                    <Input
                      type="number"
                      dir="ltr"
                      className={cn(FIELD, "font-semibold text-primary")}
                      value={formData.price as string | number}
                      onChange={(e) => form.setValue("price", e.target.value, { shouldValidate: true })}
                    />
                  </FieldBlock>

                  {isRent && (
                    <FieldBlock label={t("Rent Frequency")} required error={errors.rent_frequency?.message}>
                      <Select
                        value={formData.rent_frequency || undefined}
                        onValueChange={(v) => form.setValue("rent_frequency", v, { shouldValidate: true })}
                      >
                        <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select")} /></SelectTrigger>
                        <SelectContent>
                          {RENT_FREQUENCIES.map((f) => (
                            <SelectItem key={f} value={f}>{t(f)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                  )}

                  <FieldBlock label={t("Commission %")}>
                    <Input
                      type="number"
                      dir="ltr"
                      step="0.01"
                      className={FIELD}
                      value={formData.commission_percentage as string | number}
                      onChange={(e) => form.setValue("commission_percentage", e.target.value)}
                    />
                  </FieldBlock>
                </div>
              </FormCard>
            </TabsContent>

            {/* -------- SPECS & LOCATION -------- */}
            <TabsContent value="specs" className="mt-5 space-y-5">
              <FormCard>
                <SectionHeader icon={Layers} title={t("Property Specs")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldBlock label={t("Bedrooms")} required error={errors.bedrooms?.message}>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      step={1}
                      className={FIELD}
                      placeholder="0"
                      value={formData.bedrooms}
                      onChange={(e) =>
                        form.setValue("bedrooms", e.target.value, {
                          shouldValidate: true,
                        })
                      }
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Bathrooms")} required error={errors.bathrooms?.message}>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      step={1}
                      className={FIELD}
                      placeholder="0"
                      value={formData.bathrooms}
                      onChange={(e) =>
                        form.setValue("bathrooms", e.target.value, {
                          shouldValidate: true,
                        })
                      }
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Furnishing")} required error={errors.furnishing?.message}>
                    <Select value={formData.furnishing || undefined} onValueChange={(v) => form.setValue("furnishing", v, { shouldValidate: true })}>
                      <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select")} /></SelectTrigger>
                      <SelectContent>
                        {FURNISHING_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f}>{t(f)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={`${t("Building Area")} (${t("sqft")})`} required error={errors.building_area?.message}>
                    <Input
                      type="number"
                      dir="ltr"
                      className={FIELD}
                      value={formData.building_area as string | number}
                      onChange={(e) => form.setValue("building_area", e.target.value, { shouldValidate: true })}
                    />
                  </FieldBlock>

                  <FieldBlock label={`${t("Land Area")} (${t("sqft")})`}>
                    <Input
                      type="number"
                      dir="ltr"
                      className={FIELD}
                      value={formData.land_area as string | number}
                      onChange={(e) => form.setValue("land_area", e.target.value)}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Parking slots")}>
                    <Input
                      type="number"
                      dir="ltr"
                      className={FIELD}
                      value={formData.parking_slots as string | number}
                      onChange={(e) => form.setValue("parking_slots", e.target.value)}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Available from")}>
                    <Input
                      type="date"
                      dir="ltr"
                      className={FIELD}
                      value={formData.available_from}
                      onChange={(e) => form.setValue("available_from", e.target.value)}
                    />
                  </FieldBlock>

                  <div className="flex items-center gap-3 sm:pt-7">
                    <Switch
                      checked={!!formData.is_off_plan}
                      onCheckedChange={(v) => form.setValue("is_off_plan", v, { shouldValidate: true })}
                      id="off-plan"
                    />
                    <Label htmlFor="off-plan" className="cursor-pointer text-start">
                      {t("Off-plan property")}
                    </Label>
                  </div>
                </div>

                {formData.is_off_plan && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 sm:p-4">
                    <FieldBlock label={t("Project Status")} required error={errors.project_status?.message}>
                      <Select value={formData.project_status || undefined} onValueChange={(v) => form.setValue("project_status", v, { shouldValidate: true })}>
                        <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select")} /></SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label={t("Off-plan sale type")} required error={errors.offplan_sale_type?.message}>
                      <Select value={formData.offplan_sale_type || undefined} onValueChange={(v) => form.setValue("offplan_sale_type", v, { shouldValidate: true })}>
                        <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">{t("New")}</SelectItem>
                          <SelectItem value="Resale">{t("Resale")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    {formData.offplan_sale_type === "New" && (
                      <FieldBlock label={t("DLD waiver %")} required error={errors.offplan_dld_waiver?.message}>
                        <Input
                          type="number"
                          dir="ltr"
                          className={FIELD}
                          min={0}
                          max={100}
                          value={formData.offplan_dld_waiver as string | number}
                          onChange={(e) => form.setValue("offplan_dld_waiver", e.target.value, { shouldValidate: true })}
                        />
                      </FieldBlock>
                    )}
                    {formData.offplan_sale_type === "Resale" && (
                      <>
                        <FieldBlock label={t("Original price")} required error={errors.offplan_original_price?.message}>
                          <Input
                            type="number"
                            dir="ltr"
                            className={FIELD}
                            value={formData.offplan_original_price as string | number}
                            onChange={(e) => form.setValue("offplan_original_price", e.target.value, { shouldValidate: true })}
                          />
                        </FieldBlock>
                        <FieldBlock label={t("Amount paid")} required error={errors.offplan_amount_paid?.message}>
                          <Input
                            type="number"
                            dir="ltr"
                            className={FIELD}
                            value={formData.offplan_amount_paid as string | number}
                            onChange={(e) => form.setValue("offplan_amount_paid", e.target.value, { shouldValidate: true })}
                          />
                        </FieldBlock>
                      </>
                    )}
                  </div>
                )}
              </FormCard>

              <FormCard>
                <SectionHeader icon={MapPinned} title={t("Portal Location")} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldBlock label={t("Emirate")} required error={errors.emirate?.message}>
                    <Select value={formData.emirate} onValueChange={handleEmirateChange}>
                      <SelectTrigger className={FIELD}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EMIRATES.map((e) => (
                          <SelectItem key={e} value={e}>{t(e)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Area / District")}>
                    <Select value={formData.area_district} onValueChange={(v) => form.setValue("area_district", v)}>
                      <SelectTrigger className={FIELD} disabled={isLoadingAreas || !formData.emirate}>
                        <SelectValue placeholder={t("Select Area")} />
                      </SelectTrigger>
                      <SelectContent>
                        {areasDistricts.length === 0 ? (
                          <SelectItem value="none" disabled>{t("No configured areas")}</SelectItem>
                        ) : (
                          areasDistricts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("City")} required error={errors.city?.message} hint={t("Bayut City / Emirate")}>
                    <Input
                      className={FIELD}
                      value={formData.city}
                      onChange={(e) => form.setValue("city", e.target.value, { shouldValidate: true })}
                      placeholder={t("e.g. Dubai")}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Locality")} required error={errors.locality?.message} hint={t("Bayut locality")}>
                    <Input
                      className={FIELD}
                      value={formData.locality}
                      onChange={(e) => form.setValue("locality", e.target.value, { shouldValidate: true })}
                      placeholder={t("e.g. Dubai Marina")}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Sub-locality")}>
                    <Input
                      className={FIELD}
                      value={formData.sub_locality}
                      onChange={(e) => form.setValue("sub_locality", e.target.value)}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Tower / Building Name")}>
                    <Input
                      className={FIELD}
                      value={formData.tower_name}
                      onChange={(e) => form.setValue("tower_name", e.target.value)}
                    />
                  </FieldBlock>

                  <div className="sm:col-span-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 sm:p-4 space-y-3 text-start">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t("PropertyFinder map location")}{" "}
                        <span className="text-[11px] font-medium text-muted-foreground">
                          ({t("required only to publish on PropertyFinder")})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {t(
                          "This is not a normal address. Search PropertyFinder’s official location list (e.g. Dubai Marina) and pick one result. We save their location ID so the listing can be published on PropertyFinder. Bayut uses City / Locality above instead.",
                        )}
                      </p>
                    </div>
                    <FieldBlock
                      label={t("Search & select PF location")}
                      error={errors.pf_location_id?.message as string | undefined}
                    >
                      <PfLocationPicker
                        companyId={company?.id}
                        value={formData.pf_location_id}
                        onChange={(id) =>
                          form.setValue("pf_location_id", id === "" ? "" : id, {
                            shouldValidate: true,
                          })
                        }
                      />
                    </FieldBlock>
                    {formData.pf_location_id ? (
                      <p className="text-[11px] text-muted-foreground" dir="ltr">
                        {t("Selected PF location ID")}: #{formData.pf_location_id}
                      </p>
                    ) : null}
                  </div>

                  <FieldBlock label={t("Specific Address/Sub-area")}>
                    <Input
                      className={FIELD}
                      value={formData.area}
                      onChange={(e) => form.setValue("area", e.target.value)}
                      placeholder={t("e.g. Building 4, Street 12")}
                    />
                  </FieldBlock>
                </div>
              </FormCard>
            </TabsContent>

            {/* -------- MEDIA -------- */}
            <TabsContent value="media" className="mt-5 space-y-5">
              <FormCard>
                <div className="flex items-start justify-between gap-3 text-start">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">
                      {t("Property Images (Max 12)")} <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {t("Select up to 12 images. High quality (870x600px recommended).")}
                    </p>
                  </div>
                  <Badge variant="outline" className="tabular-nums shrink-0" dir="ltr">
                    {imageCount} / {MAX_IMAGES}
                  </Badge>
                </div>

                <div
                  onClick={() => imageFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const selected = Array.from(e.dataTransfer.files).filter((f) =>
                      ["image/jpeg", "image/png", "image/webp"].includes(f.type),
                    );
                    addFilesRespectingLimit(selected);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors px-4 py-8 sm:py-10 text-center",
                    isDragOver
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
                    imageError && "border-destructive/50",
                  )}
                >
                  <UploadCloud className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">{t("Drag & drop images here, or click to select")}</p>
                </div>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files) return;
                    addFilesRespectingLimit(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                />
                {imageError && <p className="text-[11px] text-destructive text-start">{imageError}</p>}

                {(existingImageUrls.length > 0 || imagesFiles.length > 0) && (
                  <details className="group" open>
                    <summary className="list-none cursor-pointer flex items-center justify-between">
                      <span className="text-sm font-medium">{t("Preview")}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-3 space-y-3">
                      {activeImageUrl && (
                        <img src={activeImageUrl} alt="" className="w-full h-48 sm:h-56 object-cover rounded-xl border" />
                      )}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[...existingImageUrls, ...newImageUrls].map((url, idx) => {
                          const isExisting = idx < existingImageUrls.length;
                          return (
                            <div key={`${url}-${idx}`} className="relative rounded-lg overflow-hidden border aspect-square">
                              <button type="button" className="w-full h-full" onClick={() => setActiveImageUrl(url)}>
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                              {!isExisting && (
                                <button
                                  type="button"
                                  className="absolute top-1 end-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs"
                                  onClick={() =>
                                    setImagesFiles((prev) =>
                                      prev.filter((_, i) => i !== idx - existingImageUrls.length),
                                    )
                                  }
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                )}
              </FormCard>

              <FormCard>
                <div className="flex items-start justify-between gap-3 text-start">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{t("Floor Plans")}</Label>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {t("Optional. Used by Bayut & dubizzle only — PropertyFinder does not accept floor plans on individual listings.")}
                    </p>
                  </div>
                  <Badge variant="outline" className="tabular-nums shrink-0" dir="ltr">
                    {floorPlanCount} / {MAX_FLOOR_PLANS}
                  </Badge>
                </div>

                <div
                  onClick={() => floorPlanFileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors px-4 py-6 text-center border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
                >
                  <UploadCloud className="w-6 h-6 text-muted-foreground" />
                  <p className="text-sm font-medium">{t("Click to select floor plan images")}</p>
                </div>
                <input
                  ref={floorPlanFileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files) return;
                    addFloorPlanFilesRespectingLimit(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                />

                {(existingFloorPlanUrls.length > 0 || floorPlanFiles.length > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[...existingFloorPlanUrls, ...newFloorPlanUrls].map((url, idx) => {
                      const isExisting = idx < existingFloorPlanUrls.length;
                      return (
                        <div key={`${url}-${idx}`} className="relative rounded-lg overflow-hidden border aspect-square">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {!isExisting && (
                            <button
                              type="button"
                              className="absolute top-1 end-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs"
                              onClick={() =>
                                setFloorPlanFiles((prev) =>
                                  prev.filter((_, i) => i !== idx - existingFloorPlanUrls.length),
                                )
                              }
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </FormCard>

              <FormCard>
                <div className="text-start">
                  <Label className="text-sm font-medium">{t("Property Video")}</Label>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {t("Optional. A YouTube/Vimeo tour link. Bayut & dubizzle can list several; PropertyFinder uses only the first one.")}
                  </p>
                </div>
                <div className="space-y-2">
                  {(formData.video_urls ?? []).map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input
                        dir="ltr"
                        className={FIELD}
                        placeholder="https://youtube.com/watch?v=…"
                        value={url}
                        onChange={(e) => updateVideoUrl(idx, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive rounded-xl"
                        onClick={() => removeVideoUrl(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addVideoUrl} className="gap-1.5 rounded-xl">
                    <Plus className="w-3.5 h-3.5" />
                    {t("Add video link")}
                  </Button>
                </div>
              </FormCard>

              <FormCard>
                <div className="text-start">
                  <Label className="font-semibold">{t("Amenities")}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("Used by PropertyFinder (fixed list) and Bayut features.")}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PF_AMENITIES.map((slug) => {
                    const checked = (formData.amenities ?? []).includes(slug);
                    return (
                      <label
                        key={slug}
                        className={cn(
                          "flex items-center gap-2 text-sm cursor-pointer rounded-xl border px-2.5 py-2.5 text-start transition-colors",
                          checked
                            ? "border-primary/30 bg-primary/[0.06]"
                            : "border-border/50 hover:bg-muted/40",
                        )}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleAmenity(slug)} />
                        <span className="truncate">{t(amenityI18nKey(slug))}</span>
                      </label>
                    );
                  })}
                </div>
              </FormCard>
            </TabsContent>

            {/* -------- COMPLIANCE -------- */}
            <TabsContent value="compliance" className="mt-5">
              <FormCard>
                <SectionHeader
                  icon={FileCheck2}
                  title={t("Compliance")}
                  description={t("Permit details required to publish on Bayut, dubizzle and PropertyFinder.")}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldBlock label={t("Permit Type")} required error={errors.permit_type?.message}>
                    <Select value={formData.permit_type || undefined} onValueChange={(v) => form.setValue("permit_type", v, { shouldValidate: true })}>
                      <SelectTrigger className={FIELD}><SelectValue placeholder={t("Select")} /></SelectTrigger>
                      <SelectContent>
                        {PERMIT_TYPES.map((p) => (
                          <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock
                    label={t("Advertising Permit Number")}
                    required
                    error={errors.advertising_permit_number?.message}
                    hint={t("RERA / Trakheesi / ADREC permit")}
                  >
                    <Input
                      dir="ltr"
                      className={FIELD}
                      value={formData.advertising_permit_number}
                      onChange={(e) =>
                        form.setValue("advertising_permit_number", e.target.value, { shouldValidate: true })
                      }
                    />
                  </FieldBlock>

                  <FieldBlock
                    label={t("License Number")}
                    hint={t("Optional here — company default is set in Settings")}
                  >
                    <Input
                      dir="ltr"
                      className={FIELD}
                      value={formData.issuing_license_number}
                      onChange={(e) => form.setValue("issuing_license_number", e.target.value)}
                    />
                  </FieldBlock>
                </div>
              </FormCard>
            </TabsContent>
          </Tabs>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="rounded-md h-9 w-full sm:w-auto"
              >
                {t("Cancel")}
              </Button>
            )}
            <Button
              onClick={submit}
              disabled={isSubmitting}
              size="lg"
              className="px-6 rounded-md h-9 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="me-2 w-4 h-4 animate-spin" /> {t("Saving...")}
                </>
              ) : (
                t("Save Property")
              )}
            </Button>
          </div>
        </div>

        {/* Readiness sidebar — persistent on lg+, replaced by the compact strip above on smaller screens */}
        <aside className="hidden lg:block lg:col-span-4">
          <PortalReadinessPanel
            checks={readiness.checks}
            done={readiness.done}
            total={readiness.total}
            ready={readiness.ready}
          />
        </aside>
      </div>
    </Form>
  );
}
