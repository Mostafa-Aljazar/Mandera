"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isValid, parseISO } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import SettingsSection from "@/components/company/settings/SettingsSection";
import { Button } from "@/components/ui/button";
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
import { Building2, Loader2 } from "lucide-react";
import {
  CompanyGeneralSettingsSchema,
  type TCompanyGeneralSettingsSchema,
} from "@/validations/company-general-settings.schema";
import { useUpdateCompanyGeneralSettings } from "@/hooks/queries/useSettings";

export default function GeneralSettingsTab() {
  const { t } = useTranslation();
  const { company, refreshCompany } = useCompanyAuth();
  const updateMutation = useUpdateCompanyGeneralSettings();

  const form = useForm<TCompanyGeneralSettingsSchema>({
    resolver: zodResolver(CompanyGeneralSettingsSchema(t)),
    defaultValues: {
      companyNameEn: "",
      companyNameAr: "",
      phone: "",
      adminName: "",
      email: "",
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        companyNameEn: company.company_name_en,
        companyNameAr: company.company_name_ar,
        phone: company.phone ?? "",
        adminName: company.admin_name ?? "",
        email: company.email,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  const handleSave = form.handleSubmit(async (data) => {
    if (!company?.id) return;
    try {
      const result = await updateMutation.mutateAsync({
        companyId: company.id,
        companyNameEn: data.companyNameEn,
        companyNameAr: data.companyNameAr,
        phone: data.phone,
        adminName: data.adminName,
        email: data.email,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Settings updated successfully."));
      await refreshCompany();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || t("An error occurred."));
    }
  });

  const formatDate = (value: string | undefined) => {
    if (!value) return "—";
    const parsed = parseISO(value);
    return isValid(parsed) ? format(parsed, "PP") : "—";
  };

  return (
    <SettingsSection
      title={t("Company data")}
      description={t("company_general_settings_desc")}
      icon={Building2}
      action={
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-2 rounded-xl h-10"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("Saving...")}
            </>
          ) : (
            t("Save Changes")
          )}
        </Button>
      }
    >
      <Form {...form}>
        <form onSubmit={handleSave} className="space-y-8">
          <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="companyNameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`${t("Company name")} (EN)`}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" className="rounded-xl h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyNameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`${t("Company name")} (AR)`}</FormLabel>
                  <FormControl>
                    <Input {...field} dir="rtl" className="rounded-xl h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Phone")}</FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value || undefined}
                      onChange={(value) => field.onChange(value ?? "")}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Admin name")}</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-xl h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Contact Email")}</FormLabel>
                <FormControl>
                  <Input {...field} type="email" dir="ltr" className="rounded-xl h-11 max-w-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <div className="mt-8 pt-6 border-border/60 border-t">
        <h3 className="font-outfit font-semibold text-foreground text-sm tracking-tight">
          {t("Subscription")}
        </h3>
        <p className="mt-0.5 text-muted-foreground text-xs">
          {t("These details are managed by the platform administrator.")}
        </p>
        <dl className="gap-3 grid grid-cols-2 sm:grid-cols-4 mt-4">
          <div className="bg-muted/30 px-3 py-2.5 border border-border/40 rounded-xl">
            <dt className="text-muted-foreground text-xs">{t("Company code")}</dt>
            <dd className="mt-0.5 font-mono font-medium text-foreground text-sm" dir="ltr">
              {company?.company_code || "—"}
            </dd>
          </div>
          <div className="bg-muted/30 px-3 py-2.5 border border-border/40 rounded-xl">
            <dt className="text-muted-foreground text-xs">{t("Subscription start date")}</dt>
            <dd className="mt-0.5 font-medium text-foreground text-sm">
              {formatDate(company?.subscription_start_date)}
            </dd>
          </div>
          <div className="bg-muted/30 px-3 py-2.5 border border-border/40 rounded-xl">
            <dt className="text-muted-foreground text-xs">{t("Subscription end date")}</dt>
            <dd className="mt-0.5 font-medium text-foreground text-sm">
              {formatDate(company?.subscription_end_date)}
            </dd>
          </div>
          <div className="bg-muted/30 px-3 py-2.5 border border-border/40 rounded-xl">
            <dt className="text-muted-foreground text-xs">{t("Maximum employee count")}</dt>
            <dd className="mt-0.5 font-medium text-foreground text-sm tabular-nums">
              {company?.max_employee_count ?? "—"}
            </dd>
          </div>
        </dl>
      </div>
    </SettingsSection>
  );
}
