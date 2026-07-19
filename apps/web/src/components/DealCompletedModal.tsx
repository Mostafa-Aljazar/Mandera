"use client";

import React, { useEffect } from "react";
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
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { useClients } from "@/hooks/queries/useClients";
import { useCompleteDeal } from "@/hooks/queries/useRevenues";
import type { PropertyWithRelations } from "@/types/supabase-entities.types";
import {
  DealCompletedSchema,
  type TDealCompletedSchema,
} from "@/validations/deal-completed.schema";

interface DealCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyWithRelations | null;
  onSuccess: () => void;
}

const DealCompletedModal = ({
  isOpen,
  onClose,
  property,
  onSuccess,
}: DealCompletedModalProps) => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const [clientSearchOpen, setClientSearchOpen] = React.useState(false);

  const { data: employeesData, isLoading: loadingEmployees } =
    useCompanyEmployeesLookup(isOpen ? company?.id : undefined);
  const employees = employeesData ?? [];

  const { data: clientsData, isLoading: loadingClients } = useClients(
    isOpen ? company?.id : undefined,
  );
  const clients = clientsData ?? [];

  const loading = loadingEmployees || loadingClients;
  const completeDealMutation = useCompleteDeal();

  const form = useForm<TDealCompletedSchema>({
    resolver: zodResolver(DealCompletedSchema(t)),
    defaultValues: {
      employee_id: "",
      client_id: "",
      commission_value: "",
    },
  });

  useEffect(() => {
    if (isOpen && property) {
      const defaultCommission =
        ((property.price || 0) * (property.commission_percentage || 0)) / 100;

      form.reset({
        employee_id: property.employee_id || "",
        client_id: "",
        commission_value: defaultCommission ? defaultCommission.toString() : "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, property]);

  const handleSubmit = form.handleSubmit(async (formValues) => {
    if (!property || !company?.id) return;
    try {
      const selectedEmp = employees.find((e) => e.id === formValues.employee_id)!;
      const selectedCli = clients.find((c) => c.id === formValues.client_id)!;
      const ownerName = property.owner?.name || "Unknown";
      const areaName = property.area_district_ref?.name || property.area || "";

      const result = await completeDealMutation.mutateAsync({
        propertyId: property.id,
        propertyCode: property.code,
        emirate: property.emirate || "",
        areaDistrict: areaName || null,
        companyId: company.id,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name || selectedEmp.id,
        clientId: selectedCli.id,
        clientName: selectedCli.name,
        ownerName,
        commissionValue: Number(formValues.commission_value) || 0,
        createdBy: currentUser?.id || null,
        createdByName: currentUser?.name || "System",
      });

      if (result.error) throw new Error(result.error);

      toast.success(t("Property status updated successfully"));
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Deal completion failed:", err);
      toast.error((err as Error).message || t("Error saving deal completion."));
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
                            {e.name || e.id}
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
          <Button variant="outline" onClick={onClose} disabled={completeDealMutation.isPending}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={completeDealMutation.isPending || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {completeDealMutation.isPending ? (
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
