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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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
const BEDROOM_OPTIONS = ["studio", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "10+"];
const BATHROOM_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const MAX_IMAGES = 12;

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
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive ms-0.5">*</span> : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
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
      features: property.features ?? [],
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
    features: [],
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
        features: values.features ?? [],
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
        status: values.status || "Available",
        advertising_permit_number: values.advertising_permit_number || "",
        images: imagesFiles,
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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Main form */}
        <div className="xl:col-span-8 space-y-5">
          <Tabs defaultValue="basic" className="flex flex-col">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 rounded-xl bg-muted/60">
              <TabsTrigger value="basic" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm py-2">
                <Building2 className="w-3.5 h-3.5" />
                {t("Basic Info")}
              </TabsTrigger>
              <TabsTrigger value="specs" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm py-2">
                <Globe className="w-3.5 h-3.5" />
                {t("Specs & Location")}
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm py-2">
                <ImageIcon className="w-3.5 h-3.5" />
                {t("Media")}
              </TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm py-2">
                <FileCheck2 className="w-3.5 h-3.5" />
                {t("Compliance")}
              </TabsTrigger>
            </TabsList>

            {/* -------- BASIC -------- */}
            <TabsContent value="basic" className="mt-5 space-y-5">
              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-5">
                <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
                  <Label className="mb-3 block">
                    {t("Listing Type")} <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup
                    value={formData.listing_type}
                    onValueChange={(v) => form.setValue("listing_type", v, { shouldValidate: true })}
                    className="flex flex-wrap gap-6"
                    disabled={mode === "edit"}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Sale" id="r-sale" />
                      <Label htmlFor="r-sale" className="font-normal cursor-pointer">{t("For Sale")}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="Rent" id="r-rent" />
                      <Label htmlFor="r-rent" className="font-normal cursor-pointer">{t("For Rent")}</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldBlock label={t("Property Type")} required error={errors.type?.message}>
                    <Select value={formData.type} onValueChange={(v) => form.setValue("type", v, { shouldValidate: true })}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select Type")} /></SelectTrigger>
                      <SelectContent>
                        {types.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id}>{typeLabel(pt)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Status")}>
                    <Select value={formData.status} onValueChange={(v) => form.setValue("status", v)}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>
                </div>

                {/* Bilingual title + description — required by Bayut & PropertyFinder */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-outfit font-semibold text-sm">{t("Bilingual listing content")}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t("English and Arabic title & description are required for Bayut, dubizzle and PropertyFinder.")}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-[10px]">EN</Badge>
                      <Badge variant="outline" className="text-[10px]">AR</Badge>
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
                        maxLength={150}
                        placeholder={t("e.g. Spacious 2BR apartment in Marina")}
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
                        maxLength={150}
                        placeholder={t("مثال: شقة غرفتين فسيحة في المارينا")}
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
                        className="min-h-[140px] resize-y"
                        placeholder={t("Full English description for the portals…")}
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
                        className="min-h-[140px] resize-y"
                        placeholder={t("الوصف الكامل بالعربية للمنصات…")}
                        value={formData.description_ar}
                        onChange={(e) => form.setValue("description_ar", e.target.value, { shouldValidate: true })}
                      />
                    </FieldBlock>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldBlock label={t("Owner")} required error={errors.owner_id?.message}>
                    <Select value={formData.owner_id} onValueChange={(v) => form.setValue("owner_id", v, { shouldValidate: true })}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select Owner")} /></SelectTrigger>
                      <SelectContent>
                        {owners.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.name} ({o.phone})</SelectItem>
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
                      <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select Agent")} /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.name || e.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Price (AED)")} required error={errors.price?.message}>
                    <Input
                      type="number"
                      className="font-semibold text-primary"
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
                        <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select")} /></SelectTrigger>
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
                      step="0.01"
                      value={formData.commission_percentage as string | number}
                      onChange={(e) => form.setValue("commission_percentage", e.target.value)}
                    />
                  </FieldBlock>
                </div>
              </div>
            </TabsContent>

            {/* -------- SPECS & LOCATION -------- */}
            <TabsContent value="specs" className="mt-5 space-y-5">
              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-5">
                <h3 className="font-outfit font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Property Specs")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldBlock label={t("Bedrooms")} required error={errors.bedrooms?.message}>
                    <Select value={formData.bedrooms || undefined} onValueChange={(v) => form.setValue("bedrooms", v, { shouldValidate: true })}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select")} /></SelectTrigger>
                      <SelectContent>
                        {BEDROOM_OPTIONS.map((b) => (
                          <SelectItem key={b} value={b}>{b === "studio" ? t("studio") : b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Bathrooms")} required error={errors.bathrooms?.message}>
                    <Select value={formData.bathrooms || undefined} onValueChange={(v) => form.setValue("bathrooms", v, { shouldValidate: true })}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select")} /></SelectTrigger>
                      <SelectContent>
                        {BATHROOM_OPTIONS.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Furnishing")} required error={errors.furnishing?.message}>
                    <Select value={formData.furnishing || undefined} onValueChange={(v) => form.setValue("furnishing", v, { shouldValidate: true })}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select")} /></SelectTrigger>
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
                      value={formData.building_area as string | number}
                      onChange={(e) => form.setValue("building_area", e.target.value, { shouldValidate: true })}
                    />
                  </FieldBlock>

                  <FieldBlock label={`${t("Land Area")} (${t("sqft")})`}>
                    <Input
                      type="number"
                      value={formData.land_area as string | number}
                      onChange={(e) => form.setValue("land_area", e.target.value)}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Parking slots")}>
                    <Input
                      type="number"
                      value={formData.parking_slots as string | number}
                      onChange={(e) => form.setValue("parking_slots", e.target.value)}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Available from")}>
                    <Input
                      type="date"
                      value={formData.available_from}
                      onChange={(e) => form.setValue("available_from", e.target.value)}
                    />
                  </FieldBlock>

                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={!!formData.is_off_plan}
                      onCheckedChange={(v) => form.setValue("is_off_plan", v, { shouldValidate: true })}
                      id="off-plan"
                    />
                    <Label htmlFor="off-plan" className="cursor-pointer">{t("Off-plan property")}</Label>
                  </div>
                </div>

                {formData.is_off_plan && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <FieldBlock label={t("Project Status")} required error={errors.project_status?.message}>
                      <Select value={formData.project_status || undefined} onValueChange={(v) => form.setValue("project_status", v, { shouldValidate: true })}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select")} /></SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    <FieldBlock label={t("Off-plan sale type")} required error={errors.offplan_sale_type?.message}>
                      <Select value={formData.offplan_sale_type || undefined} onValueChange={(v) => form.setValue("offplan_sale_type", v, { shouldValidate: true })}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select")} /></SelectTrigger>
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
                            value={formData.offplan_original_price as string | number}
                            onChange={(e) => form.setValue("offplan_original_price", e.target.value, { shouldValidate: true })}
                          />
                        </FieldBlock>
                        <FieldBlock label={t("Amount paid")} required error={errors.offplan_amount_paid?.message}>
                          <Input
                            type="number"
                            value={formData.offplan_amount_paid as string | number}
                            onChange={(e) => form.setValue("offplan_amount_paid", e.target.value, { shouldValidate: true })}
                          />
                        </FieldBlock>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-5">
                <h3 className="font-outfit font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Portal Location")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldBlock label={t("Emirate")} required error={errors.emirate?.message}>
                    <Select value={formData.emirate} onValueChange={handleEmirateChange}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EMIRATES.map((e) => (
                          <SelectItem key={e} value={e}>{t(e)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldBlock>

                  <FieldBlock label={t("Area / District")}>
                    <Select value={formData.area_district} onValueChange={(v) => form.setValue("area_district", v)}>
                      <SelectTrigger className="bg-background" disabled={isLoadingAreas || !formData.emirate}>
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
                      value={formData.city}
                      onChange={(e) => form.setValue("city", e.target.value, { shouldValidate: true })}
                      placeholder={t("e.g. Dubai")}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Locality")} required error={errors.locality?.message} hint={t("Bayut locality")}>
                    <Input
                      value={formData.locality}
                      onChange={(e) => form.setValue("locality", e.target.value, { shouldValidate: true })}
                      placeholder={t("e.g. Dubai Marina")}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Sub-locality")}>
                    <Input
                      value={formData.sub_locality}
                      onChange={(e) => form.setValue("sub_locality", e.target.value)}
                    />
                  </FieldBlock>

                  <FieldBlock label={t("Tower / Building Name")}>
                    <Input
                      value={formData.tower_name}
                      onChange={(e) => form.setValue("tower_name", e.target.value)}
                    />
                  </FieldBlock>

                  <div className="md:col-span-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3">
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
                      value={formData.area}
                      onChange={(e) => form.setValue("area", e.target.value)}
                      placeholder={t("e.g. Building 4, Street 12")}
                    />
                  </FieldBlock>
                </div>
              </div>
            </TabsContent>

            {/* -------- MEDIA -------- */}
            <TabsContent value="media" className="mt-5 space-y-5">
              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">
                      {t("Property Images (Max 12)")} <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Select up to 12 images. High quality (870x600px recommended).")}
                    </p>
                  </div>
                  <Badge variant="outline" className="tabular-nums" dir="ltr">
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
                    "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors px-4 py-10 text-center",
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
                {imageError && <p className="text-[11px] text-destructive">{imageError}</p>}

                {(existingImageUrls.length > 0 || imagesFiles.length > 0) && (
                  <details className="group" open>
                    <summary className="list-none cursor-pointer flex items-center justify-between">
                      <span className="text-sm font-medium">{t("Preview")}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-3 space-y-3">
                      {activeImageUrl && (
                        <img src={activeImageUrl} alt="" className="w-full h-56 object-cover rounded-xl border" />
                      )}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
                <Label className="font-semibold">{t("Amenities")}</Label>
                <p className="text-xs text-muted-foreground">{t("Used by PropertyFinder (fixed list) and Bayut features.")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PF_AMENITIES.map((slug) => {
                    const checked = (formData.amenities ?? []).includes(slug);
                    return (
                      <label key={slug} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-border/50 px-2.5 py-2 hover:bg-muted/40">
                        <Checkbox checked={checked} onCheckedChange={() => toggleAmenity(slug)} />
                        <span className="truncate">{t(amenityI18nKey(slug))}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* -------- COMPLIANCE -------- */}
            <TabsContent value="compliance" className="mt-5">
              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-5">
                <h3 className="font-outfit font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Compliance")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldBlock label={t("Permit Type")} required error={errors.permit_type?.message}>
                    <Select value={formData.permit_type || undefined} onValueChange={(v) => form.setValue("permit_type", v, { shouldValidate: true })}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder={t("Select")} /></SelectTrigger>
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
                      value={formData.issuing_license_number}
                      onChange={(e) => form.setValue("issuing_license_number", e.target.value)}
                    />
                  </FieldBlock>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="rounded-lg">
                {t("Cancel")}
              </Button>
            )}
            <Button onClick={submit} disabled={isSubmitting} size="lg" className="px-8 rounded-xl">
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

        {/* Readiness sidebar */}
        <aside className="xl:col-span-4">
          <div className="rounded-2xl border border-border/70 bg-card overflow-hidden xl:sticky xl:top-24">
            <div className="px-5 py-4 border-b border-border/60 bg-muted/25 flex items-center justify-between gap-2">
              <div>
                <h3 className="font-outfit font-semibold text-sm">{t("Portal readiness")}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("Bayut · dubizzle · PropertyFinder")}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "tabular-nums",
                  readiness.ready
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                    : "bg-amber-500/10 text-amber-700 border-amber-500/25",
                )}
              >
                {readiness.done}/{readiness.total}
              </Badge>
            </div>
            <div className="p-4 space-y-1.5 max-h-[28rem] overflow-y-auto">
              {readiness.checks.map((c) => (
                <div
                  key={c.key}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm",
                    c.ok ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {c.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.portals}</p>
                  </div>
                </div>
              ))}
            </div>
            {!readiness.ready && (
              <div className="px-4 pb-4">
                <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{t("Fill all required fields to publish this listing to Bayut, dubizzle and PropertyFinder.")}</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Form>
  );
}
