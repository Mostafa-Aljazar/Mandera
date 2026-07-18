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
import pb from "@/lib/pocketbaseClient";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import type { Company } from "@/types/pocketbase.types";
import { NewCompanySchema, type TNewCompanySchema } from "@/validations/new-company.schema";

const CompanyFormPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  const generateCompanyCode = async () => {
    try {
      const companies = await pb.collection("companies").getFullList<Company>({
        sort: "-companyCode",
        $autoCancel: false,
      });

      if (companies.length === 0) {
        return "COMP001";
      }

      const lastCode = companies[0].companyCode;
      const numPart = parseInt(lastCode.replace("COMP", ""));
      const nextNum = numPart + 1;
      return `COMP${String(nextNum).padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating company code:", error);
      return `COMP${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
    }
  };

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);

    try {
      const companyCode = await generateCompanyCode();

      const companyRecord = await pb.collection("companies").create(
        {
          companyCode,
          companyName: formData.companyName,
          email: formData.email,
          subscriptionStartDate: formData.subscriptionStartDate,
          subscriptionEndDate: formData.subscriptionEndDate,
          maxEmployeeCount: formData.maxEmployeeCount,
          isActive: true,
        },
        { $autoCancel: false },
      );

      await pb.collection("company_super_admins").create(
        {
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.password,
          name: formData.companyName,
          companyId: companyRecord.id,
          companyCode: companyCode,
          role: "company_super_admin",
        },
        { $autoCancel: false },
      );

      toast(
        `${t("Company created successfully. Company Code:")} ${companyCode}`,
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
