"use client";

import { useEffect, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DocumentHead from "@/components/DocumentHead";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  AlertCircle,
  Eye,
  Loader2,
  Save,
  Scale,
  Shield,
} from "lucide-react";
import MasterAdminHeader from "@/components/MasterAdminHeader";
import PageLoading from "@/components/PageLoading";
import PreviewModal from "@/components/PreviewModal";
import RichTextEditor from "@/components/RichTextEditor";
import { SectionBadge } from "@/components/SectionBadge";
import { useMasterAuth } from "@/contexts/MasterAuthContext";
import {
  useLegalPages,
  useUpdateLegalPage,
} from "@/hooks/queries/useLegalPages";
import { getLocalizedLegalPage } from "@/lib/legalPages";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LegalPageType } from "@/types/supabase-entities.types";
import {
  LegalPageSchema,
  type TLegalPageSchema,
} from "@/validations/legal-page.schema";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LegalPageRecord = {
  id: string;
  updated_at?: string | null;
};

type LegalPageEditorProps = {
  form: UseFormReturn<TLegalPageSchema>;
  page: LegalPageRecord | undefined;
  editorTitle: string;
  missingMessage: string;
  titlePlaceholder: string;
  isArabic: boolean;
  saving: boolean;
  onSave: () => void;
  onPreview: () => void;
};

