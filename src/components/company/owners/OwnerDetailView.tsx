"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Save,
  Phone,
  MessageCircle,
  MapPin,
  Megaphone,
  Building2,
  FileText,
  History,
  Loader2,
  UserPlus,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  UploadCloud,
  CalendarDays,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import StatusUpdateModal from "@/components/common/StatusUpdateModal";
import StatusHistoryDisplay from "@/components/common/StatusHistoryDisplay";
import LinkedPropertyCard from "@/components/company/properties/LinkedPropertyCard";
import { cn } from "@/lib/utils";
import { OwnerSchema, type TOwnerSchema, type TOwnerSchemaOutput } from "@/validations/owner.schema";
import {
  useOwner,
  useOwnerStatuses,
  useMarketingChannels,
  useCreateOwner,
  useUpdateOwner,
  useDeleteOwner,
  useOwnerPropertyCount,
} from "@/hooks/queries/useOwners";
import {
  useCompanyEmployeesLookup,
  useOwnerProperties,
} from "@/hooks/queries/useProperties";
import { useOwnerStatusBadge } from "@/hooks/useOwnerStatusBadge";
import { useLanguage } from "@/contexts/LanguageContext";
import { countryLabel, normalizeCountryValue } from "@/lib/countries";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";

const DEFAULT_MARKETING_CHANNELS = [
  "Google",
  "Facebook",
  "Instagram",
  "TikTok",
  "Snapchat",
  "X",
  "LinkedIn",
  "Property Finder",
  "Bayut",
  "Dubizzle",
  "Marjan",
  "OpenSouk",
  "Website",
];

const OWNER_TABS = ["info", "properties", "status"] as const;
type OwnerTab = (typeof OWNER_TABS)[number];

function resolveOwnerTab(raw: string | null, isNew: boolean): OwnerTab {
  if (isNew) return "info";
  if (raw && (OWNER_TABS as readonly string[]).includes(raw)) {
    return raw as OwnerTab;
  }
  return "info";
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-xl overflow-hidden",
        className,
      )}
    >
      <div className="flex items-start gap-2.5 bg-muted/30 px-5 py-3.5 border-border/50 border-b">
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
      <div className="p-5">{children}</div>
    </section>
  );
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

interface OwnerDetailViewProps {
  ownerId?: string | null;
}

