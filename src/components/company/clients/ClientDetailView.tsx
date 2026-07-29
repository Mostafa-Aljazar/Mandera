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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCombobox } from "@/components/ui/country-combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  X,
  User,
  Save,
  Home,
  Phone,
  MessageCircle,
  ChevronsUpDown,
  Check,
  MapPin,
  Megaphone,
  Building2,
  FileText,
  History,
  Key,
  CalendarClock,
  Loader2,
  UserPlus,
  ArrowLeft,
  Camera,
  UploadCloud,
  Trash2,
  CalendarDays,
  Clock3,
  ClipboardList,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import StatusUpdateModal from "@/components/common/StatusUpdateModal";
import StatusHistoryDisplay from "@/components/common/StatusHistoryDisplay";
import LinkedPropertyCard, {
  propertyDisplayTitle,
} from "@/components/company/properties/LinkedPropertyCard";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import { cn } from "@/lib/utils";
import {
  ClientSchema,
  type TClientSchema,
  type TClientSchemaOutput,
} from "@/validations/client.schema";
import {
  useClient,
  useClientStatuses,
  useCreateClient,
  useUpdateClient,
} from "@/hooks/queries/useClients";
import {
  useProperties,
  useCompanyEmployeesLookup,
} from "@/hooks/queries/useProperties";
import { useLanguage } from "@/contexts/LanguageContext";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";
import { countryLabel, normalizeCountryValue } from "@/lib/countries";

export type ClientFormData = TClientSchema;

const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&auto=format&fit=crop&q=80";

