"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DocumentHead from "@/components/DocumentHead";
import MasterAdminHeader from "@/components/MasterAdminHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useCompany,
  useUpdateCompany,
  useCompanyDocuments,
  useCreateCompanyDocument,
  useDeleteCompanyDocument,
} from "@/hooks/queries/useCompanies";
import { CompanySchema, type TCompanySchema } from "@/validations/company.schema";
import { toast } from "sonner";
import { addMonths, format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  CalendarRange,
  FileText,
  FileUp,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  StickyNote,
  Trash2,
  User,
  Users,
} from "lucide-react";

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex justify-center items-center bg-primary/10 mt-0.5 border border-primary/15 rounded-xl w-9 h-9 text-primary shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-outfit font-semibold text-foreground text-base tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-4 ps-0 sm:ps-12">{children}</div>
    </section>
  );
}

export default function CompanyEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const companyId = id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docNote, setDocNote] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);

  const { data: company, isLoading: fetchLoading, isError } = useCompany(companyId);
  const updateCompanyMutation = useUpdateCompany();
  const { data: documents = [], isLoading: docsLoading } =
    useCompanyDocuments(companyId);
  const createDocMutation = useCreateCompanyDocument(companyId);
  const deleteDocMutation = useDeleteCompanyDocument(companyId);

  const form = useForm<TCompanySchema>({
    resolver: zodResolver(CompanySchema(t)),
    defaultValues: {
      companyName: "",
      phone: "",
      adminName: "",
      email: "",
      subscriptionStartDate: "",
      subscriptionEndDate: "",
      maxEmployeeCount: 10,
      notes: "",
    },
  });

  const subscriptionStartDate = form.watch("subscriptionStartDate");

  useEffect(() => {
    if (company) {
      form.reset({
        companyName: company.company_name,
        phone: company.phone ?? "",
        adminName: company.admin_name ?? "",
        email: company.email,
        subscriptionStartDate: company.subscription_start_date,
        subscriptionEndDate: company.subscription_end_date,
        maxEmployeeCount: company.max_employee_count,
        notes: company.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  useEffect(() => {
    if (isError) {
      toast.error(t("Failed to load company details"));
      router.push("/master/dashboard/companies");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);

    try {
      const result = await updateCompanyMutation.mutateAsync({
        id: companyId,
        companyName: formData.companyName,
        phone: formData.phone,
        adminName: formData.adminName,
        email: formData.email,
        subscriptionStartDate: formData.subscriptionStartDate,
        subscriptionEndDate: formData.subscriptionEndDate,
        maxEmployeeCount: Number(formData.maxEmployeeCount),
        notes: formData.notes,
      });
      if (result.error) throw new Error(result.error);

      toast.success(t("Company updated successfully"));
      router.push("/master/dashboard/companies");
    } catch (error) {
      console.error("Error updating company:", error);
      toast.error(t("Failed to update company"));
    } finally {
      setLoading(false);
    }
  });

  async function handleAddDocument() {
    if (!docTitle.trim()) {
      toast.error(t("Document title required"));
      return;
    }

    setSavingDoc(true);
    try {
      const result = await createDocMutation.mutateAsync({
        title: docTitle.trim(),
        note: docNote,
        file: docFile,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Document added"));
      setDocTitle("");
      setDocNote("");
      setDocFile(null);
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to add document"));
    } finally {
      setSavingDoc(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    try {
      const result = await deleteDocMutation.mutateAsync(documentId);
      if (result.error) throw new Error(result.error);
      toast.success(t("Document deleted"));
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to delete document"));
    }
  }

  if (fetchLoading) {
    return (
      <>
        <MasterAdminHeader />
        <div className="flex justify-center items-center min-h-[calc(100vh-68px)]">
          <div className="text-center">
            <Loader2 className="mx-auto w-8 h-8 text-primary animate-spin" />
            <p className="mt-4 text-muted-foreground">{t("Loading...")}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DocumentHead
        title={`${t("Edit company")} | MANDERA CRM`}
        description={t("Edit company details")}
      />
      <MasterAdminHeader />

      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-0 pattern-grid-lg bg-primary/[0.03] opacity-40"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 py-8 sm:py-10 container max-w-3xl">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <p className="mb-1 font-mono text-muted-foreground text-xs" dir="ltr">
                  {company?.company_code}
                </p>
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl md:text-4xl tracking-tight">
                  {t("Edit company")}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {company?.company_name}
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-lg h-9 font-medium shrink-0"
              >
                <Link href="/master/dashboard/companies">
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  {t("Back to companies")}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-3xl space-y-6">
          <div className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
            <Form {...form}>
              <form onSubmit={handleSubmit}>
                <div className="space-y-8 p-5 sm:p-7">
                  <FormSection
                    icon={Building2}
                    title={t("Company details")}
                    description={t("company_form_details_desc")}
                  >
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Company name")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-background border-border/60 rounded-xl h-11"
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
                          <FormLabel className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {t("Phone")}
                          </FormLabel>
                          <FormControl>
                            <PhoneInput
                              value={field.value || undefined}
                              onChange={(value) =>
                                field.onChange(value ?? "")
                              }
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormSection>

                  <div className="border-border/60 border-t" />

                  <FormSection
                    icon={KeyRound}
                    title={t("Admin account")}
                    description={t("company_form_admin_desc")}
                  >
                    <FormField
                      control={form.control}
                      name="adminName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            {t("Admin name")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-background border-border/60 rounded-xl h-11"
                            />
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
                          <FormLabel className="inline-flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            {t("Email")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              dir="ltr"
                              className="bg-background border-border/60 rounded-xl h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormSection>

                  <div className="border-border/60 border-t" />

                  <FormSection
                    icon={CalendarRange}
                    title={t("Subscription")}
                    description={t("company_form_subscription_desc")}
                  >
                    <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="subscriptionStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Subscription start date")}</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value}
                                onChange={(value) => {
                                  field.onChange(value);
                                  const end = form.getValues("subscriptionEndDate");
                                  if (value && end && end < value) {
                                    form.setValue("subscriptionEndDate", "");
                                  }
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                placeholder={t("Pick a date")}
                              />
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
                              <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                name={field.name}
                                min={subscriptionStartDate}
                                placeholder={t("Pick a date")}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[3, 6, 12].map((months) => (
                        <Button
                          key={months}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn("rounded-full h-8")}
                          onClick={() => {
                            const startRaw =
                              form.getValues("subscriptionStartDate") ||
                              format(new Date(), "yyyy-MM-dd");
                            const start = parseISO(startRaw);
                            if (!isValid(start)) return;
                            if (!form.getValues("subscriptionStartDate")) {
                              form.setValue(
                                "subscriptionStartDate",
                                format(start, "yyyy-MM-dd"),
                              );
                            }
                            form.setValue(
                              "subscriptionEndDate",
                              format(addMonths(start, months), "yyyy-MM-dd"),
                              { shouldValidate: true },
                            );
                          }}
                        >
                          {t("duration_months", { count: months })}
                        </Button>
                      ))}
                    </div>

                    <FormField
                      control={form.control}
                      name="maxEmployeeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="inline-flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            {t("Maximum employee count")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min={1}
                              dir="ltr"
                              className="bg-background border-border/60 rounded-xl h-11 max-w-[12rem]"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("company_seats_helper")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormSection>

                  <div className="border-border/60 border-t" />

                  <FormSection
                    icon={StickyNote}
                    title={t("Notes")}
                    description={t("company_form_notes_desc")}
                  >
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder={t("company_notes_placeholder")}
                              className="bg-background border-border/60 rounded-xl resize-y min-h-[88px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormSection>
                </div>

                <div className="flex sm:flex-row flex-col-reverse sm:justify-end items-stretch sm:items-center gap-2 bg-muted/30 px-5 sm:px-7 py-4 border-border/60 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-10"
                    disabled={loading}
                    onClick={() => router.push("/master/dashboard/companies")}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl h-10 font-medium min-w-[9rem]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("Saving...")}
                      </>
                    ) : (
                      t("Save changes")
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="bg-card shadow-[var(--shadow-subtle)] p-5 sm:p-7 border border-border/60 rounded-2xl">
            <div className="flex items-start gap-3 mb-5">
              <span className="flex justify-center items-center bg-primary/10 border border-primary/15 rounded-xl w-9 h-9 text-primary shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h2 className="font-outfit font-semibold text-foreground text-base tracking-tight">
                  {t("Files")}
                </h2>
                <p className="mt-0.5 text-muted-foreground text-sm">
                  {t("company_files_manage_desc")}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <Input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder={t("Document title")}
                className="bg-background border-border/60 rounded-xl h-11"
              />
              <Textarea
                value={docNote}
                onChange={(e) => setDocNote(e.target.value)}
                placeholder={t("Optional note")}
                rows={2}
                className="bg-background border-border/60 rounded-xl"
              />
              <label className="flex flex-col justify-center items-center gap-2 bg-muted/30 hover:bg-muted/50 px-4 py-5 border border-border/60 border-dashed rounded-xl text-muted-foreground text-sm text-center transition-colors cursor-pointer">
                <FileUp className="w-5 h-5 text-primary" />
                <span>
                  {docFile ? docFile.name : t("company_files_hint")}
                </span>
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    setDocFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button
                type="button"
                onClick={handleAddDocument}
                disabled={savingDoc}
                className="rounded-xl h-10"
              >
                {savingDoc ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("Add document")
                )}
              </Button>
            </div>

            {docsLoading ? (
              <div className="bg-muted/40 rounded-xl h-16 animate-pulse" />
            ) : documents.length === 0 ? (
              <p className="py-6 text-muted-foreground text-sm text-center">
                {t("No documents yet")}
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex justify-between items-start gap-3 bg-muted/30 p-3 border border-border/50 rounded-xl"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      {doc.note ? (
                        <p className="mt-0.5 text-muted-foreground text-xs line-clamp-2">
                          {doc.note}
                        </p>
                      ) : null}
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block mt-1 text-primary text-xs hover:underline"
                          dir="ltr"
                        >
                          {doc.file_name || t("Open file")}
                        </a>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-lg w-8 h-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