export default function OwnerDetailView({ ownerId = null }: OwnerDetailViewProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === "ar" ? ar : enUS;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { company, currentUser } = useCompanyAuth();
  const isNew = !ownerId;

  const tabFromUrl = resolveOwnerTab(searchParams.get("tab"), isNew);
  const [activeTab, setActiveTab] = useState<OwnerTab>(tabFromUrl);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    data: owner,
    isLoading: isLoadingOwner,
    isError,
    refetch: refetchOwner,
  } = useOwner(ownerId ?? undefined, company?.id);

  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: statusesData } = useOwnerStatuses(company?.id);
  const statuses = statusesData ?? [];
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannelOptions =
    marketingChannelsData && marketingChannelsData.length > 0
      ? marketingChannelsData.map((mc) => mc.name)
      : DEFAULT_MARKETING_CHANNELS;
  const { data: propertiesData, isFetching: isLoadingProperties } =
    useOwnerProperties(isNew ? undefined : ownerId ?? undefined);
  const properties = propertiesData ?? [];
  const { data: propertyCountData } = useOwnerPropertyCount(
    isNew ? undefined : ownerId ?? undefined,
  );
  const propertyCount = propertyCountData ?? properties.length;
  const badge = useOwnerStatusBadge(
    isNew ? undefined : ownerId ?? undefined,
    company?.id,
    owner?.created_at,
  );

  const createOwnerMutation = useCreateOwner();
  const updateOwnerMutation = useUpdateOwner();
  const deleteOwnerMutation = useDeleteOwner();

  const form = useForm<TOwnerSchema, unknown, TOwnerSchemaOutput>({
    resolver: zodResolver(OwnerSchema(t)),
    defaultValues: {
      name_en: "",
      name_ar: "",
      phone: "",
      country: "United Arab Emirates",
      assigned_employee_id:
        currentUser?.role === "company_employee" ? currentUser.id : "",
      marketing_channel: "",
    },
  });

  useEffect(() => {
    if (owner) {
      form.reset({
        name_en: owner.name_en || owner.name || "",
        name_ar: owner.name_ar || owner.name || "",
        phone: owner.phone || "",
        country: normalizeCountryValue(owner.country || "United Arab Emirates"),
        assigned_employee_id: owner.assigned_employee_id || "",
        marketing_channel: owner.marketing_channel || "",
      });
    } else if (isNew) {
      form.reset({
        name_en: "",
        name_ar: "",
        phone: "",
        country: "United Arab Emirates",
        assigned_employee_id:
          currentUser?.role === "company_employee" ? currentUser.id : "",
        marketing_channel: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, isNew, currentUser]);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const selectTab = (tab: OwnerTab) => {
    if (isNew && tab !== "info") return;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "info") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (isError && !isNew) {
      toast.error(t("Owner not found"));
      router.replace("/company/owners");
    }
  }, [isError, isNew, router, t]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    setAvatarFile(null);
    setRemoveAvatar(false);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner?.id, owner?.avatar_url]);

  const clearAvatarSelection = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyAvatarFile = (file: File) => {
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error(t("Please upload a JPG, PNG, or WebP image."));
      return;
    }
    if (file.size >= MAX_AVATAR_BYTES) {
      toast.error(t("Owner photo must be less than 2MB."));
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const displayName =
    bilingualLabel(
      {
        name_en: owner?.name_en || form.watch("name_en"),
        name_ar: owner?.name_ar || form.watch("name_ar"),
        name: owner?.name,
      },
      language,
    ) || t("New Owner");
  const employeeId = form.watch("assigned_employee_id");
  const assignedEmployee = employees.find((e) => e.id === employeeId);
  const employeeName =
    employeeDisplayName(assignedEmployee, language, assignedEmployee?.name) ||
    t("Unassigned");
  const employeeAvatarUrl = assignedEmployee?.avatar_url || null;
  const cleanPhone = (form.watch("phone") || "").replace(/\D/g, "");
  const currentAvatarUrl = removeAvatar
    ? null
    : avatarPreview || owner?.avatar_url || null;

  const handleSave = form.handleSubmit(async (formData) => {
    if (!company?.id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name_en: formData.name_en,
        name_ar: formData.name_ar,
        phone: formData.phone,
        country: formData.country,
        marketing_channel: formData.marketing_channel,
        assigned_employee_id:
          currentUser?.role === "company_employee" && isNew
            ? currentUser.id
            : formData.assigned_employee_id,
        avatar: avatarFile,
        removeAvatar: removeAvatar && !avatarFile,
      };

      if (owner?.id) {
        const result = await updateOwnerMutation.mutateAsync({
          id: owner.id,
          companyId: company.id,
          ...payload,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner updated successfully."));
        clearAvatarSelection();
        setRemoveAvatar(false);
        refetchOwner();
      } else {
        const result = await createOwnerMutation.mutateAsync({
          companyId: company.id,
          ...payload,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner added successfully."));
        clearAvatarSelection();
        setRemoveAvatar(false);
        router.replace(`/company/owners/${result.data!.id}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("Error saving owner.");
      toast.error(
        message === "Owner photo must be less than 2MB."
          ? t("Owner photo must be less than 2MB.")
          : message === "Please upload a JPG, PNG, or WebP image."
            ? t("Please upload a JPG, PNG, or WebP image.")
            : message,
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDelete = async () => {
    if (!owner?.id) return;
    setIsDeleting(true);
    try {
      const result = await deleteOwnerMutation.mutateAsync(owner.id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Owner deleted."));
      setDeleteDialogOpen(false);
      router.replace("/company/owners");
    } catch {
      toast.error(t("Could not delete. Owner might be linked to properties."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusSuccess = () => {
    setHistoryRefreshTrigger((prev) => prev + 1);
    refetchOwner();
  };

  if (!isNew && isLoadingOwner) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-8 container max-w-6xl space-y-6">
        <Skeleton className="w-40 h-9" />
        <Skeleton className="w-full h-32 rounded-2xl" />
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-3 sm:px-6 py-5 sm:py-8 container max-w-6xl space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/company/owners">
          <Button variant="ghost" size="sm" className="gap-2 -ms-2 h-9">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{t("Back to Owners")}</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {owner && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="sm:inline hidden">{t("Delete")}</span>
            </Button>
          )}
          {owner && cleanPhone && (
            <div className="flex sm:hidden items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
                <a href={`tel:${cleanPhone}`}>
                  <Phone className="w-3.5 h-3.5" />
                  {t("Call")}
                </a>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-[#25D366] hover:bg-[#25D366]/90 h-9 gap-1.5 text-white"
              >
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {t("WhatsApp")}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
        <div className="relative bg-gradient-to-r from-background via-muted/20 to-background border-border/60 border-b">
          <div
            className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="relative flex items-center gap-3.5 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5">
            <div className="relative shrink-0">
              <div className="flex justify-center items-center bg-amber-500/10 rounded-2xl ring-2 ring-amber-500/30 ring-offset-2 ring-offset-background w-14 h-14 sm:w-16 sm:h-16 font-outfit font-bold text-amber-800 text-xl shadow-sm overflow-hidden">
                {currentAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentAvatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              {!isNew ? (
                <span
                  title={badge.text}
                  aria-label={badge.text}
                  className={cn(
                    "absolute -bottom-0.5 -end-0.5 z-10 block rounded-full border-[2.5px] border-background w-4 h-4 sm:w-[1.125rem] sm:h-[1.125rem]",
                    badge.dot,
                  )}
                />
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                {owner ? t("Owner Profile") : t("Add New Owner")}
              </p>
              <h1
                className="mt-0.5 font-outfit font-bold text-foreground text-xl sm:text-2xl truncate tracking-tight"
                dir="auto"
              >
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {!isNew && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] h-5 gap-0.5 font-medium border",
                      badge.color,
                    )}
                  >
                    {badge.icon === "check" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    {badge.text}
                  </Badge>
                )}
                {(owner?.marketing_channel ||
                  form.watch("marketing_channel")) && (
                  <Badge
                    variant="secondary"
                    className="max-w-full text-[11px] h-5 font-normal truncate"
                  >
                    <Megaphone className="w-3 h-3 me-1 shrink-0" />
                    <span className="truncate">
                      {owner?.marketing_channel ||
                        form.watch("marketing_channel")}
                    </span>
                  </Badge>
                )}
              </div>
            </div>

            {owner && cleanPhone && (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                >
                  <a href={`tel:${cleanPhone}`}>
                    <Phone className="w-3.5 h-3.5" />
                    {t("Call")}
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-[#25D366] hover:bg-[#25D366]/90 h-9 gap-1.5 text-white"
                >
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {t("WhatsApp")}
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile summary strip */}
        <div className="lg:hidden space-y-2.5 bg-muted/15 px-4 sm:px-5 py-3 border-border/60 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex justify-center items-center bg-primary/10 rounded-full w-9 h-9 font-semibold text-primary text-sm shrink-0 overflow-hidden">
                {employeeAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={employeeAvatarUrl}
                    alt={employeeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  employeeName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  {t("Assigned Employee")}
                </p>
                <p className="font-medium text-foreground text-sm truncate" dir="auto">
                  {employeeName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 border border-border/50 rounded-lg text-xs shrink-0">
              <Building2 className="w-3.5 h-3.5 text-primary/70" />
              <span className="font-semibold tabular-nums">{propertyCount}</span>
              <span className="text-muted-foreground">{t("Properties")}</span>
            </div>
          </div>
          {owner && (owner.created_at || owner.updated_at) ? (
            <div className="gap-2 grid grid-cols-1 sm:grid-cols-2">
              {owner.created_at ? (
                <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 border border-border/50 rounded-lg text-[11px]">
                  <CalendarDays className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                  <span className="text-muted-foreground">{t("Created At")}</span>
                  <span className="ms-auto font-medium tabular-nums" dir="ltr">
                    {format(new Date(owner.created_at), "dd MMM yyyy", {
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              ) : null}
              {owner.updated_at ? (
                <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 border border-border/50 rounded-lg text-[11px]">
                  <Clock3 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                  <span className="text-muted-foreground">{t("Updated At")}</span>
                  <span className="ms-auto font-medium tabular-nums" dir="ltr">
                    {format(new Date(owner.updated_at), "dd MMM yyyy", {
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex lg:flex-row flex-col">
          <div className="flex flex-col flex-1 min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={(value) => selectTab(value as OwnerTab)}
              className="flex flex-col"
            >
              <div className="bg-muted/10 border-border/60 border-b">
                <div className="px-2 sm:px-4 overflow-x-auto [scrollbar-width:thin]">
                  <TabsList className="justify-start bg-transparent gap-0 p-0 h-11 w-max min-w-full">
                    {[
                      {
                        value: "info" as const,
                        icon: FileText,
                        label: t("Information"),
                        shortLabel: t("Info"),
                      },
                      {
                        value: "properties" as const,
                        icon: Building2,
                        label: t("Properties"),
                        count: propertyCount,
                        disabled: isNew,
                      },
                      {
                        value: "status" as const,
                        icon: History,
                        label: t("Status & History"),
                        shortLabel: t("Status"),
                        disabled: isNew,
                      },
                    ].map(
                      ({
                        value,
                        icon: Icon,
                        label,
                        shortLabel,
                        count,
                        disabled,
                      }) => (
                        <TabsTrigger
                          key={value}
                          id={`owner-tab-${value}`}
                          value={value}
                          disabled={disabled}
                          className={cn(
                            "gap-1.5 data-[state=active]:bg-transparent px-2.5 sm:px-3.5 rounded-none border-transparent border-b-2 h-11 data-[state=active]:border-primary data-[state=active]:shadow-none text-xs sm:text-sm shrink-0",
                            "data-[state=inactive]:text-muted-foreground",
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="sm:hidden">
                            {shortLabel || label}
                          </span>
                          <span className="hidden sm:inline">{label}</span>
                          {count !== undefined && count > 0 && (
                            <span className="bg-primary/10 ms-0.5 px-1.5 py-0.5 rounded-full font-medium text-[10px] text-primary tabular-nums">
                              {count}
                            </span>
                          )}
                        </TabsTrigger>
                      ),
                    )}
                  </TabsList>
                </div>
              </div>

              <Form {...form}>
                <div>
                  <TabsContent
                    value="info"
                    id="owner-panel-info"
                    className="space-y-5 mt-0 p-4 sm:p-6"
                  >
                    <SectionCard
                      title={t("Owner photo")}
                      description={t(
                        "Optional. JPG, PNG or WebP under 2MB. Drag and drop or browse.",
                      )}
                      icon={Camera}
                    >
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) applyAvatarFile(file);
                        }}
                        className={cn(
                          "flex sm:flex-row flex-col sm:items-center gap-4 p-4 border-2 border-dashed rounded-2xl transition-colors",
                          isDragOver
                            ? "border-primary bg-primary/10"
                            : "border-border/60 bg-muted/20 hover:border-primary/35",
                        )}
                      >
                        <Avatar className="bg-amber-500/10 mx-auto sm:mx-0 rounded-2xl w-20 h-20 ring-2 ring-amber-500/20 shrink-0">
                          {currentAvatarUrl ? (
                            <AvatarImage
                              src={currentAvatarUrl}
                              alt={t("Owner photo")}
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="bg-amber-500/10 rounded-2xl font-outfit font-bold text-amber-800 text-xl">
                            {currentAvatarUrl ? null : (
                              <User className="w-8 h-8 opacity-60" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2.5 min-w-0 text-center sm:text-start">
                          <p className="flex justify-center sm:justify-start items-center gap-1.5 text-muted-foreground text-xs leading-relaxed">
                            <UploadCloud className="hidden sm:block w-3.5 h-3.5 shrink-0" />
                            {t("Drag & drop a photo here, or click to upload")}
                          </p>
                          <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) applyAvatarFile(file);
                                e.target.value = "";
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 bg-background rounded-lg h-9"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {avatarFile || currentAvatarUrl
                                ? t("Change photo")
                                : t("Upload photo")}
                            </Button>
                            {(avatarFile || owner?.avatar_url) &&
                            !removeAvatar ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 h-9 text-destructive hover:text-destructive"
                                onClick={() => {
                                  clearAvatarSelection();
                                  if (owner?.avatar_url) {
                                    setRemoveAvatar(true);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t("Remove")}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title={t("Contact Information")} icon={User}>
                      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {`${t("Full Name")} (EN)`} *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  dir="ltr"
                                  placeholder="e.g. John Doe"
                                  className="bg-background h-10"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="name_ar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {`${t("Full Name")} (AR)`} *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  dir="rtl"
                                  placeholder="مثال: محمد أحمد"
                                  className="bg-background h-10"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Phone Number")} *
                              </FormLabel>
                              <FormControl>
                                <PhoneInput {...field} className="flex-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Country")}
                              </FormLabel>
                              <FormControl>
                                <CountryCombobox
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder={t("Select Country")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </SectionCard>

                    <SectionCard title={t("Key Information")} icon={Megaphone}>
                      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="marketing_channel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Marketing Channel")}{" "}
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background h-10">
                                    <SelectValue
                                      placeholder={t("Select Channel")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {marketingChannelOptions.map((name) => (
                                    <SelectItem key={name} value={name}>
                                      {name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="assigned_employee_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Assigned Employee")} *
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={
                                  currentUser?.role === "company_employee"
                                }
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background h-10">
                                    <SelectValue
                                      placeholder={t("Select Employee")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                      {employeeDisplayName(
                                        emp,
                                        language,
                                        emp.name,
                                      ) || emp.id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </SectionCard>
                  </TabsContent>

                  <TabsContent
                    value="properties"
                    id="owner-panel-properties"
                    className="space-y-5 mt-0 p-4 sm:p-6"
                  >
                    <SectionCard
                      title={`${t("Linked Properties")} (${properties.length})`}
                      icon={Building2}
                    >
                      {isLoadingProperties ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : properties.length === 0 ? (
                        <div className="flex flex-col items-center bg-muted/20 py-12 border border-border/50 border-dashed rounded-xl text-center">
                          <Building2 className="opacity-20 mb-3 w-10 h-10 text-primary" />
                          <p className="font-medium text-foreground text-sm">
                            {t("No properties linked to this owner yet.")}
                          </p>
                        </div>
                      ) : (
                        <div className="gap-3 sm:gap-4 grid grid-cols-1 xl:grid-cols-2">
                          {properties.map((prop) => (
                            <LinkedPropertyCard
                              key={prop.id}
                              property={prop}
                            />
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  <TabsContent
                    value="status"
                    id="owner-panel-status"
                    className="mt-0 p-4 sm:p-6"
                  >
                    <div className="mb-4 sm:mb-5 text-start">
                      <h3 className="font-outfit font-semibold text-foreground text-base sm:text-lg">
                        {t("Status & History")}
                      </h3>
                      <p className="mt-1 text-muted-foreground text-sm leading-relaxed max-w-2xl">
                        {t(
                          "Track pipeline updates and notes for this owner.",
                        )}
                      </p>
                    </div>
                    {owner && (
                      <div className="items-stretch gap-4 sm:gap-5 grid grid-cols-1 xl:grid-cols-12">
                        <div className="xl:col-span-5 order-1 min-w-0">
                          <StatusUpdateModal
                            entityType="owner"
                            entityData={owner}
                            statuses={statuses}
                            onSuccess={handleStatusSuccess}
                          />
                        </div>
                        <div className="xl:col-span-7 order-2 min-w-0 min-h-[260px] xl:min-h-[440px]">
                          <StatusHistoryDisplay
                            entityType="owner"
                            entityId={owner.id}
                            refreshTrigger={historyRefreshTrigger}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Form>
            </Tabs>

            {activeTab === "info" && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-muted/20 px-4 sm:px-6 py-4 border-border/60 border-t">
                <p className="text-muted-foreground text-xs sm:pe-4">
                  {t("Changes to owner information will be saved immediately.")}
                </p>
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="gap-2 sm:min-w-[140px] w-full sm:w-auto h-10"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSubmitting ? t("Saving...") : t("Save Owner")}
                </Button>
              </div>
            )}
          </div>

          <aside className="hidden lg:flex flex-col bg-muted/15 w-72 xl:w-80 border-border/60 border-s shrink-0">
            <div className="p-5 space-y-5">
              <div className="space-y-3">
                <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                  {t("Assigned Employee")}
                </p>
                <div className="bg-card shadow-sm p-4 border border-border/60 rounded-xl text-center">
                  <div className="flex justify-center items-center bg-primary/10 mx-auto mb-3 rounded-full ring-4 ring-primary/5 w-14 h-14 font-outfit font-bold text-primary text-xl overflow-hidden">
                    {employeeAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={employeeAvatarUrl}
                        alt={employeeName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      employeeName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <p
                    className="font-semibold text-foreground text-sm"
                    dir="auto"
                  >
                    {employeeName}
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {t("Responsible Agent")}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                  {t("Summary")}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2 bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t("Properties")}</span>
                    </span>
                    <span className="font-semibold tabular-nums shrink-0">
                      {propertyCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t("Country")}</span>
                    </span>
                    <span className="font-semibold text-end truncate max-w-[55%]">
                      {countryLabel(form.watch("country"), language) ||
                        countryLabel("United Arab Emirates", language)}
                    </span>
                  </div>
                  {owner?.created_at ? (
                    <div className="flex justify-between items-center gap-2 bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t("Created At")}</span>
                      </span>
                      <span
                        className="font-semibold text-end tabular-nums text-xs sm:text-sm shrink-0"
                        dir="ltr"
                      >
                        {format(new Date(owner.created_at), "dd MMM yyyy", {
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                  ) : null}
                  {owner?.updated_at ? (
                    <div className="flex justify-between items-center gap-2 bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Clock3 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t("Updated At")}</span>
                      </span>
                      <span
                        className="font-semibold text-end tabular-nums text-xs sm:text-sm shrink-0"
                        dir="ltr"
                      >
                        {format(new Date(owner.updated_at), "dd MMM yyyy", {
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {isNew && (
                <div className="flex flex-col items-center bg-primary/5 p-5 border border-primary/15 border-dashed rounded-xl text-center">
                  <UserPlus className="mb-2 w-8 h-8 text-primary/50" />
                  <p className="font-medium text-foreground text-sm">
                    {t("New Owner")}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                    {t(
                      "Fill in the details and save to create a new owner record.",
                    )}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteDialogOpen(open);
        }}
      >
        <DialogContent
          className="rounded-2xl sm:max-w-md overflow-hidden p-0 gap-0"
          onInteractOutside={(e) => {
            if (isDeleting) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isDeleting) e.preventDefault();
          }}
        >
          <div className="relative px-6 pt-6 pb-5">
            <div
              className="absolute inset-0 bg-gradient-to-b from-destructive/[0.07] to-transparent pointer-events-none"
              aria-hidden
            />
            <DialogHeader className="relative space-y-4 pe-0">
              <div className="flex justify-center items-center bg-destructive/10 mx-auto rounded-2xl ring-4 ring-destructive/10 w-14 h-14">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div className="space-y-2 text-center sm:text-start">
                <DialogTitle className="font-outfit text-xl">
                  {t("Delete Owner")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground leading-relaxed">
                  {t(
                    "Are you sure you want to delete this owner? This action cannot be undone.",
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="relative flex items-center gap-3 bg-muted/50 mt-5 p-3.5 border border-border/60 rounded-xl">
              <div className="flex justify-center items-center bg-amber-500/15 rounded-xl w-11 h-11 font-outfit font-bold text-amber-800 text-base shrink-0 overflow-hidden">
                {currentAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentAvatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 text-start">
                <p className="font-semibold text-foreground truncate" dir="auto">
                  {displayName}
                </p>
                {owner?.phone ? (
                  <p
                    className="mt-0.5 text-muted-foreground text-sm tabular-nums"
                    dir="ltr"
                  >
                    {owner.phone}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="relative mt-4 text-muted-foreground text-xs leading-relaxed text-start">
              {t(
                "Linked properties will keep their records, but this owner will be removed.",
              )}
            </p>
          </div>

          <DialogFooter className="bg-muted/30 px-6 py-4 border-border/60 border-t sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              className="rounded-xl h-10"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="bg-destructive hover:bg-destructive/90 rounded-xl h-10 text-destructive-foreground gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Deleting...")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {t("Delete Owner")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