function EditorActions({
  saving,
  disabled,
  onSave,
  onPreview,
  className,
}: {
  saving: boolean;
  disabled: boolean;
  onSave: () => void;
  onPreview: () => void;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("gap-2 grid grid-cols-2 sm:flex sm:w-auto", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={onPreview}
        className="gap-2 rounded-lg h-10"
      >
        <Eye className="w-4 h-4 shrink-0" />
        <span className="truncate">{t("Preview")}</span>
      </Button>
      <Button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        className="gap-2 rounded-lg h-10 font-semibold"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          <Save className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">{t("Save Changes")}</span>
      </Button>
    </div>
  );
}

function LegalPageEditor({
  form,
  page,
  editorTitle,
  missingMessage,
  titlePlaceholder,
  isArabic,
  saving,
  onSave,
  onPreview,
}: LegalPageEditorProps) {
  const { t } = useTranslation();
  const dir = isArabic ? "rtl" : "ltr";

  return (
    <Form {...form}>
      <Card className="relative border-border/60 rounded-2xl overflow-hidden shadow-[var(--shadow-subtle)]">
        <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent h-1" />

        <CardHeader className="space-y-4 p-4 sm:p-6 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle className="font-outfit text-lg sm:text-xl">
                {editorTitle}
              </CardTitle>
              {page?.updated_at ? (
                <CardDescription className="text-xs">
                  {t("Last updated:")}{" "}
                  {format(new Date(page.updated_at), "MMM d, yyyy HH:mm")}
                </CardDescription>
              ) : (
                <CardDescription className="text-xs">
                  {t("No saved version yet")}
                </CardDescription>
              )}
            </div>

            <EditorActions
              saving={saving}
              disabled={!page}
              onSave={onSave}
              onPreview={onPreview}
              className="hidden lg:grid"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-5 sm:space-y-6 p-4 sm:p-6 pt-0 pb-24 lg:pb-6">
          {!page ? (
            <div className="flex items-start gap-3 bg-destructive/10 p-4 rounded-xl text-destructive">
              <AlertCircle className="mt-0.5 w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <h4 className="font-semibold">
                  {t("Missing Database Record")}
                </h4>
                <p className="mt-1 text-sm leading-relaxed">{missingMessage}</p>
              </div>
            </div>
          ) : null}

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Page Title")}</FormLabel>
                <FormControl>
                  <Input
                    dir={dir}
                    placeholder={titlePlaceholder}
                    className="bg-background w-full sm:max-w-lg h-11 rounded-lg"
                    disabled={!page}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("Page Content")}</FormLabel>
                <div
                  dir={dir}
                  className={cn(
                    "rounded-xl overflow-hidden border border-border/70",
                    !page && "opacity-50 pointer-events-none",
                  )}
                >
                  <div className="max-w-full overflow-x-auto">
                    <FormControl>
                      <RichTextEditor
                        content={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder=""
                      />
                    </FormControl>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </Form>
  );
}

function LegalPageSummaryCard({
  title,
  updatedAt,
  icon: Icon,
  active,
}: {
  title: string;
  updatedAt?: string | null;
  icon: typeof Shield;
  active?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "bg-card p-4 border rounded-xl transition-colors",
        active
          ? "border-primary/35 shadow-[var(--shadow-subtle)]"
          : "border-border/60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex justify-center items-center rounded-lg w-10 h-10 shrink-0",
            active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{title}</p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            {updatedAt
              ? `${t("Last updated:")} ${format(new Date(updatedAt), "MMM d, yyyy")}`
              : t("Not configured")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LegalPagesManagementPage() {
  const { t, i18n } = useTranslation();
  const { currentUser } = useMasterAuth();
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">("privacy");
  const isArabic =
    (i18n.resolvedLanguage || i18n.language || "en") === "ar" ||
    (i18n.resolvedLanguage || i18n.language || "").startsWith("ar");
  const appLanguage: "en" | "ar" = isArabic ? "ar" : "en";

  const { data: pagesData, isLoading: loading } = useLegalPages();
  const updateMutation = useUpdateLegalPage();

  const privacy = pagesData?.find((r) => r.page_type === "privacy_policy");
  const terms = pagesData?.find((r) => r.page_type === "terms_of_service");

  const [saving, setSaving] = useState({ privacy: false, terms: false });
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    title: "",
    content: "",
  });

  const privacyForm = useForm<TLegalPageSchema>({
    resolver: zodResolver(LegalPageSchema(t)),
    defaultValues: { title: "", content: "" },
  });

  const termsForm = useForm<TLegalPageSchema>({
    resolver: zodResolver(LegalPageSchema(t)),
    defaultValues: { title: "", content: "" },
  });

  useEffect(() => {
    if (privacy) {
      const localized = getLocalizedLegalPage(privacy, appLanguage);
      privacyForm.reset({
        title: localized.title ?? "",
        content: localized.content ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privacy?.id, privacy?.updated_at, appLanguage]);

  useEffect(() => {
    if (terms) {
      const localized = getLocalizedLegalPage(terms, appLanguage);
      termsForm.reset({
        title: localized.title ?? "",
        content: localized.content ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms?.id, terms?.updated_at, appLanguage]);

  async function saveLegalPage(
    type: LegalPageType,
    id: string | undefined,
    data: TLegalPageSchema,
  ) {
    if (!id) return;

    const stateKey = type === "privacy_policy" ? "privacy" : "terms";
    setSaving((prev) => ({ ...prev, [stateKey]: true }));

    try {
      const result = await updateMutation.mutateAsync({
        id,
        language: appLanguage,
        title: data.title,
        content: data.content,
        updatedBy: currentUser?.id ?? null,
      });

      if (result.error) throw new Error(result.error);
      toast.success(t("Content saved successfully."));
    } catch (err) {
      console.error("Error saving legal page:", err);
      toast.error(t("Failed to save content."));
    } finally {
      setSaving((prev) => ({ ...prev, [stateKey]: false }));
    }
  }

  const handleSavePrivacy = privacyForm.handleSubmit((data) =>
    saveLegalPage("privacy_policy", privacy?.id, data),
  );

  const handleSaveTerms = termsForm.handleSubmit((data) =>
    saveLegalPage("terms_of_service", terms?.id, data),
  );

  function openPreview(form: UseFormReturn<TLegalPageSchema>) {
    setPreviewModal({
      isOpen: true,
      title: form.getValues("title") ?? "",
      content: form.getValues("content") ?? "",
    });
  }

  if (loading) {
    return (
      <>
        <DocumentHead title={`${t("Legal Pages Management")} | MANDERA CRM`} />
        <MasterAdminHeader />
        <PageLoading />
      </>
    );
  }

  return (
    <>
      <DocumentHead title={`${t("Legal Pages Management")} | MANDERA CRM`} />

      <MasterAdminHeader />

      <main className="bg-gradient-to-b from-muted/30 via-background to-background min-h-[calc(100vh-68px)] py-6 sm:py-10">
        <div className="mx-auto px-4 sm:px-6 container max-w-5xl">
          <div className="mb-6 sm:mb-8">
            <SectionBadge>{t("Legal Pages Management")}</SectionBadge>
            <h1 className="mt-3 sm:mt-4 font-outfit font-bold text-xl sm:text-2xl md:text-3xl tracking-tight">
              {t("Legal Pages Management")}
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground text-sm sm:text-base leading-relaxed">
              {t("Manage public legal documents shown on the website.")}
            </p>
          </div>

          <div className="gap-3 grid sm:grid-cols-2 mb-6 sm:mb-8">
            <LegalPageSummaryCard
              title={t("Privacy Policy")}
              updatedAt={privacy?.updated_at}
              icon={Shield}
              active={activeTab === "privacy"}
            />
            <LegalPageSummaryCard
              title={t("Terms of Service")}
              updatedAt={terms?.updated_at}
              icon={Scale}
              active={activeTab === "terms"}
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "privacy" | "terms")
            }
            className="space-y-4 sm:space-y-6"
          >
            <TabsList className="grid grid-cols-2 bg-muted/50 p-1 border border-border/60 rounded-full w-full h-auto">
              <TabsTrigger
                value="privacy"
                className="gap-1.5 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-4 rounded-full text-xs sm:text-sm whitespace-nowrap py-2.5"
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className="truncate">{t("Privacy Policy")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="terms"
                className="gap-1.5 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-4 rounded-full text-xs sm:text-sm whitespace-nowrap py-2.5"
              >
                <Scale className="w-4 h-4 shrink-0" />
                <span className="truncate">{t("Terms of Service")}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="privacy" className="mt-0 focus-visible:outline-none">
              <LegalPageEditor
                form={privacyForm}
                page={privacy}
                editorTitle={t("Privacy Policy Editor")}
                missingMessage={t(
                  "The privacy_policy record was not found in the database. Please ensure migrations ran successfully.",
                )}
                titlePlaceholder={
                  isArabic ? "مثال: سياسة الخصوصية" : t("e.g., Privacy Policy")
                }
                isArabic={isArabic}
                saving={saving.privacy}
                onSave={handleSavePrivacy}
                onPreview={() => openPreview(privacyForm)}
              />
            </TabsContent>

            <TabsContent value="terms" className="mt-0 focus-visible:outline-none">
              <LegalPageEditor
                form={termsForm}
                page={terms}
                editorTitle={t("Terms of Service Editor")}
                missingMessage={t(
                  "The terms_of_service record was not found in the database. Please ensure migrations ran successfully.",
                )}
                titlePlaceholder={
                  isArabic ? "مثال: شروط الخدمة" : t("e.g., Terms of Service")
                }
                isArabic={isArabic}
                saving={saving.terms}
                onSave={handleSaveTerms}
                onPreview={() => openPreview(termsForm)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <div className="lg:hidden right-0 bottom-0 left-0 z-40 fixed bg-background/95 supports-[backdrop-filter]:bg-background/90 backdrop-blur border-border/60 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {activeTab === "privacy" ? (
          <EditorActions
            saving={saving.privacy}
            disabled={!privacy}
            onSave={handleSavePrivacy}
            onPreview={() => openPreview(privacyForm)}
          />
        ) : (
          <EditorActions
            saving={saving.terms}
            disabled={!terms}
            onSave={handleSaveTerms}
            onPreview={() => openPreview(termsForm)}
          />
        )}
      </div>

      <PreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        content={previewModal.content}
        dir={isArabic ? "rtl" : "ltr"}
      />
    </>
  );
}
