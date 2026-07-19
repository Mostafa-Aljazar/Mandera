"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MasterAdminHeader from "@/components/MasterAdminHeader";
import { useCreateCompany } from "@/hooks/queries/useCompanies";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { NewCompanySchema, type TNewCompanySchema } from "@/validations/new-company.schema";

const CompanyFormPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const createCompanyMutation = useCreateCompany();

  const form = useForm<TNewCompanySchema>({
    resolver: zodResolver(NewCompanySchema(t)),
    defaultValues: {
      companyName: "",
      email: "",
      password: "",
      subscriptionStartDate: "",
      subscriptionEndDate: "",
      maxEmployeeCount: 10,
    },
  });

  const subscriptionStartDate = form.watch("subscriptionStartDate");

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);

    try {
      const result = await createCompanyMutation.mutateAsync({
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
        subscriptionStartDate: formData.subscriptionStartDate,
        subscriptionEndDate: formData.subscriptionEndDate,
        maxEmployeeCount: Number(formData.maxEmployeeCount),
      });
      if (result.error) throw new Error(result.error);

      toast(
        `${t("Company created successfully. Company Code:")} ${result.data.companyCode}`,
      );
      router.push("/master-dashboard/companies");
    } catch (error) {
      console.error("Error creating company:", error);
      toast(t("Failed to create company"));
    } finally {
      setLoading(false);
    }
  });

  return (
    <>
      <Helmet>
        <title>{t("Add new company")}</title>
        <meta name="description" content="Create a new company account" />
      </Helmet>
      <MasterAdminHeader />
      <div className="bg-muted/30 min-h-[calc(100vh-80px)]">
        <div className="mx-auto px-4 py-12 container">
          <Button
            variant="outline"
            onClick={() => router.push("/master-dashboard/companies")}
            className="flex items-center gap-2 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Back to companies")}
          </Button>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">{t("Add new company")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Company name")}</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-foreground" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Email")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="text-foreground" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Password")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            minLength={8}
                            className="text-foreground"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="subscriptionStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Subscription start date")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="text-foreground" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subscriptionEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Subscription end date")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              min={subscriptionStartDate}
                              className="text-foreground"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="maxEmployeeCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Maximum employee count")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            className="text-foreground"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? t("Creating...") : t("Create company")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/master-dashboard/companies")}
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default CompanyFormPage;
