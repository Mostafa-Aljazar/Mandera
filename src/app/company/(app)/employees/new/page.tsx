"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { canManageEmployees, roleFromJobTitle } from "@/lib/permissions";
import { useEmployeeCount } from "@/hooks/useEmployeeCount";
import { useCreateEmployee } from "@/hooks/queries/useEmployees";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  KeyRound,
  Loader2,
  Trash2,
  UploadCloud,
  User,
  UserPlus,
} from "lucide-react";
import {
  NewEmployeeSchema,
  type TNewEmployeeSchema,
} from "@/validations/new-employee.schema";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
      <div className="flex items-start gap-3 bg-muted/25 px-4 sm:px-5 py-3.5 sm:py-4 border-border/50 border-b">
        <span className="flex justify-center items-center bg-primary/10 rounded-xl w-9 h-9 text-primary shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="font-outfit font-semibold text-foreground text-sm sm:text-base tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-muted-foreground text-xs sm:text-[13px] leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

const EmployeeFormPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { company, currentUser } = useCompanyAuth();
  const canManage = canManageEmployees(currentUser?.role);
  const { count: currentCount } = useEmployeeCount(canManage ? company?.id : undefined);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createEmployeeMutation = useCreateEmployee();

  const seatLimit = company?.max_employee_count ?? Infinity;
  const atLimit = currentCount >= seatLimit;

  useEffect(() => {
    if (!canManage) {
      router.replace("/company/dashboard");
    }
  }, [canManage, router]);

  const form = useForm<TNewEmployeeSchema>({
    resolver: zodResolver(NewEmployeeSchema(t)),
    defaultValues: {
      firstNameEn: "",
      firstNameAr: "",
      lastNameEn: "",
      lastNameAr: "",
      email: "",
      phone: "",
      job_title: undefined,
      password: "",
    },
  });

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const clearAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyAvatarFile = (file: File) => {
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error(t("Please upload a JPG, PNG, or WebP image."));
      return;
    }
    if (file.size >= MAX_AVATAR_BYTES) {
      toast.error(t("Employee photo must be less than 2MB."));
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    applyAvatarFile(file);
    event.target.value = "";
  };

  const handleAvatarDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) applyAvatarFile(file);
  };

  const handleSubmit = form.handleSubmit(async (formData) => {
    if (!company?.id) {
      toast.error(t("Company is required."));
      return;
    }
    if (atLimit) {
      toast.error(
        t("Employee limit reached. Please upgrade your subscription."),
      );
      return;
    }

    setLoading(true);

    try {
      const result = await createEmployeeMutation.mutateAsync({
        companyId: company.id,
        first_name_en: formData.firstNameEn,
        first_name_ar: formData.firstNameAr,
        last_name_en: formData.lastNameEn,
        last_name_ar: formData.lastNameAr,
        email: formData.email,
        phone: formData.phone,
        job_title: formData.job_title,
        role: roleFromJobTitle(formData.job_title),
        password: formData.password,
        avatar: avatarFile,
      });
      if (result.error) throw new Error(result.error);

      toast.success(t("Employee added successfully"));
      form.reset();
      clearAvatar();
      router.push("/company/employees");
    } catch (error) {
      console.error("Error creating employee:", error);
      const message =
        error instanceof Error ? error.message : t("Failed to add employee");

      const translated =
        message === "Employee photo must be less than 2MB."
          ? t("Employee photo must be less than 2MB.")
          : message === "Please upload a JPG, PNG, or WebP image."
            ? t("Please upload a JPG, PNG, or WebP image.")
            : message ===
                "An account with this email already exists. Use a different email."
              ? t(
                  "An account with this email already exists. Use a different email.",
                )
              : message === "Employee limit reached. Please upgrade your subscription."
                ? t("Employee limit reached. Please upgrade your subscription.")
                : message === "Company is required."
                  ? t("Company is required.")
                  : message === "Email and password are required."
                    ? t("Email and password are required.")
                    : message || t("Failed to add employee");

      toast.error(translated);
    } finally {
      setLoading(false);
    }
  });

  const firstNameEn = form.watch("firstNameEn");
  const firstNameAr = form.watch("firstNameAr");
  const lastNameEn = form.watch("lastNameEn");
  const lastNameAr = form.watch("lastNameAr");

  const initials =
    `${firstNameEn?.[0] || firstNameAr?.[0] || ""}${lastNameEn?.[0] || lastNameAr?.[0] || ""}`.toUpperCase() ||
    "?";

  if (!canManage) {
    return null;
  }

  return (
    <>
      <DocumentHead
        title={`${t("Add New Employee")} | MANDERA CRM`}
        description={t("Create a new team member with bilingual name and login access.")}
      />
      <CompanyAdminHeader />

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

          <div className="relative mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/company/employees")}
              className="gap-2 -ms-2 mb-4 h-9 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t("Back to employees")}
            </Button>

            <div className="flex items-start gap-3.5 sm:gap-4">
              <span className="hidden sm:flex justify-center items-center bg-primary/10 rounded-2xl ring-1 ring-primary/15 w-12 h-12 text-primary shrink-0">
                <UserPlus className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl tracking-tight">
                  {t("Add New Employee")}
                </h1>
                <p className="mt-1.5 max-w-xl text-muted-foreground text-sm leading-relaxed">
                  {t(
                    "Create a new team member with bilingual name and login access.",
                  )}
                </p>
                {Number.isFinite(seatLimit) ? (
                  <p className="mt-2 font-medium text-muted-foreground text-xs tabular-nums">
                    {currentCount} / {seatLimit} {t("seats used")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl">
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <FormSection
                title={t("Employee photo")}
                description={t(
                  "Optional. JPG, PNG or WebP under 2MB. Drag and drop or browse.",
                )}
                icon={Camera}
              >
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleAvatarDrop}
                  className={cn(
                    "flex sm:flex-row flex-col sm:items-center gap-4 sm:gap-5 p-4 sm:p-5 border-2 border-dashed rounded-2xl transition-colors",
                    isDragOver
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-muted/20 hover:border-primary/35 hover:bg-muted/30",
                  )}
                >
                  <Avatar className="bg-primary/10 mx-auto sm:mx-0 rounded-2xl w-24 h-24 sm:w-20 sm:h-20 ring-2 ring-primary/20 shrink-0">
                    {avatarPreview ? (
                      <AvatarImage
                        src={avatarPreview}
                        alt={t("Employee photo")}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 rounded-2xl font-outfit font-bold text-primary text-xl">
                      {avatarPreview ? null : initials === "?" ? (
                        <User className="w-8 h-8 opacity-60" />
                      ) : (
                        initials
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2.5 min-w-0 text-center sm:text-start">
                    <p className="flex justify-center sm:justify-start items-center gap-1.5 text-muted-foreground text-xs sm:text-[13px] leading-relaxed">
                      <UploadCloud className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                      {t("Drag & drop a photo here, or click to upload")}
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 bg-background rounded-lg h-9"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {avatarFile ? t("Change photo") : t("Upload photo")}
                      </Button>
                      {avatarFile ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 h-9 text-destructive hover:text-destructive"
                          onClick={clearAvatar}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("Remove")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection
                title={t("Employee name")}
                description={t(
                  "Enter the name in English and Arabic for bilingual display.",
                )}
                icon={User}
              >
                <div className="space-y-5">
                  <div>
                    <p className="mb-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">
                      {t("English")}
                    </p>
                    <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstNameEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{`${t("First Name")} (EN)`} *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                dir="ltr"
                                placeholder="e.g. John"
                                className="bg-background h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastNameEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{`${t("Last Name")} (EN)`} *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                dir="ltr"
                                placeholder="e.g. Doe"
                                className="bg-background h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="border-border/50 border-t pt-5">
                    <p className="mb-3 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">
                      {t("Arabic")}
                    </p>
                    <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstNameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{`${t("First Name")} (AR)`} *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                dir="rtl"
                                placeholder="مثال: محمد"
                                className="bg-background h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastNameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{`${t("Last Name")} (AR)`} *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                dir="rtl"
                                placeholder="مثال: العتيبي"
                                className="bg-background h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection
                title={t("Contact & access")}
                description={t(
                  "Work contact details and a temporary login password.",
                )}
                icon={Briefcase}
              >
                <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Email Address")} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            dir="ltr"
                            placeholder={t("jane@example.com")}
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
                        <FormLabel>{t("Phone Number")} *</FormLabel>
                        <FormControl>
                          <PhoneInput {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="job_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Job Title")} *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background h-10">
                              <SelectValue
                                placeholder={t("Select Job Title")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sales_agent">
                              {t("Sales Agent")}
                            </SelectItem>
                            <SelectItem value="admin">
                              {t("Administrator")}
                            </SelectItem>
                            <SelectItem value="manager">
                              {t("Manager")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="inline-flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                          {t("Temporary Password")} *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            dir="ltr"
                            minLength={8}
                            placeholder={t("Minimum 8 characters")}
                            className="bg-background h-10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>

              <div className="flex sm:flex-row flex-col-reverse sm:justify-end gap-2.5 sm:gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/company/employees")}
                  disabled={loading}
                  className="rounded-lg w-full sm:w-auto h-10"
                >
                  {t("Cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || atLimit}
                  className="rounded-lg w-full sm:w-auto sm:min-w-[160px] h-10"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("Adding...")}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {t("Add Employee")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </>
  );
};

export default EmployeeFormPage;
