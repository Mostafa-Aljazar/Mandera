"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import StatusUpdateModal from "@/components/common/StatusUpdateModal";
import StatusHistoryDisplay from "@/components/common/StatusHistoryDisplay";
import { cn } from "@/lib/utils";
import { OwnerSchema, type TOwnerSchema } from "@/validations/owner.schema";
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

const COUNTRIES = [
  "UAE",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Bahrain",
  "Kuwait",
  "UK",
  "USA",
  "Other",
];

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

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
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
      <div className="flex items-center gap-2.5 bg-muted/30 px-5 py-3.5 border-border/50 border-b">
        <span className="flex justify-center items-center bg-primary/10 rounded-lg w-7 h-7 text-primary">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

interface OwnerDetailViewProps {
  ownerId?: string | null;
}

export default function OwnerDetailView({ ownerId = null }: OwnerDetailViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { company, currentUser } = useCompanyAuth();
  const isNew = !ownerId;

  const [activeTab, setActiveTab] = useState("info");
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  );

  const createOwnerMutation = useCreateOwner();
  const updateOwnerMutation = useUpdateOwner();
  const deleteOwnerMutation = useDeleteOwner();

  const form = useForm<TOwnerSchema>({
    resolver: zodResolver(OwnerSchema(t)),
    defaultValues: {
      name: "",
      phone: "",
      country: "UAE",
      assigned_employee_id:
        currentUser?.role === "company_employee" ? currentUser.id : "",
      marketing_channel: "",
    },
  });

  useEffect(() => {
    if (owner) {
      form.reset({
        name: owner.name || "",
        phone: owner.phone || "",
        country: owner.country || "UAE",
        assigned_employee_id: owner.assigned_employee_id || "",
        marketing_channel: owner.marketing_channel || "",
      });
      setActiveTab("info");
    } else if (isNew) {
      form.reset({
        name: "",
        phone: "",
        country: "UAE",
        assigned_employee_id:
          currentUser?.role === "company_employee" ? currentUser.id : "",
        marketing_channel: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, isNew, currentUser]);

  useEffect(() => {
    if (isError && !isNew) {
      toast.error(t("Owner not found"));
      router.replace("/company/owners");
    }
  }, [isError, isNew, router, t]);

  const displayName = owner?.name || form.watch("name") || t("New Owner");
  const employeeId = form.watch("assigned_employee_id");
  const employeeName =
    employees.find((e) => e.id === employeeId)?.name || t("Unassigned");
  const cleanPhone = (form.watch("phone") || "").replace(/\D/g, "");

  const handleSave = form.handleSubmit(async (formData) => {
    if (!company?.id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        country: formData.country,
        marketing_channel: formData.marketing_channel,
        assigned_employee_id:
          currentUser?.role === "company_employee" && isNew
            ? currentUser.id
            : formData.assigned_employee_id,
      };

      if (owner?.id) {
        const result = await updateOwnerMutation.mutateAsync({
          id: owner.id,
          ...payload,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner updated successfully."));
        refetchOwner();
      } else {
        const result = await createOwnerMutation.mutateAsync({
          companyId: company.id,
          ...payload,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner added successfully."));
        router.replace(`/company/owners/${result.data!.id}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("Error saving owner.");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDelete = async () => {
    if (!owner?.id || !window.confirm(t("Delete this owner?"))) return;
    try {
      const result = await deleteOwnerMutation.mutateAsync(owner.id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Owner deleted."));
      router.replace("/company/owners");
    } catch {
      toast.error(t("Could not delete. Owner might be linked to properties."));
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
    <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/company/owners">
          <Button variant="ghost" size="sm" className="gap-2 -ms-2 h-9">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t("Back to Owners")}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {owner && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete")}
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
          <div className="relative flex items-center gap-4 px-5 sm:px-6 py-5">
            <div className="relative flex justify-center items-center bg-amber-500/10 rounded-2xl ring-2 ring-amber-500/30 ring-offset-2 ring-offset-background w-14 h-14 font-outfit font-bold text-amber-800 text-xl shadow-sm shrink-0">
              {displayName.charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -end-0.5 bg-amber-500 border-2 border-background rounded-full w-3.5 h-3.5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                {owner ? t("Owner Profile") : t("Add New Owner")}
              </p>
              <h1 className="mt-0.5 font-outfit font-bold text-foreground text-xl sm:text-2xl truncate tracking-tight">
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
                    className="text-[11px] h-5 font-normal"
                  >
                    <Megaphone className="w-3 h-3 me-1" />
                    {owner?.marketing_channel ||
                      form.watch("marketing_channel")}
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
                    WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex lg:flex-row flex-col">
          <div className="flex flex-col flex-1 min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col"
            >
              <div className="bg-muted/10 px-4 sm:px-6 border-border/60 border-b">
                <TabsList className="justify-start bg-transparent gap-1 p-0 h-11 w-full overflow-x-auto">
                  {[
                    { value: "info", icon: FileText, label: t("Information") },
                    {
                      value: "properties",
                      icon: Building2,
                      label: t("Properties"),
                      count: propertyCount,
                      disabled: isNew,
                    },
                    {
                      value: "status",
                      icon: History,
                      label: t("Status & History"),
                      disabled: isNew,
                    },
                  ].map(({ value, icon: Icon, label, count, disabled }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      disabled={disabled}
                      className={cn(
                        "gap-1.5 data-[state=active]:bg-background px-4 rounded-none border-transparent border-b-2 h-11 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm shrink-0",
                        "data-[state=inactive]:text-muted-foreground",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                      {count !== undefined && count > 0 && (
                        <span className="bg-primary/10 ms-0.5 px-1.5 py-0.5 rounded-full font-medium text-[10px] text-primary tabular-nums">
                          {count}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <Form {...form}>
                <div>
                  <TabsContent value="info" className="space-y-5 mt-0 p-5 sm:p-6">
                    <SectionCard title={t("Contact Information")} icon={User}>
                      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-xs">
                                {t("Full Name")} *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder={t("e.g. John Doe")}
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
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background h-10">
                                    <SelectValue
                                      placeholder={t("Select Country")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {COUNTRIES.map((c) => (
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
                                      {emp.name || emp.id}
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
                    className="space-y-5 mt-0 p-5 sm:p-6"
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
                        <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                          {properties.map((prop) => (
                            <div
                              key={prop.id}
                              className="group relative flex gap-3 bg-muted/20 hover:bg-muted/40 p-3 border border-border/50 hover:border-primary/25 rounded-xl transition-all overflow-hidden"
                            >
                              <div className="rounded-lg w-[72px] h-[72px] overflow-hidden shrink-0">
                                <img
                                  src={
                                    prop.images?.[0] ||
                                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&auto=format&fit=crop&q=80"
                                  }
                                  alt={prop.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="flex-1 min-w-0 py-0.5">
                                <p
                                  className="font-semibold text-primary text-xs"
                                  dir="ltr"
                                >
                                  {prop.code}
                                </p>
                                <p className="mt-0.5 font-medium text-foreground text-sm line-clamp-2 leading-snug">
                                  {prop.title}
                                </p>
                                <p
                                  className="mt-1 font-outfit font-bold text-foreground text-sm"
                                  dir="ltr"
                                >
                                  AED {prop.price?.toLocaleString()}
                                </p>
                              </div>
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="top-2 end-2 absolute w-7 h-7"
                              >
                                <Link href={`/company/properties/${prop.id}`}>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  <TabsContent value="status" className="mt-0 p-5 sm:p-6">
                    <div className="mb-5">
                      <h3 className="font-outfit font-semibold text-foreground text-base">
                        {t("Status & History")}
                      </h3>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {t(
                          "Track pipeline updates and notes for this owner.",
                        )}
                      </p>
                    </div>
                    {owner && (
                      <div className="items-stretch gap-5 grid grid-cols-1 lg:grid-cols-12">
                        <div className="lg:col-span-5">
                          <StatusUpdateModal
                            entityType="owner"
                            entityData={owner}
                            statuses={statuses}
                            onSuccess={handleStatusSuccess}
                          />
                        </div>
                        <div className="lg:col-span-7 min-h-[460px]">
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-muted/20 px-5 sm:px-6 py-4 border-border/60 border-t">
                <p className="text-muted-foreground text-xs">
                  {t("Changes to owner information will be saved immediately.")}
                </p>
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="gap-2 min-w-[140px] h-10"
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

          <aside className="hidden lg:flex flex-col bg-muted/15 w-72 border-border/60 border-s shrink-0">
            <div className="p-5 space-y-5">
              {owner && cleanPhone && (
                <div className="space-y-3">
                  <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                    {t("Quick Actions")}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="justify-start gap-2 h-10"
                    >
                      <a href={`tel:${cleanPhone}`}>
                        <Phone className="w-4 h-4 text-primary" />
                        {t("Call")}
                      </a>
                    </Button>
                    <Button
                      asChild
                      className="justify-start bg-[#25D366] hover:bg-[#25D366]/90 gap-2 h-10 text-white"
                    >
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {owner && cleanPhone && <Separator />}

              <div className="space-y-3">
                <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                  {t("Assigned Employee")}
                </p>
                <div className="bg-card shadow-sm p-4 border border-border/60 rounded-xl text-center">
                  <div className="flex justify-center items-center bg-primary/10 mx-auto mb-3 rounded-full ring-4 ring-primary/5 w-14 h-14 font-outfit font-bold text-primary text-xl">
                    {employeeName.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-foreground text-sm">
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
                  <div className="flex justify-between items-center bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      {t("Properties")}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {propertyCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {t("Country")}
                    </span>
                    <span className="font-semibold">
                      {form.watch("country") || "UAE"}
                    </span>
                  </div>
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
    </div>
  );
};
