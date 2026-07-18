"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  X,
  User,
  Save,
  Home,
  Phone,
  MessageCircle,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import StatusUpdateModal from "@/components/StatusUpdateModal";
import StatusHistoryDisplay from "@/components/StatusHistoryDisplay";
import { cn } from "@/lib/utils";
import pb from "@/lib/pocketbaseClient";
import { ClientSchema, type TClientSchema } from "@/validations/client.schema";
import type {
  Client,
  Property,
  ClientStatus,
  CompanyEmployee,
  MarketingChannelRecord,
} from "@/types/pocketbase.types";

type SelectableEmployee = CompanyEmployee & { firstName?: string };

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

export type ClientFormData = TClientSchema;

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveInfo: (data: ClientFormData) => void | Promise<void>;
  onStatusAdded?: () => void;
  properties?: Property[];
  statuses?: ClientStatus[];
  employees?: SelectableEmployee[];
  isSubmitting?: boolean;
  // Not read by this component (it calls onStatusAdded instead) — some callers
  // (e.g. FollowUpCalendarWidget) still pass these; kept optional so those
  // call sites typecheck without changing this component's actual behavior.
  onAddStatus?: (statusForm: {
    status_id: string;
    note?: string;
    follow_up_date?: string;
    follow_up_time?: string;
  }) => void | Promise<void>;
  history?: unknown[];
  marketingChannels?: MarketingChannelRecord[];
}

