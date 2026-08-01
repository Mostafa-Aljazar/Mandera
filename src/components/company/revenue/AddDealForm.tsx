"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Loader2,
  ShieldAlert,
  User,
  Info,
} from "lucide-react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { canViewRevenue } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  CommandSeparator,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import { propertyDisplayTitle } from "@/components/company/properties/LinkedPropertyCard";
import {
  useCompanyEmployeesLookup,
  useProperties,
} from "@/hooks/queries/useProperties";
import { useClients } from "@/hooks/queries/useClients";
import { useCompleteDeal } from "@/hooks/queries/useRevenues";
import {
  DealCompletedSchema,
  type TDealCompletedSchema,
} from "@/validations/deal-completed.schema";

const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&auto=format&fit=crop&q=80";

interface AddDealFormProps {
  initialPropertyId?: string;
}

export default function AddDealForm({ initialPropertyId }: AddDealFormProps) {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const [propertySearchOpen, setPropertySearchOpen] = React.useState(false);
  const [employeeSearchOpen, setEmployeeSearchOpen] = React.useState(false);
  const [clientSearchOpen, setClientSearchOpen] = React.useState(false);
  const canManageRevenue = canViewRevenue(currentUser?.role);

  const { data: propertiesData, isLoading: loadingProperties } = useProperties(
    canManageRevenue ? company?.id : undefined,
  );
  const dealableProperties = useMemo(
    () =>
      (propertiesData ?? []).filter(
        (p) =>
          p.approval_status === "approved" &&
          p.status !== "Sold" &&
          p.status !== "Rented" &&
          p.status !== "Archived",
      ),
    [propertiesData],
  );

  const { data: employeesData, isLoading: loadingEmployees } =
    useCompanyEmployeesLookup(canManageRevenue ? company?.id : undefined);
  const employees = employeesData ?? [];

  const { data: clientsData, isLoading: loadingClients } = useClients(
    canManageRevenue ? company?.id : undefined,
  );
  const clients = clientsData ?? [];

  const loading = loadingProperties || loadingEmployees || loadingClients;
  const completeDealMutation = useCompleteDeal();

  const form = useForm<TDealCompletedSchema>({
    resolver: zodResolver(DealCompletedSchema(t)),
    defaultValues: {
      property_id: initialPropertyId || "",
      employee_id: "",
      client_id: "",
      commission_value: "",
    },
  });

  const selectedPropertyId = form.watch("property_id");
  const selectedEmployeeId = form.watch("employee_id");
  const selectedProperty = useMemo(
    () => dealableProperties.find((p) => p.id === selectedPropertyId) ?? null,
    [dealableProperties, selectedPropertyId],
  );

  const agentClients = useMemo(
    () =>
      selectedEmployeeId
        ? clients.filter((c) => c.employee_id === selectedEmployeeId)
        : [],
    [clients, selectedEmployeeId],
  );
  const otherClients = useMemo(
    () =>
      selectedEmployeeId
        ? clients.filter((c) => c.employee_id !== selectedEmployeeId)
        : clients,
    [clients, selectedEmployeeId],
  );

  useEffect(() => {
    if (!canManageRevenue) return;
    if (!initialPropertyId) return;
    if (loadingProperties) return;
    const match = dealableProperties.find((p) => p.id === initialPropertyId);
    if (match) {
      form.setValue("property_id", match.id);
    }
  }, [
    canManageRevenue,
    initialPropertyId,
    loadingProperties,
    dealableProperties,
    form,
  ]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    const property =
      dealableProperties.find((p) => p.id === selectedPropertyId) ?? null;
    if (!property) return;
    const defaultCommission =
      ((property.price || 0) * (property.commission_percentage || 0)) / 100;
    form.setValue(
      "employee_id",
      property.employee_id || form.getValues("employee_id") || "",
    );
    form.setValue(
      "commission_value",
      defaultCommission ? defaultCommission.toString() : "",
    );
    // Only re-seed defaults when the selected property changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId]);

  const clientName = (client: (typeof clients)[number]) =>
    bilingualLabel(client, language) || client.name || client.id;

  const clientLabel = (client: (typeof clients)[number]) => {
    const name = clientName(client);
    return client.phone ? `${name} (${client.phone})` : name;
  };

  const agentLabel = (employee: (typeof employees)[number]) =>
    employeeDisplayName(employee, language, employee.name) ||
    employee.name ||
    employee.id;

  const handleSubmit = form.handleSubmit(async (formValues) => {
    if (!company?.id || !canManageRevenue) return;
    const property =
      dealableProperties.find((p) => p.id === formValues.property_id) ?? null;
    if (!property) {
      toast.error(t("Please select a property."));
      return;
    }

    try {
      const selectedEmp = employees.find((e) => e.id === formValues.employee_id);
      const selectedCli = clients.find((c) => c.id === formValues.client_id);
      if (!selectedEmp || !selectedCli) {
        toast.error(t("Please select both an employee and a client."));
        return;
      }

      const ownerName =
        bilingualLabel(property.owner, language) ||
        property.owner?.name ||
        "Unknown";
      const areaName =
        property.area_district_ref?.name || property.area || "";

      const result = await completeDealMutation.mutateAsync({
        propertyId: property.id,
        propertyCode: property.code,
        emirate: property.emirate || "",
        areaDistrict: areaName || null,
        companyId: company.id,
        employeeId: selectedEmp.id,
        employeeName: agentLabel(selectedEmp),
        clientId: selectedCli.id,
        clientName: clientName(selectedCli),
        ownerName,
        commissionValue: Number(formValues.commission_value) || 0,
        createdBy: currentUser?.id || null,
        createdByName: currentUser?.name || "System",
      });

      if (result.error) throw new Error(result.error);

      toast.success(t("Property status updated successfully"));
      router.push("/company/revenue");
    } catch (err) {
      console.error("Deal completion failed:", err);
      toast.error((err as Error).message || t("Error saving deal completion."));
    }
  });

  if (!canManageRevenue) {
    return (
      <div className="flex justify-center items-center px-4 py-16">
        <div className="bg-card shadow-[var(--shadow-subtle)] mx-auto p-8 border border-border/60 rounded-2xl max-w-md text-center">
          <ShieldAlert className="mx-auto mb-4 w-12 h-12 text-destructive" />
          <h2 className="mb-2 font-outfit font-bold text-foreground text-2xl">
            {t("Access Denied")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t(
              "You do not have permission to view the revenue page. This area is restricted to company managers.",
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl">
      <div className="mb-6">
        <Link href="/company/revenue">
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2 h-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="me-2 rtl:rotate-180 w-4 h-4" />
            {t("Back to Revenue")}
          </Button>
        </Link>
      </div>

      <div className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
        <div
          className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.08] to-transparent h-24 pointer-events-none"
          aria-hidden
        />
        <div className="relative p-5 sm:p-7 border-border/60 border-b">
          <div className="flex items-start gap-3">
            <span className="flex justify-center items-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-11 h-11 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-outfit font-bold text-foreground text-xl sm:text-2xl tracking-tight">
                {t("Add Deal")}
              </h1>
              <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                {t(
                  "Finalize this deal to update the property status and record revenue.",
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="relative p-5 sm:p-7">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <FormField
                  control={form.control}
                  name="property_id"
                  render={({ field }) => {
                    const selectedTitle = selectedProperty
                      ? propertyDisplayTitle(selectedProperty, language) ||
                        selectedProperty.title ||
                        selectedProperty.code
                      : "";
                    return (
                      <FormItem className="space-y-2">
                        <Label>{t("Select property")}</Label>
                        <Popover
                          open={propertySearchOpen}
                          onOpenChange={setPropertySearchOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={propertySearchOpen}
                                className={cn(
                                  "justify-between gap-2 bg-background hover:bg-muted/40 w-full h-11 px-3 rounded-xl font-normal border-border/70 shadow-none",
                                  selectedProperty
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                                  propertySearchOpen &&
                                    "ring-2 ring-primary/20 border-primary/30",
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0 text-start">
                                  <Building2 className="w-4 h-4 text-primary/70 shrink-0" />
                                  <span className="truncate">
                                    {selectedProperty
                                      ? `${selectedProperty.code} — ${selectedTitle}`
                                      : t("Search and select a property...")}
                                  </span>
                                </span>
                                <ChevronsUpDown className="opacity-50 w-4 h-4 shrink-0" />
                              </Button>
                            </FormControl>
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
                                      {dealableProperties.length === 0
                                        ? t("No eligible properties found.")
                                        : t("No property found.")}
                                    </p>
                                  </div>
                                </CommandEmpty>
                                <CommandGroup className="p-1.5">
                                  {dealableProperties.map((p) => {
                                    const title =
                                      propertyDisplayTitle(p, language) ||
                                      p.title ||
                                      t("Unnamed");
                                    const titleIsArabic =
                                      language === "ar" &&
                                      Boolean(p.title_ar?.trim());
                                    const isSelected = field.value === p.id;
                                    const isSaleListing =
                                      p.listing_type === "Sale";
                                    const imageUrl =
                                      p.images?.[0] || FALLBACK_PROPERTY_IMAGE;

                                    return (
                                      <CommandItem
                                        key={p.id}
                                        value={`${p.code} ${p.title} ${p.title_ar || ""} ${title}`}
                                        onSelect={() => {
                                          field.onChange(p.id);
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
                                          </div>
                                          <p
                                            className="font-medium text-foreground text-sm leading-snug line-clamp-1"
                                            lang={titleIsArabic ? "ar" : "en"}
                                          >
                                            <bdi
                                              dir={
                                                titleIsArabic ? "rtl" : "ltr"
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
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => {
                    const selectedEmp = employees.find(
                      (e) => e.id === field.value,
                    );
                    const selectedName = selectedEmp
                      ? agentLabel(selectedEmp)
                      : "";
                    return (
                      <FormItem className="space-y-2">
                        <Label>{t("Closing Agent *")}</Label>
                        <Popover
                          open={employeeSearchOpen}
                          onOpenChange={setEmployeeSearchOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={employeeSearchOpen}
                                className={cn(
                                  "justify-between gap-2 bg-background hover:bg-muted/40 w-full h-11 px-3 rounded-xl font-normal border-border/70 shadow-none",
                                  selectedEmp
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                                  employeeSearchOpen &&
                                    "ring-2 ring-primary/20 border-primary/30",
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0 text-start">
                                  {selectedEmp ? (
                                    <Avatar className="w-7 h-7 shrink-0">
                                      {selectedEmp.avatar_url ? (
                                        <AvatarImage
                                          src={selectedEmp.avatar_url}
                                          alt={selectedName}
                                        />
                                      ) : null}
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                        {selectedName.charAt(0).toUpperCase() || (
                                          <User className="w-3.5 h-3.5" />
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <User className="w-4 h-4 text-primary/70 shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {selectedEmp
                                      ? selectedName
                                      : t("Search and select employee...")}
                                  </span>
                                </span>
                                <ChevronsUpDown className="opacity-50 w-4 h-4 shrink-0" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="p-0 w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-trigger-width)] rounded-xl border-border/70 shadow-[var(--shadow-hover)] overflow-hidden"
                            align="start"
                            sideOffset={6}
                          >
                            <Command className="rounded-xl">
                              <CommandInput
                                placeholder={t("Search by name...")}
                                className="h-11"
                              />
                              <CommandList className="max-h-[320px]">
                                <CommandEmpty>
                                  <div className="flex flex-col items-center gap-2 py-8 px-4">
                                    <User className="w-8 h-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                      {t("No employee found.")}
                                    </p>
                                  </div>
                                </CommandEmpty>
                                <CommandGroup className="p-1.5">
                                  {employees.map((e) => {
                                    const name = agentLabel(e);
                                    const isSelected = field.value === e.id;
                                    return (
                                      <CommandItem
                                        key={e.id}
                                        value={`${name} ${e.name || ""} ${e.first_name_en || ""} ${e.first_name_ar || ""} ${e.last_name_en || ""} ${e.last_name_ar || ""}`}
                                        onSelect={() => {
                                          field.onChange(e.id);
                                          setEmployeeSearchOpen(false);
                                        }}
                                        className={cn(
                                          "gap-3 items-center p-2 rounded-xl data-[selected=true]:bg-primary/8 data-[selected=true]:text-foreground cursor-pointer",
                                          isSelected && "opacity-60",
                                        )}
                                      >
                                        <Avatar className="w-10 h-10 shrink-0">
                                          {e.avatar_url ? (
                                            <AvatarImage
                                              src={e.avatar_url}
                                              alt={name}
                                            />
                                          ) : null}
                                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                            {name.charAt(0).toUpperCase() || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col flex-1 min-w-0 text-start">
                                          <p className="font-medium text-foreground text-sm truncate">
                                            {name}
                                          </p>
                                        </div>
                                        <Check
                                          className={cn(
                                            "w-4 h-4 shrink-0",
                                            isSelected
                                              ? "opacity-100 text-primary"
                                              : "opacity-0",
                                          )}
                                        />
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => {
                    const selectedCli = clients.find(
                      (c) => c.id === field.value,
                    );
                    const selectedName = selectedCli
                      ? clientName(selectedCli)
                      : "";
                    const selectedIsAgentClient = Boolean(
                      selectedCli &&
                        selectedEmployeeId &&
                        selectedCli.employee_id === selectedEmployeeId,
                    );
                    const clientPickerEnabled = Boolean(selectedEmployeeId);

                    const renderClientItem = (
                      c: (typeof clients)[number],
                      isAgentClient: boolean,
                    ) => {
                      const name = clientName(c);
                      const isSelected = field.value === c.id;
                      return (
                        <CommandItem
                          key={c.id}
                          value={[
                            isAgentClient ? "agent" : "other",
                            name,
                            c.name || "",
                            c.name_en || "",
                            c.name_ar || "",
                            c.phone || "",
                          ].join(" ")}
                          onSelect={() => {
                            field.onChange(c.id);
                            setClientSearchOpen(false);
                          }}
                          className={cn(
                            "gap-3 items-center p-2 rounded-xl data-[selected=true]:bg-primary/8 data-[selected=true]:text-foreground cursor-pointer",
                            isSelected && "opacity-60",
                          )}
                        >
                          <Avatar className="w-10 h-10 shrink-0">
                            {c.avatar_url ? (
                              <AvatarImage src={c.avatar_url} alt={name} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                              {name.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1 gap-1 min-w-0 text-start">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0 h-5 font-medium border",
                                  isAgentClient
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                                    : "bg-amber-500/10 text-amber-700 border-amber-500/25",
                                )}
                              >
                                {isAgentClient
                                  ? t("Closing agent's client")
                                  : t("Not this agent's client")}
                              </Badge>
                            </div>
                            <p className="font-medium text-foreground text-sm truncate">
                              {name}
                            </p>
                            {c.phone ? (
                              <p
                                className="text-muted-foreground text-xs truncate"
                                dir="ltr"
                              >
                                {c.phone}
                              </p>
                            ) : null}
                          </div>
                          <Check
                            className={cn(
                              "w-4 h-4 shrink-0",
                              isSelected
                                ? "opacity-100 text-primary"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      );
                    };

                    return (
                      <FormItem className="space-y-2">
                        <Label>{t("Purchasing/Renting Client *")}</Label>
                        <p className="flex items-start gap-1.5 text-muted-foreground text-xs leading-relaxed">
                          <Info className="mt-0.5 w-3.5 h-3.5 text-primary/70 shrink-0" />
                          <span>
                            {t(
                              "Clients assigned to the closing agent appear first. You can still choose a client who is not assigned to that agent.",
                            )}
                          </span>
                        </p>
                        <Popover
                          open={clientSearchOpen && clientPickerEnabled}
                          onOpenChange={(open) => {
                            if (!clientPickerEnabled) return;
                            setClientSearchOpen(open);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={clientSearchOpen}
                                disabled={!clientPickerEnabled}
                                className={cn(
                                  "justify-between gap-2 bg-background hover:bg-muted/40 w-full h-11 px-3 rounded-xl font-normal border-border/70 shadow-none",
                                  selectedCli
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                                  clientSearchOpen &&
                                    "ring-2 ring-primary/20 border-primary/30",
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0 text-start">
                                  {selectedCli ? (
                                    <Avatar className="w-7 h-7 shrink-0">
                                      {selectedCli.avatar_url ? (
                                        <AvatarImage
                                          src={selectedCli.avatar_url}
                                          alt={selectedName}
                                        />
                                      ) : null}
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                        {selectedName.charAt(0).toUpperCase() || (
                                          <User className="w-3.5 h-3.5" />
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <User className="w-4 h-4 text-primary/70 shrink-0" />
                                  )}
                                  <span className="flex flex-col min-w-0 text-start">
                                    <span className="truncate">
                                      {!clientPickerEnabled
                                        ? t("Select a closing agent first")
                                        : selectedCli
                                          ? clientLabel(selectedCli)
                                          : t("Search and select client...")}
                                    </span>
                                    {selectedCli && clientPickerEnabled ? (
                                      <span
                                        className={cn(
                                          "text-[10px] font-medium truncate",
                                          selectedIsAgentClient
                                            ? "text-emerald-700"
                                            : "text-amber-700",
                                        )}
                                      >
                                        {selectedIsAgentClient
                                          ? t("Closing agent's client")
                                          : t("Not this agent's client")}
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                                <ChevronsUpDown className="opacity-50 w-4 h-4 shrink-0" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="z-50 p-0 w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-trigger-width)] rounded-xl border-border/70 shadow-[var(--shadow-hover)] overflow-hidden pointer-events-auto"
                            align="start"
                            sideOffset={6}
                          >
                            <Command className="rounded-xl">
                              <CommandInput
                                placeholder={t("Search by name or phone...")}
                                className="h-11"
                              />
                              <CommandList className="max-h-[360px]">
                                <CommandEmpty>
                                  <div className="flex flex-col items-center gap-2 py-8 px-4">
                                    <User className="w-8 h-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                      {t("No client found.")}
                                    </p>
                                  </div>
                                </CommandEmpty>
                                {agentClients.length > 0 ? (
                                  <CommandGroup
                                    heading={t("Closing agent's clients")}
                                    className="p-1.5"
                                  >
                                    {agentClients.map((c) =>
                                      renderClientItem(c, true),
                                    )}
                                  </CommandGroup>
                                ) : (
                                  <div className="px-3 py-3 text-muted-foreground text-xs">
                                    {t(
                                      "This closing agent has no assigned clients yet.",
                                    )}
                                  </div>
                                )}
                                {otherClients.length > 0 ? (
                                  <>
                                    <CommandSeparator />
                                    <CommandGroup
                                      heading={t("Other clients")}
                                      className="p-1.5"
                                    >
                                      {otherClients.map((c) =>
                                        renderClientItem(c, false),
                                      )}
                                    </CommandGroup>
                                  </>
                                ) : null}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="commission_value"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        {t("Commission Value (AED)")}
                      </Label>
                      <FormControl>
                        <Input
                          type="number"
                          className="bg-background h-10"
                          placeholder={t("Enter commission amount")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex sm:flex-row flex-col-reverse gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={completeDealMutation.isPending}
                    onClick={() => router.push("/company/revenue")}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 h-10 text-white sm:flex-1"
                    disabled={
                      completeDealMutation.isPending ||
                      dealableProperties.length === 0
                    }
                  >
                    {completeDealMutation.isPending ? (
                      <>
                        <Loader2 className="me-2 w-4 h-4 animate-spin" />
                        {t("Processing...")}
                      </>
                    ) : (
                      t("Confirm Deal")
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
