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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import StatusUpdateModal from "@/components/common/StatusUpdateModal";
import StatusHistoryDisplay from "@/components/common/StatusHistoryDisplay";
import { cn } from "@/lib/utils";
import { ClientSchema, type TClientSchema } from "@/validations/client.schema";
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

export type ClientFormData = TClientSchema;

const COUNTRIES = [
  "UAE",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Bahrain",
  "Kuwait",
  "UK",
  "USA",
];
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

interface ClientDetailViewProps {
  clientId?: string | null;
}

export default function ClientDetailView({ clientId = null }: ClientDetailViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { company, currentUser } = useCompanyAuth();
  const isNew = !clientId;

  const [activeTab, setActiveTab] = useState("info");
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const form = useForm<TClientSchema>({
    resolver: zodResolver(ClientSchema(t)),
    defaultValues: {
      name: "",
      phone: "",
      country_code: "UAE",
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
        name: client.name || "",
        phone: client.phone || "",
        country_code: client.country_code || "UAE",
        interest_type: client.interest_type || "Sale",
        interested_properties: client.interested_properties || [],
        employee_id: client.employee_id || "",
        marketing_channel: client.marketing_channel || "",
      });
      setActiveTab("info");
      setPropertySearchOpen(false);
    } else if (isNew) {
      form.reset({
        name: "",
        phone: "",
        country_code: "UAE",
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
    if (isError && !isNew) {
      toast.error(t("Client not found"));
      router.replace("/company/clients");
    }
  }, [isError, isNew, router, t]);

  const interestedProperties = form.watch("interested_properties");
  const interestType = form.watch("interest_type");
  const isSale = interestType === "Sale";
  const displayName = client?.name || form.watch("name") || t("New Client");
  const employeeId = form.watch("employee_id");
  const employeeName =
    employees.find((e) => e.id === employeeId)?.name ||
    client?.employee?.name ||
    t("Unassigned");

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

  const handleSaveInfo = form.handleSubmit(async (formData) => {
    if (!company?.id) return;
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      if (isNew && currentUser?.role === "company_employee") {
        finalData.employee_id = currentUser.id as string;
      }

      if (client?.id) {
        const result = await updateClientMutation.mutateAsync({
          id: client.id,
          ...finalData,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Client updated successfully."));
        refetchClient();
      } else {
        const result = await createClientMutation.mutateAsync({
          companyId: company.id,
          ...finalData,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Client created successfully."));
        router.replace(`/company/clients/${result.data!.id}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("Error saving client.");
      toast.error(message);
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
        {client && cleanPhone && (
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
        )}
      </div>

      <div className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-background via-muted/20 to-background border-border/60 border-b">
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="relative flex items-center gap-4 px-5 sm:px-6 py-5">
            <div
              className={cn(
                "relative flex justify-center items-center rounded-2xl w-14 h-14 font-outfit font-bold text-xl shadow-sm shrink-0 ring-2 ring-offset-2 ring-offset-background",
                isSale
                  ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30"
                  : "bg-sky-500/10 text-sky-700 ring-sky-500/30",
              )}
            >
              {displayName.charAt(0).toUpperCase()}
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
              <h1 className="mt-0.5 font-outfit font-bold text-foreground text-xl sm:text-2xl truncate tracking-tight">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
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
                    className="text-[11px] h-5 font-normal"
                  >
                    <Megaphone className="w-3 h-3 me-1" />
                    {client?.marketing_channel ||
                      form.watch("marketing_channel")}
                  </Badge>
                )}
                {followUp && (
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
                )}
              </div>
            </div>

            {client && cleanPhone && (
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
                                  placeholder={t("Client Name")}
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
                                {t("Country Code")}
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
                      <div className="space-y-5">
                        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="marketing_channel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  {t("Marketing Channel")}
                                </FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="bg-background h-10">
                                      <SelectValue
                                        placeholder={t("Select Source")}
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
                                        {e.name || e.id}
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
                                  ({ value, icon: Icon, label, desc, color }) => (
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
                                      {field.value === value && (
                                        <Check
                                          className={cn(
                                            "w-4 h-4 shrink-0",
                                            color === "emerald"
                                              ? "text-emerald-600"
                                              : "text-sky-600",
                                          )}
                                        />
                                      )}
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
                    className="space-y-5 mt-0 p-5 sm:p-6"
                  >
                    <SectionCard
                      title={t("Interested Properties")}
                      icon={Building2}
                    >
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            {t("Add Interested Property (Max 4)")}
                          </Label>
                          <Popover
                            open={propertySearchOpen}
                            onOpenChange={setPropertySearchOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={propertySearchOpen}
                                className="justify-between bg-background w-full h-10 font-normal text-muted-foreground"
                              >
                                {t("Search and select a property...")}
                                <ChevronsUpDown className="opacity-50 ms-2 w-4 h-4 shrink-0" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="p-0 w-[--radix-popover-trigger-width]"
                              align="start"
                            >
                              <Command>
                                <CommandInput
                                  placeholder={t("Search by code or title...")}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {t("No property found.")}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {properties
                                      .filter(
                                        (p) => p.listing_type === interestType,
                                      )
                                      .map((p) => (
                                        <CommandItem
                                          key={p.id}
                                          value={`${p.code} ${p.title}`}
                                          disabled={interestedProperties.includes(
                                            p.id,
                                          )}
                                          onSelect={() => {
                                            handlePropertySelect(p.id);
                                            setPropertySearchOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "me-2 w-4 h-4 shrink-0",
                                              interestedProperties.includes(p.id)
                                                ? "opacity-100"
                                                : "opacity-0",
                                            )}
                                          />
                                          <div className="flex justify-between w-full text-sm">
                                            <span className="me-2 truncate">
                                              {p.code} - {p.title}
                                            </span>
                                            <span
                                              className="text-muted-foreground shrink-0"
                                              dir="ltr"
                                            >
                                              AED {p.price?.toLocaleString()}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      ))}
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
                          <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                            {interestedProperties.map((id) => {
                              const prop = properties.find((p) => p.id === id);
                              if (!prop) return null;
                              return (
                                <div
                                  key={id}
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
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeProperty(id)}
                                    className="top-2 end-2 absolute hover:bg-destructive/10 w-7 h-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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

                  <TabsContent value="status" className="mt-0 p-5 sm:p-6">
                    <div className="mb-5">
                      <h3 className="font-outfit font-semibold text-foreground text-base">
                        {t("Status & History")}
                      </h3>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {t(
                          "Track pipeline updates and schedule follow-ups for this client.",
                        )}
                      </p>
                    </div>
                    {client && (
                      <div className="items-stretch gap-5 grid grid-cols-1 lg:grid-cols-12">
                        <div className="lg:col-span-5">
                          <StatusUpdateModal
                            entityType="client"
                            entityData={client}
                            statuses={statuses}
                            onSuccess={handleStatusSuccess}
                          />
                        </div>
                        <div className="lg:col-span-7 min-h-[460px]">
                          <StatusHistoryDisplay
                            entityType="client"
                            entityId={client.id}
                            refreshTrigger={historyRefreshTrigger}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Form>
            </Tabs>

            {activeTab !== "status" && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-muted/20 px-5 sm:px-6 py-4 border-border/60 border-t">
                <p className="text-muted-foreground text-xs">
                  {activeTab === "info"
                    ? t(
                        "Changes to client information will be saved immediately.",
                      )
                    : t("Save to update interested properties.")}
                </p>
                <Button
                  onClick={handleSaveInfo}
                  disabled={isSubmitting}
                  className="gap-2 min-w-[140px] h-10"
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
            )}
          </div>

          <aside className="hidden lg:flex flex-col bg-muted/15 w-72 border-border/60 border-s shrink-0">
            <div className="p-5 space-y-5">
              {client && cleanPhone && (
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
                        {t("Call Client")}
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

              {client && cleanPhone && <Separator />}

              <div className="space-y-3">
                <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                  {t("Assigned Agent")}
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
                      {propertyCount}/4
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {t("Country")}
                    </span>
                    <span className="font-semibold">
                      {form.watch("country_code") || "UAE"}
                    </span>
                  </div>
                  {followUp && (
                    <div
                      className={cn(
                        "flex justify-between items-center px-3 py-2.5 border rounded-lg text-sm",
                        followUp.isOverdue
                          ? "bg-red-500/5 border-red-200/60"
                          : "bg-amber-500/5 border-amber-200/60",
                      )}
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {t("Follow-up")}
                      </span>
                      <span
                        className={cn(
                          "font-semibold text-xs",
                          followUp.isOverdue
                            ? "text-red-600"
                            : "text-amber-600",
                        )}
                      >
                        {followUp.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isNew && (
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
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
