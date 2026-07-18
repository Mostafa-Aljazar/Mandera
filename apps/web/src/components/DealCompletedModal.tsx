"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  CheckCircle2,
  Banknote,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import pb from "@/lib/pocketbaseClient";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type {
  CompanyEmployee,
  Client,
  Property,
} from "../types/pocketbase.types";
import {
  DealCompletedSchema,
  type TDealCompletedSchema,
} from "@/validations/deal-completed.schema";

interface DealPropertyData extends Property {
  expand?: {
    owner_id?: { name?: string };
    area_district?: { name?: string };
  };
}

interface DealCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: DealPropertyData | null;
  onSuccess: () => void;
}

const DealCompletedModal = ({
  isOpen,
  onClose,
  property,
  onSuccess,
}: DealCompletedModalProps) => {
  const { company } = useCompanyAuth();
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const { t } = useTranslation();

  const form = useForm<TDealCompletedSchema>({
    resolver: zodResolver(DealCompletedSchema(t)),
    defaultValues: {
      employee_id: "",
      client_id: "",
      commission_value: "",
    },
  });

  useEffect(() => {
    if (isOpen && company?.id && property) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [empRes, cliRes] = await Promise.all([
            pb
              .collection("company_employees")
              .getFullList({
                filter: `companyId="${company!.id}"`,
                $autoCancel: false,
              }),
            pb
              .collection("clients")
              .getFullList({
                filter: `company_id="${company!.id}"`,
                sort: "name",
                $autoCancel: false,
              }),
          ]);
          setEmployees(empRes as unknown as CompanyEmployee[]);
          setClients(cliRes as unknown as Client[]);

          const defaultCommission =
            ((property.price || 0) * (property.commission_percentage || 0)) /
            100;

          form.reset({
            employee_id: property.employee_id || "",
            client_id: "",
            commission_value: defaultCommission
              ? defaultCommission.toString()
              : "",
          });
        } catch (err) {
          toast.error(t("Failed to load necessary data for deal completion."));
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, company?.id, property, t]);

  const handleSubmit = form.handleSubmit(async (formValues) => {
    setSubmitting(true);
    try {
      const selectedEmp = employees.find((e) => e.id === formValues.employee_id)!;
      const selectedCli = clients.find((c) => c.id === formValues.client_id)!;
      const ownerName = property?.expand?.owner_id?.name || "Unknown";
      const areaName =
        property?.expand?.area_district?.name || property!.area || "";

      const updatePayload = { status: "Deal Completed" };
      console.log("--- DEBUG: DealCompletedModal EXACT REQUEST START ---");
      console.log("Collection: properties | Operation: update");
      console.log("Auth token present:", !!pb.authStore.token);
      console.log("Payload:", JSON.stringify(updatePayload, null, 2));

      let updatedProp;
      try {
        updatedProp = await pb
          .collection("properties")
          .update(property!.id, updatePayload, { $autoCancel: false });
        console.log("Success:", updatedProp.id);
      } catch (error) {
        const e = error as {
          status?: number;
          message?: string;
          response?: unknown;
        };
        console.error("PocketBase Error:", e.status, e.message, e.response);
        throw error;
      }

      if (updatedProp && updatedProp.id) {
        // 2. SECONDARY OPERATIONS: Revenues and History
        try {
          const revenueData = {
            property_code: property!.code,
            emirate: property!.emirate,
            area_district: areaName,
            commission_value: Number(formValues.commission_value) || 0,
            employee_id: selectedEmp.id,
            employee_name: selectedEmp.name || selectedEmp.email,
            deal_completion_date: new Date().toISOString(),
            client_id: selectedCli.id,
            client_name: selectedCli.name,
            owner_name: ownerName,
            company_id: company!.id,
          };

          console.log("--- DEBUG: DealCompletedModal EXACT REQUEST START ---");
          console.log("Collection: revenues | Operation: create");
          console.log("Auth token present:", !!pb.authStore.token);
          console.log("Payload:", JSON.stringify(revenueData, null, 2));

          const revResult = await pb
            .collection("revenues")
            .create(revenueData, { $autoCancel: false });
          console.log("Success:", revResult.id);
        } catch (revErr) {
          const e = revErr as {
            status?: number;
            message?: string;
            response?: unknown;
          };
          console.error(
            "PocketBase Error (revenues):",
            e.status,
            e.message,
            e.response,
          );
          console.warn("Secondary operation failed (revenues):", revErr);
        }

        try {
          const authModel = pb.authStore.model as unknown as {
            id: string;
            name?: string;
            email?: string;
          } | null;
          const historyData = {
            property_id: property!.id,
            status: "Deal Completed",
            note: `Deal completed with client ${selectedCli.name}`,
            created_by: authModel?.id,
            created_by_name: authModel?.name || authModel?.email || "System",
            company_id: company!.id,
          };

          console.log("--- DEBUG: DealCompletedModal EXACT REQUEST START ---");
          console.log(
            "Collection: property_status_history | Operation: create",
          );
          console.log("Auth token present:", !!pb.authStore.token);
          console.log("Payload:", JSON.stringify(historyData, null, 2));

          const histResult = await pb
            .collection("property_status_history")
            .create(historyData, { $autoCancel: false });
          console.log("Success:", histResult.id);
        } catch (histErr) {
          const e = histErr as {
            status?: number;
            message?: string;
            response?: unknown;
          };
          console.error(
            "PocketBase Error (status_history):",
            e.status,
            e.message,
            e.response,
          );
          console.warn("Secondary operation failed (status history):", histErr);
        }

        toast.success(t("Property status updated successfully"));
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Primary operation failed:", err);
      toast.error((err as Error).message || t("Error saving deal completion."));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {t("Complete Deal")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Finalize this deal to update the property status and record revenue.",
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <div className="space-y-4 py-4">
              <div className="flex justify-between bg-muted/50 p-3 border border-border/50 rounded-lg text-sm">
                <span className="text-muted-foreground">{t("Property:")}</span>
                <span className="font-semibold">{property?.code}</span>
              </div>

              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-2">
                    <Label>{t("Closing Agent *")}</Label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t("Select Employee")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name || e.email}
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
                name="client_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-2">
                    <Label>{t("Purchasing/Renting Client *")}</Label>
                    <Popover
                      open={clientSearchOpen}
                      onOpenChange={setClientSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientSearchOpen}
                            className="justify-between bg-background w-full font-normal"
                          >
                            {field.value
                              ? clients.find((c) => c.id === field.value)?.name +
                                " (" +
                                clients.find((c) => c.id === field.value)
                                  ?.phone +
                                ")"
                              : t("Search and select client...")}
                            <ChevronsUpDown className="opacity-50 ml-2 w-4 h-4 shrink-0" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="z-50 p-0 w-[400px] pointer-events-auto"
                        align="start"
                      >
                        <Command>
                          <CommandInput
                            placeholder={t("Search by name or phone...")}
                          />
                          <CommandList>
                            <CommandEmpty>{t("No client found.")}</CommandEmpty>
                            <CommandGroup>
                              {clients.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={`${c.name} ${c.phone}`}
                                  onSelect={() => {
                                    field.onChange(c.id);
                                    setClientSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 w-4 h-4",
                                      field.value === c.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {c.name} ({c.phone})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commission_value"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" /> {t("Commission Value (AED)")}
                    </Label>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t("Enter commission amount")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />{" "}
                {t("Processing...")}
              </>
            ) : (
              t("Confirm Deal")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DealCompletedModal;