const ClientDetailModal = ({
  client,
  isOpen,
  onClose,
  onSaveInfo,
  onStatusAdded,
  properties = [],
  statuses = [],
  employees = [],
  isSubmitting = false,
}: ClientDetailModalProps) => {
  const { t } = useTranslation();
  const { currentUser, company } = useCompanyAuth();
  const [activeTab, setActiveTab] = useState("info");
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);

  const form = useForm<TClientSchema>({
    resolver: zodResolver(ClientSchema(t)),
    defaultValues: {
      name: client?.name || "",
      phone: client?.phone || "",
      country_code: client?.country_code || "UAE",
      interest_type: client?.interest_type || "Sale",
      interested_properties: client?.interested_properties || [],
      employee_id:
        client?.employee_id ||
        (currentUser?.role === "company_employee" ? currentUser.id : ""),
      marketing_channel: client?.marketing_channel || "",
    },
  });

  useEffect(() => {
    if (client && isOpen) {
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
    } else if (!isOpen) {
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
  }, [client, isOpen, currentUser]);

  if (!isOpen) return null;

  const interestedProperties = form.watch("interested_properties");
  const interestType = form.watch("interest_type");

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

  const handleSaveInfo = form.handleSubmit((formData) => {
    const finalData = { ...formData };
    if (!client?.id && currentUser?.role === "company_employee") {
      finalData.employee_id = currentUser.id as string;
    }

    console.log("--- DEBUG: ClientDetailModal Triggering onSaveInfo ---");
    console.log("Payload Data to Save:", JSON.stringify(finalData, null, 2));

    onSaveInfo(finalData);
  });

  const handleStatusSuccess = () => {
    setHistoryRefreshTrigger((prev) => prev + 1);
    if (onStatusAdded) onStatusAdded();
  };

  const cleanPhone = (form.watch("phone") || "").replace(/\D/g, "");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-background p-0 max-w-5xl overflow-hidden">
        <DialogHeader className="flex flex-row justify-between items-center bg-muted/30 p-4 border-b">
          <DialogTitle className="flex items-center gap-2 font-outfit text-lg">
            <User className="w-5 h-5 text-primary" />
            {client ? `${t("Client")}: ${client.name}` : t("Add New Client")}
          </DialogTitle>
          {client && client.marketing_channel && (
            <Badge
              variant="secondary"
              className="bg-primary/10 mr-6 rtl:mr-0 rtl:ml-6 border-primary/20 text-primary"
            >
              {t("Source")}: {client.marketing_channel}
            </Badge>
          )}
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col w-full max-h-[85vh]"
        >
          <div className="px-4 pt-2 border-b overflow-x-auto">
            <TabsList className="grid grid-cols-3 bg-muted/50 w-full min-w-[300px] max-w-md h-9">
              <TabsTrigger value="info" className="text-xs">
                {t("Information")}
              </TabsTrigger>
              <TabsTrigger value="properties" className="text-xs">
                {t("Properties")}
              </TabsTrigger>
              <TabsTrigger
                value="status"
                disabled={!client}
                className="text-xs"
              >
                {t("Status & History")}
              </TabsTrigger>
            </TabsList>
          </div>

          <Form {...form}>
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            <TabsContent value="info" className="space-y-5 mt-0">
              <div className="gap-5 grid grid-cols-1 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel className="text-xs">{t("Full Name")} *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("Client Name")}
                          className="h-9"
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
                      <FormLabel className="text-xs">{t("Phone Number")} *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <PhoneInput {...field} className="flex-1" />
                        </FormControl>
                        {client && cleanPhone && (
                          <>
                            <Button
                              asChild
                              variant="outline"
                              size="icon"
                              className="hover:bg-primary/10 w-9 h-9 hover:text-primary transition-colors shrink-0"
                            >
                              <a href={`tel:${cleanPhone}`} title="Call Client">
                                <Phone className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              size="icon"
                              className="hover:bg-[#25D366]/10 border-border w-9 h-9 hover:text-[#25D366] transition-colors shrink-0"
                            >
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="WhatsApp Client"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("Country Code")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background h-9">
                            <SelectValue placeholder={t("Select Country")} />
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

                <FormField
                  control={form.control}
                  name="marketing_channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("Marketing Channel")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background h-9">
                            <SelectValue placeholder={t("Select Source")} />
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
                      <FormLabel className="text-xs">{t("Assigned Agent")} *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background h-9">
                            <SelectValue placeholder={t("Select Agent")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name || e.firstName || e.email}
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
                  name="interest_type"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 col-span-1 md:col-span-2 bg-muted/30 p-3 border border-border/50 rounded-lg">
                      <FormLabel className="block mb-2 text-xs">
                        {t("Primary Interest")}
                      </FormLabel>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex space-x-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Sale" id="m-sale" />
                          <Label
                            htmlFor="m-sale"
                            className="font-normal text-sm cursor-pointer"
                          >
                            {t("Looking to Buy (Sale)")}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Rent" id="m-rent" />
                          <Label
                            htmlFor="m-rent"
                            className="font-normal text-sm cursor-pointer"
                          >
                            {t("Looking to Rent")}
                          </Label>
                        </div>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end pt-3 border-t">
                <Button
                  onClick={handleSaveInfo}
                  disabled={isSubmitting}
                  className="gap-2 px-6 h-9 text-sm"
                >
                  <Save className="w-4 h-4" />{" "}
                  {isSubmitting ? t("Saving...") : t("Save Client Info")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent
              value="properties"
              className="flex flex-col space-y-5 mt-0 h-full"
            >
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
                      className="justify-between bg-background w-full h-9 font-normal text-muted-foreground"
                    >
                      {t("Search and select a property...")}
                      <ChevronsUpDown className="opacity-50 ml-2 w-4 h-4 shrink-0" />
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
                        <CommandEmpty>{t("No property found.")}</CommandEmpty>
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
                                    "mr-2 w-4 h-4 shrink-0",
                                    interestedProperties.includes(
                                      p.id,
                                    )
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex justify-between w-full text-sm">
                                  <span className="mr-2 truncate">
                                    {p.code} - {p.title}
                                  </span>
                                  <span className="text-muted-foreground shrink-0">
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

              <div className="flex-1 bg-muted/20 p-4 border border-dashed rounded-lg">
                <h4 className="flex items-center gap-2 mb-3 font-semibold text-xs">
                  <Home className="w-3.5 h-3.5 text-primary" />{" "}
                  {t("Selected Properties")} (
                  {interestedProperties.length}/4)
                </h4>
                {interestedProperties.length === 0 ? (
                  <p className="py-6 text-muted-foreground text-xs text-center italic">
                    {t("No properties selected yet.")}
                  </p>
                ) : (
                  <div className="gap-2 grid">
                    {interestedProperties.map((id) => {
                      const prop = properties.find((p) => p.id === id);
                      if (!prop) return null;
                      return (
                        <div
                          key={id}
                          className="flex justify-between items-center bg-card shadow-sm p-3 border hover:border-primary/30 rounded-lg transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-primary text-xs">
                              {prop.code}
                            </span>
                            <span className="text-foreground/80 text-xs line-clamp-1">
                              {prop.title}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProperty(id)}
                            className="hover:bg-destructive/10 p-0 rounded-full w-7 h-7 text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-3 border-t">
                <Button
                  onClick={handleSaveInfo}
                  disabled={isSubmitting}
                  className="gap-2 px-6 h-9 text-sm"
                >
                  <Save className="w-4 h-4" />{" "}
                  {isSubmitting ? t("Saving...") : t("Save Properties")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="status" className="mt-0">
              <div className="items-start gap-6 grid grid-cols-1 lg:grid-cols-12 h-full">
                <div className="lg:col-span-5">
                  <StatusUpdateModal
                    entityType="client"
                    entityData={client}
                    statuses={statuses}
                    onSuccess={handleStatusSuccess}
                  />
                </div>

                <div className="lg:col-span-7 h-[500px]">
                  <StatusHistoryDisplay
                    entityType="client"
                    entityId={client?.id}
                    refreshTrigger={historyRefreshTrigger}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailModal;