const MARKETING_CHANNELS = [
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

const CLIENT_TABS = ["info", "properties", "status", "summary"] as const;
type ClientTab = (typeof CLIENT_TABS)[number];

function resolveClientTab(raw: string | null, isNew: boolean): ClientTab {
  if (raw && (CLIENT_TABS as readonly string[]).includes(raw)) {
    if (isNew && raw === "status") return "info";
    return raw as ClientTab;
  }
  return "info";
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

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
      <div className="flex items-start gap-2.5 bg-muted/30 px-4 sm:px-5 py-3.5 border-border/50 border-b">
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
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

interface ClientDetailViewProps {
  clientId?: string | null;
}

export default function ClientDetailView({
  clientId = null,
}: ClientDetailViewProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === "ar" ? ar : enUS;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { company, currentUser } = useCompanyAuth();
  const isNew = !clientId;

  const tabFromUrl = resolveClientTab(searchParams.get("tab"), isNew);
  const [activeTab, setActiveTab] = useState<ClientTab>(tabFromUrl);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    data: client,
    isLoading: isLoadingClient,
    isError,
    refetch: refetchClient,
  } = useClient(clientId ?? undefined, company?.id);

  const { data: propertiesData } = useProperties(company?.id);
  const properties = propertiesData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: statusesData } = useClientStatuses(company?.id);
  const statuses = statusesData ?? [];

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();

  const form = useForm<TClientSchema, unknown, TClientSchemaOutput>({
    resolver: zodResolver(ClientSchema(t)),
    defaultValues: {
      name_en: "",
      name_ar: "",
      phone: "",
      country_code: "United Arab Emirates",
      interest_type: "Sale",
      interested_properties: [],
      employee_id:
        currentUser?.role === "company_employee" ? currentUser.id : "",
      marketing_channel: "",
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name_en: client.name_en || client.name || "",
        name_ar: client.name_ar || client.name || "",
        phone: client.phone || "",
        country_code: normalizeCountryValue(
          client.country_code || "United Arab Emirates",
        ),
        interest_type: client.interest_type || "Sale",
        interested_properties: client.interested_properties || [],
        employee_id: client.employee_id || "",
        marketing_channel: client.marketing_channel || "",
      });
      setPropertySearchOpen(false);
    } else if (isNew) {
      form.reset({
        name_en: "",
        name_ar: "",
        phone: "",
        country_code: "United Arab Emirates",
        interest_type: "Sale",
        interested_properties: [],
        employee_id:
          currentUser?.role === "company_employee" ? currentUser.id : "",
        marketing_channel: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isNew, currentUser]);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const selectTab = (tab: ClientTab) => {
    if (isNew && tab === "status") return;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "info") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (isError && !isNew) {
      toast.error(t("Client not found"));
      router.replace("/company/clients");
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
  }, [client?.id, client?.avatar_url]);

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
      toast.error(t("Client photo must be less than 2MB."));
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const interestedProperties = form.watch("interested_properties");
  const interestType = form.watch("interest_type");
  const isSale = interestType === "Sale";
  const watchedNameEn = form.watch("name_en");
  const watchedNameAr = form.watch("name_ar");
  const displayName =
    bilingualLabel(
      {
        name_en: client?.name_en || watchedNameEn,
        name_ar: client?.name_ar || watchedNameAr,
        name: client?.name,
      },
      language,
    ) || t("New Client");
  const employeeId = form.watch("employee_id");
  const assignedEmployee = employees.find((e) => e.id === employeeId);
  const employeeName =
    employeeDisplayName(
      assignedEmployee,
      language,
      assignedEmployee?.name || client?.employee?.name,
    ) || t("Unassigned");
  const employeeAvatarUrl = assignedEmployee?.avatar_url || null;
  const currentAvatarUrl =
    removeAvatar
      ? null
      : avatarPreview || client?.avatar_url || null;

  let followUp: { isOverdue: boolean; label: string } | null = null;
  if (client?.follow_up_date) {
    const dateStr = client.follow_up_date.split(" ")[0];
    const timeStr = client.follow_up_time || "00:00";
    const followUpDateTime = new Date(`${dateStr}T${timeStr}:00`);
    followUp = {
      isOverdue: isBefore(followUpDateTime, new Date()),
      label: `${format(followUpDateTime, "MMM d, yyyy")} · ${client.follow_up_time || "00:00"}`,
    };
  }

  const handlePropertySelect = (propertyId: string) => {
    if (interestedProperties.includes(propertyId)) return;
    if (interestedProperties.length >= 4) {
      toast.warning(t("Maximum 4 properties can be selected."));
      return;
    }
    form.setValue(
      "interested_properties",
      [...interestedProperties, propertyId],
      { shouldValidate: true },
    );
  };

  const removeProperty = (propertyId: string) => {
    form.setValue(
      "interested_properties",
      interestedProperties.filter((id) => id !== propertyId),
      { shouldValidate: true },
    );
  };

  const handleSave = form.handleSubmit(async (formData) => {
    if (!company?.id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name_en: formData.name_en,
        name_ar: formData.name_ar,
        phone: formData.phone,
        country_code: formData.country_code,
        interest_type: formData.interest_type,
        interested_properties: formData.interested_properties,
        employee_id:
          isNew && currentUser?.role === "company_employee"
            ? currentUser.id
            : formData.employee_id,
        marketing_channel: formData.marketing_channel,
        avatar: avatarFile,
        removeAvatar: removeAvatar && !avatarFile,
      };

      if (client?.id) {
        const result = await updateClientMutation.mutateAsync({
          id: client.id,
          companyId: company.id,
          ...payload,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Client updated successfully."));
        clearAvatarSelection();
        setRemoveAvatar(false);
        refetchClient();
      } else {
        const result = await createClientMutation.mutateAsync({
          companyId: company.id,
          ...payload,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Client created successfully."));
        clearAvatarSelection();
        setRemoveAvatar(false);
        router.replace(`/company/clients/${result.data!.id}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("Error saving client.");
      toast.error(
        message === "Client photo must be less than 2MB."
          ? t("Client photo must be less than 2MB.")
          : message === "Please upload a JPG, PNG, or WebP image."
            ? t("Please upload a JPG, PNG, or WebP image.")
            : message,
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleStatusSuccess = () => {
    setHistoryRefreshTrigger((prev) => prev + 1);
    refetchClient();
  };

  const cleanPhone = (form.watch("phone") || "").replace(/\D/g, "");
  const propertyCount = interestedProperties.length;

  const overviewPanel = (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
          {t("Assigned Agent")}
        </p>
        <div className="bg-card shadow-sm p-4 border border-border/60 rounded-xl text-center">
          <div className="flex justify-center items-center bg-primary/10 mx-auto mb-3 rounded-full ring-4 ring-primary/5 w-14 h-14 font-outfit font-bold text-primary text-xl overflow-hidden">
            {employeeAvatarUrl ? (
              <img
                src={employeeAvatarUrl}
                alt={employeeName}
                className="w-full h-full object-cover"
              />
            ) : (
              employeeName.charAt(0).toUpperCase()
            )}
          </div>
          <p className="font-semibold text-foreground text-sm" dir="auto">
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
              {propertyCount}/4
            </span>
          </div>
          <div className="flex justify-between items-center gap-2 bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
            <span className="flex items-center gap-2 text-muted-foreground min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t("Country")}</span>
            </span>
            <span className="font-semibold text-end truncate max-w-[55%]">
              {countryLabel(form.watch("country_code"), language) ||
                countryLabel("United Arab Emirates", language)}
            </span>
          </div>
          {followUp ? (
            <div
              className={cn(
                "flex justify-between items-center gap-2 px-3 py-2.5 border rounded-lg text-sm",
                followUp.isOverdue
                  ? "bg-red-500/5 border-red-200/60"
                  : "bg-amber-500/5 border-amber-200/60",
              )}
            >
              <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("Follow-up")}</span>
              </span>
              <span
                className={cn(
                  "font-semibold text-xs text-end shrink-0",
                  followUp.isOverdue ? "text-red-600" : "text-amber-600",
                )}
              >
                <bdi dir="ltr">{followUp.label}</bdi>
              </span>
            </div>
          ) : null}
          {client?.created_at ? (
            <div className="flex justify-between items-center gap-2 bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
              <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("Created At")}</span>
              </span>
              <span
                className="font-semibold text-end tabular-nums text-xs sm:text-sm shrink-0"
                dir="ltr"
              >
                {format(new Date(client.created_at), "dd MMM yyyy", {
                  locale: dateLocale,
                })}
              </span>
            </div>
          ) : null}
          {client?.updated_at ? (
            <div className="flex justify-between items-center gap-2 bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
              <span className="flex items-center gap-2 text-muted-foreground min-w-0">
                <Clock3 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("Updated At")}</span>
              </span>
              <span
                className="font-semibold text-end tabular-nums text-xs sm:text-sm shrink-0"
                dir="ltr"
              >
                {format(new Date(client.updated_at), "dd MMM yyyy", {
                  locale: dateLocale,
                })}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {isNew ? (
        <div className="flex flex-col items-center bg-primary/5 p-5 border border-primary/15 border-dashed rounded-xl text-center">
          <UserPlus className="mb-2 w-8 h-8 text-primary/50" />
          <p className="font-medium text-foreground text-sm">
            {t("New Client")}
          </p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            {t(
              "Fill in the details and save to create a new client record.",
            )}
          </p>
        </div>
      ) : null}
    </div>
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const leaveSummaryOnDesktop = () => {
      if (mq.matches && activeTab === "summary") {
        selectTab("info");
      }
    };
    leaveSummaryOnDesktop();
    mq.addEventListener("change", leaveSummaryOnDesktop);
    return () => mq.removeEventListener("change", leaveSummaryOnDesktop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (!isNew && isLoadingClient) {
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
    <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/company/clients">
          <Button variant="ghost" size="sm" className="gap-2 -ms-2 h-9">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t("Back to Clients")}
          </Button>
        </Link>
        {client && cleanPhone ? (
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
                WhatsApp
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
        <div className="relative bg-gradient-to-r from-background via-muted/20 to-background border-border/60 border-b">
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="relative flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5">
            <div
              className={cn(
                "relative flex justify-center items-center rounded-2xl w-12 h-12 sm:w-14 sm:h-14 font-outfit font-bold text-lg sm:text-xl shadow-sm shrink-0 ring-2 ring-offset-2 ring-offset-background overflow-hidden",
                isSale
                  ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30"
                  : "bg-sky-500/10 text-sky-700 ring-sky-500/30",
              )}
            >
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
              <span
                className={cn(
                  "absolute -bottom-0.5 -end-0.5 rounded-full w-3.5 h-3.5 border-2 border-background",
                  isSale ? "bg-emerald-500" : "bg-sky-500",
                )}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                {client ? t("Client Profile") : t("Add New Client")}
              </p>
              <h1
                className="mt-0.5 font-outfit font-bold text-foreground text-lg sm:text-2xl truncate tracking-tight"
                dir="auto"
              >
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] h-5 font-medium",
                    isSale
                      ? "text-emerald-700 border-emerald-200 bg-emerald-500/8"
                      : "text-sky-700 border-sky-200 bg-sky-500/8",
                  )}
                >
                  {isSale ? (
                    <Home className="w-3 h-3 me-1" />
                  ) : (
                    <Key className="w-3 h-3 me-1" />
                  )}
                  {isSale ? t("For Sale") : t("For Rent")}
                </Badge>
                {(client?.marketing_channel ||
                  form.watch("marketing_channel")) && (
                  <Badge
                    variant="secondary"
                    className="text-[11px] h-5 font-normal max-w-[140px] sm:max-w-none"
                  >
                    <Megaphone className="w-3 h-3 me-1 shrink-0" />
                    <span className="truncate">
                      {client?.marketing_channel ||
                        form.watch("marketing_channel")}
                    </span>
                  </Badge>
                )}
                {followUp ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] h-5",
                      followUp.isOverdue
                        ? "text-red-600 border-red-200 bg-red-500/8"
                        : "text-amber-600 border-amber-200 bg-amber-500/8",
                    )}
                  >
                    <CalendarClock className="w-3 h-3 me-1" />
                    {followUp.isOverdue ? t("Overdue") : t("Upcoming")}
                  </Badge>
                ) : null}
              </div>
            </div>

            {client && cleanPhone ? (
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
                    WhatsApp
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex lg:flex-row flex-col">
          <div className="flex flex-col flex-1 min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={(value) => selectTab(value as ClientTab)}
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
                      },
                      {
                        value: "status" as const,
                        icon: History,
                        label: t("Status & History"),
                        shortLabel: t("Status"),
                        disabled: isNew,
                      },
                      {
                        value: "summary" as const,
                        icon: ClipboardList,
                        label: t("Summary"),
                        shortLabel: t("Summary"),
                        mobileOnly: true,
                      },
                    ].map(
                      ({
                        value,
                        icon: Icon,
                        label,
                        shortLabel,
                        count,
                        disabled,
                        mobileOnly,
                      }) => (
                        <TabsTrigger
                          key={value}
                          id={`client-tab-${value}`}
                          value={value}
                          disabled={disabled}
                          className={cn(
                            "gap-1.5 data-[state=active]:bg-transparent px-2.5 sm:px-3.5 rounded-none border-transparent border-b-2 h-11 data-[state=active]:border-primary data-[state=active]:shadow-none text-xs sm:text-sm shrink-0",
                            "data-[state=inactive]:text-muted-foreground",
                            mobileOnly && "lg:hidden",
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="sm:hidden">
                            {shortLabel || label}
                          </span>
                          <span className="hidden sm:inline">{label}</span>
                          {count !== undefined && count > 0 ? (
                            <span className="bg-primary/10 ms-0.5 px-1.5 py-0.5 rounded-full font-medium text-[10px] text-primary tabular-nums">
                              {count}
                            </span>
                          ) : null}
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
                    id="client-panel-info"
                    className="space-y-5 mt-0 p-4 sm:p-6"
                  >
                    <SectionCard
                      title={t("Client photo")}
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
                        <Avatar
                          className={cn(
                            "mx-auto sm:mx-0 rounded-2xl w-20 h-20 ring-2 shrink-0",
                            isSale
                              ? "bg-emerald-500/10 ring-emerald-500/20"
                              : "bg-sky-500/10 ring-sky-500/20",
                          )}
                        >
                          {currentAvatarUrl ? (
                            <AvatarImage
                              src={currentAvatarUrl}
                              alt={t("Client photo")}
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback
                            className={cn(
                              "rounded-2xl font-outfit font-bold text-xl",
                              isSale
                                ? "bg-emerald-500/10 text-emerald-800"
                                : "bg-sky-500/10 text-sky-800",
                            )}
                          >
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
                            {(avatarFile || client?.avatar_url) &&
                            !removeAvatar ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 h-9 text-destructive hover:text-destructive"
                                onClick={() => {
                                  clearAvatarSelection();
                                  if (client?.avatar_url) {
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
                          name="country_code"
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
                      <div className="space-y-5">
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
                                    {MARKETING_CHANNELS.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
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
                            name="employee_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  {t("Assigned Agent")} *
                                </FormLabel>
                                <Select
                                  key={`employee-${language}`}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-background h-10">
                                      <SelectValue
                                        placeholder={t("Select Agent")}
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {employees.map((e) => (
                                      <SelectItem key={e.id} value={e.id}>
                                        <span dir="auto">
                                          {employeeDisplayName(
                                            e,
                                            language,
                                            e.name,
                                          ) || e.id}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="interest_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs mb-3 block">
                                {t("Primary Interest")}
                              </FormLabel>
                              <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                                {[
                                  {
                                    value: "Sale",
                                    icon: Home,
                                    label: t("Looking to Buy (Sale)"),
                                    desc: t("Purchase property"),
                                    color: "emerald",
                                  },
                                  {
                                    value: "Rent",
                                    icon: Key,
                                    label: t("Looking to Rent"),
                                    desc: t("Rent property"),
                                    color: "sky",
                                  },
                                ].map(
                                  ({
                                    value,
                                    icon: Icon,
                                    label,
                                    desc,
                                    color,
                                  }) => (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => field.onChange(value)}
                                      className={cn(
                                        "flex items-start gap-3 p-4 border-2 rounded-xl text-start transition-all",
                                        field.value === value
                                          ? color === "emerald"
                                            ? "border-emerald-500/60 bg-emerald-500/8 ring-1 ring-emerald-500/20"
                                            : "border-sky-500/60 bg-sky-500/8 ring-1 ring-sky-500/20"
                                          : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "flex justify-center items-center rounded-lg w-9 h-9 shrink-0",
                                          field.value === value
                                            ? color === "emerald"
                                              ? "bg-emerald-500/15 text-emerald-700"
                                              : "bg-sky-500/15 text-sky-700"
                                            : "bg-muted text-muted-foreground",
                                        )}
                                      >
                                        <Icon className="w-4 h-4" />
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground text-sm">
                                          {label}
                                        </p>
                                        <p className="mt-0.5 text-muted-foreground text-xs">
                                          {desc}
                                        </p>
                                      </div>
                                      {field.value === value ? (
                                        <Check
                                          className={cn(
                                            "w-4 h-4 shrink-0",
                                            color === "emerald"
                                              ? "text-emerald-600"
                                              : "text-sky-600",
                                          )}
                                        />
                                      ) : null}
                                    </button>
                                  ),
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </SectionCard>
                  </TabsContent>

                  <TabsContent
                    value="properties"
                    id="client-panel-properties"
                    className="space-y-5 mt-0 p-4 sm:p-6"
                  >
                    <SectionCard
                      title={t("Interested Properties")}
                      icon={Building2}
                    >
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs">
                              {t("Add Interested Property (Max 4)")}
                            </Label>
                            <span className="text-muted-foreground text-[11px] tabular-nums">
                              {propertyCount}/4
                            </span>
                          </div>
                          <Popover
                            open={propertySearchOpen}
                            onOpenChange={setPropertySearchOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={propertySearchOpen}
                                disabled={propertyCount >= 4}
                                className={cn(
                                  "justify-between gap-2 bg-background hover:bg-muted/40 w-full h-11 px-3 rounded-xl font-normal text-muted-foreground border-border/70 shadow-none",
                                  propertySearchOpen &&
                                    "ring-2 ring-primary/20 border-primary/30",
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0 text-start">
                                  <Building2 className="w-4 h-4 text-primary/70 shrink-0" />
                                  <span className="truncate">
                                    {propertyCount >= 4
                                      ? t("Maximum 4 properties can be selected.")
                                      : t("Search and select a property...")}
                                  </span>
                                </span>
                                <ChevronsUpDown className="opacity-50 w-4 h-4 shrink-0" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="p-0 w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-trigger-width)] rounded-xl border-border/70 shadow-[var(--shadow-hover)] overflow-hidden"
                              align="start"
                              sideOffset={6}
                            >
                              <Command className="rounded-xl">
                                <CommandInput
                                  placeholder={t("Search by code or title...")}
                                  className="h-11"
                                />
                                <CommandList className="max-h-[320px]">
                                  <CommandEmpty>
                                    <div className="flex flex-col items-center gap-2 py-8 px-4">
                                      <Building2 className="w-8 h-8 text-muted-foreground/40" />
                                      <p className="text-sm text-muted-foreground">
                                        {t("No property found.")}
                                      </p>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup className="p-1.5">
                                    {properties
                                      .filter(
                                        (p) => p.listing_type === interestType,
                                      )
                                      .map((p) => {
                                        const title =
                                          propertyDisplayTitle(p, language) ||
                                          p.title ||
                                          t("Unnamed");
                                        const titleIsArabic =
                                          language === "ar" &&
                                          Boolean(p.title_ar?.trim());
                                        const isSelected =
                                          interestedProperties.includes(p.id);
                                        const isSaleListing =
                                          p.listing_type === "Sale";
                                        const imageUrl =
                                          p.images?.[0] ||
                                          FALLBACK_PROPERTY_IMAGE;

                                        return (
                                          <CommandItem
                                            key={p.id}
                                            value={`${p.code} ${p.title} ${p.title_ar || ""} ${title}`}
                                            disabled={isSelected}
                                            onSelect={() => {
                                              handlePropertySelect(p.id);
                                              setPropertySearchOpen(false);
                                            }}
                                            className={cn(
                                              "gap-3 items-center p-2 rounded-xl data-[selected=true]:bg-primary/8 data-[selected=true]:text-foreground cursor-pointer",
                                              isSelected && "opacity-60",
                                            )}
                                          >
                                            <div className="relative rounded-lg w-14 h-14 sm:w-16 sm:h-16 overflow-hidden bg-muted shrink-0 ring-1 ring-border/50">
                                              <img
                                                src={imageUrl}
                                                alt={title}
                                                className="w-full h-full object-cover"
                                              />
                                              {isSelected ? (
                                                <span className="absolute inset-0 flex justify-center items-center bg-background/55">
                                                  <Check className="w-5 h-5 text-primary" />
                                                </span>
                                              ) : null}
                                            </div>

                                            <div className="flex flex-col flex-1 justify-center gap-1 min-w-0 text-start py-0.5">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    "text-[10px] px-1.5 py-0 h-5 font-medium border",
                                                    isSaleListing
                                                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                                                      : "bg-sky-500/10 text-sky-700 border-sky-500/25",
                                                  )}
                                                >
                                                  {isSaleListing
                                                    ? t("For Sale")
                                                    : t("For Rent")}
                                                </Badge>
                                                {isSelected ? (
                                                  <Badge
                                                    variant="secondary"
                                                    className="text-[10px] px-1.5 py-0 h-5 font-medium"
                                                  >
                                                    {t("Selected")}
                                                  </Badge>
                                                ) : null}
                                              </div>
                                              <p
                                                className="font-medium text-foreground text-sm leading-snug line-clamp-1"
                                                lang={
                                                  titleIsArabic ? "ar" : "en"
                                                }
                                              >
                                                <bdi
                                                  dir={
                                                    titleIsArabic
                                                      ? "rtl"
                                                      : "ltr"
                                                  }
                                                >
                                                  {title}
                                                </bdi>
                                              </p>
                                              <p className="font-mono text-primary/80 text-[11px] tracking-wide truncate">
                                                <bdi dir="ltr">{p.code}</bdi>
                                              </p>
                                            </div>

                                            <div className="flex flex-col justify-center shrink-0 self-center">
                                              <span className="inline-flex items-center gap-1 font-outfit font-semibold text-foreground text-sm tabular-nums">
                                                <bdi
                                                  dir="ltr"
                                                  className="inline-flex items-center gap-1"
                                                >
                                                  <DirhamIcon
                                                    className="w-3.5 h-3.5"
                                                    title={t("AED")}
                                                  />
                                                  {formatAedAmount(p.price)}
                                                </bdi>
                                              </span>
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {interestedProperties.length === 0 ? (
                          <div className="flex flex-col items-center bg-muted/20 py-12 border border-border/50 border-dashed rounded-xl text-center">
                            <Building2 className="opacity-20 mb-3 w-10 h-10 text-primary" />
                            <p className="font-medium text-foreground text-sm">
                              {t("No properties selected yet.")}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              {t("Search and add up to 4 properties")}
                            </p>
                          </div>
                        ) : (
                          <div className="gap-3 grid grid-cols-1">
                            {interestedProperties.map((id) => {
                              const prop = properties.find((p) => p.id === id);
                              if (!prop) return null;
                              return (
                                <div
                                  key={id}
                                  className="group/card relative w-full"
                                >
                                  <LinkedPropertyCard
                                    property={prop}
                                    className="w-full"
                                  />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    onClick={() => removeProperty(id)}
                                    aria-label={t("Remove")}
                                    className="top-2 end-2 absolute z-10 bg-background/95 hover:bg-destructive/10 shadow-sm border border-border/60 w-8 h-8 text-destructive"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </TabsContent>

                  <TabsContent
                    value="status"
                    id="client-panel-status"
                    className="mt-0 p-4 sm:p-6"
                  >
                    <div className="mb-4 sm:mb-5 text-start">
                      <h3 className="font-outfit font-semibold text-foreground text-base sm:text-lg">
                        {t("Status & History")}
                      </h3>
                      <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed">
                        {t(
                          "Track pipeline updates and schedule follow-ups for this client.",
                        )}
                      </p>
                    </div>
                    {client ? (
                      <div className="items-stretch gap-4 sm:gap-5 grid grid-cols-1 xl:grid-cols-12">
                        <div className="xl:col-span-5 order-1 min-w-0">
                          <StatusUpdateModal
                            entityType="client"
                            entityData={client}
                            statuses={statuses}
                            onSuccess={handleStatusSuccess}
                          />
                        </div>
                        <div className="xl:col-span-7 order-2 min-w-0 min-h-[260px] xl:min-h-[440px]">
                          <StatusHistoryDisplay
                            entityType="client"
                            entityId={client.id}
                            refreshTrigger={historyRefreshTrigger}
                          />
                        </div>
                      </div>
                    ) : null}
                  </TabsContent>

                  <TabsContent
                    value="summary"
                    id="client-panel-summary"
                    className="mt-0 p-4 sm:p-6 lg:hidden"
                  >
                    {overviewPanel}
                  </TabsContent>
                </div>
              </Form>
            </Tabs>

            {activeTab !== "status" && activeTab !== "summary" ? (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-muted/20 px-4 sm:px-6 py-4 border-border/60 border-t">
                <p className="text-muted-foreground text-xs sm:pe-4">
                  {activeTab === "info"
                    ? t(
                        "Changes to client information will be saved immediately.",
                      )
                    : t("Save to update interested properties.")}
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
                  {isSubmitting
                    ? t("Saving...")
                    : activeTab === "info"
                      ? t("Save Client Info")
                      : t("Save Properties")}
                </Button>
              </div>
            ) : null}
          </div>

          <aside className="hidden lg:flex flex-col bg-muted/15 w-72 xl:w-80 border-border/60 border-s shrink-0">
            <div className="p-5">{overviewPanel}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
