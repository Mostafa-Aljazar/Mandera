"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import ResetPasswordDialog from "@/components/company/employees/ResetPasswordDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Save,
  Phone,
  MessageCircle,
  Building2,
  FileText,
  History,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Shield,
  Briefcase,
  Users,
  UserRound,
  Wallet,
  Mail,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  MessageSquare,
  Camera,
  Trash2,
  UploadCloud,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import type { TFunction } from "i18next";
import {
  useCompanyEmployee,
  useCompanyEmployees,
  useResetEmployeePassword,
  useUpdateEmployee,
} from "@/hooks/queries/useEmployees";
import { useOwners } from "@/hooks/queries/useOwners";
import { useClients } from "@/hooks/queries/useClients";
import { useProperties } from "@/hooks/queries/useProperties";
import { useRevenues } from "@/hooks/queries/useRevenues";
import { useEmployeeActivity } from "@/hooks/queries/useStatusHistory";
import {
  useCompanyBranches,
  useCompanyTeams,
} from "@/hooks/queries/useCompanyExtendedSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";
import {
  isAdministratorOrAbove,
  isCompanyRole,
  isManager,
  isAdministrator,
  canManageEmployees,
  canViewRevenue,
  jobTitleForRole,
  roleFromJobTitle,
} from "@/lib/permissions";

const JOB_TITLES = ["sales_agent", "administrator", "manager"] as const;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const EmployeeProfileSchema = (t: TFunction) =>
  z
    .object({
      firstNameEn: z.string().trim().min(1, `${t("First Name")} (EN)`),
      firstNameAr: z.string().trim().min(1, `${t("First Name")} (AR)`),
      lastNameEn: z.string().trim().min(1, `${t("Last Name")} (EN)`),
      lastNameAr: z.string().trim().min(1, `${t("Last Name")} (AR)`),
      email: z.string().trim().email(t("Email")),
      phone: z.string(),
      job_title: z.string(),
      role: z.enum(["sales_agent", "administrator", "manager"]),
      team_id: z.string().optional().or(z.literal("")),
      reports_to_employee_id: z.string().optional().or(z.literal("")),
      branch_id: z.string().optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      if (data.phone && data.phone !== "N/A" && !isValidPhoneNumber(data.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: t(
            "Invalid phone number format. Please use format like +974 1234 5678",
          ),
        });
      }
      if (
        data.job_title &&
        !JOB_TITLES.includes(data.job_title as (typeof JOB_TITLES)[number])
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["job_title"],
          message: t("Please select a valid job title."),
        });
      }
    });

type TEmployeeProfileSchema = z.infer<
  ReturnType<typeof EmployeeProfileSchema>
>;

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden",
        className,
      )}
    >
      <div className="flex items-start gap-3 bg-muted/25 px-4 sm:px-5 py-3.5 border-border/50 border-b">
        <span className="flex justify-center items-center bg-primary/10 rounded-xl w-9 h-9 text-primary shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="font-outfit font-semibold text-foreground text-sm sm:text-base tracking-tight">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function formatRelativeDate(date: Date, t: (key: string) => string) {
  if (isToday(date)) return `${t("Today")} · ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `${t("Yesterday")} · ${format(date, "HH:mm")}`;
  return format(date, "MMM d, yyyy · HH:mm");
}

function jobTitleLabel(jobTitle: string | undefined, t: (key: string) => string) {
  switch (jobTitle) {
    case "sales_agent":
      return t("Sales Agent");
    case "administrator":
      return t("Administrator");
    case "manager":
      return t("Manager");
    default:
      return t("N/A");
  }
}

interface EmployeeDetailViewProps {
  profileId: string;
}

export default function EmployeeDetailView({ profileId }: EmployeeDetailViewProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const { company, currentUser } = useCompanyAuth();
  const canAccessRevenue = canViewRevenue(currentUser?.role);
  const [activeTab, setActiveTab] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    data: employee,
    isLoading,
    isError,
    refetch,
  } = useCompanyEmployee(profileId, company?.id);

  const isElevated = isAdministratorOrAbove(employee?.role);
  const isAdmin = isElevated;
  const isDisabled = Boolean(employee?.employee?.disabled);

  const ownerFilters = useMemo(
    () => ({ assignedEmployeeId: profileId }),
    [profileId],
  );
  const clientFilters = useMemo(() => ({ employeeId: profileId }), [profileId]);
  const propertyFilters = useMemo(
    () => ({ employeeId: profileId }),
    [profileId],
  );
  const revenueFilters = useMemo(
    () => ({ employeeId: profileId }),
    [profileId],
  );

  const { data: ownersData, isFetching: loadingOwners } = useOwners(
    company?.id,
    ownerFilters,
  );
  const { data: clientsData, isFetching: loadingClients } = useClients(
    company?.id,
    clientFilters,
  );
  const { data: propertiesData, isFetching: loadingProperties } = useProperties(
    company?.id,
    propertyFilters,
  );
  const { data: allEmployeesData } = useCompanyEmployees(
    canManageEmployees(currentUser?.role) ? company?.id : undefined,
  );
  const { data: teamsData } = useCompanyTeams(
    canManageEmployees(currentUser?.role) ? company?.id : undefined,
  );
  const { data: branchesData } = useCompanyBranches(
    canManageEmployees(currentUser?.role) ? company?.id : undefined,
  );
  const teammateOptions = useMemo(
    () =>
      (allEmployeesData ?? []).filter(
        (row) =>
          row.employee_id &&
          row.employee_id !== employee?.employee_id &&
          !row.employee?.disabled,
      ),
    [allEmployeesData, employee?.employee_id],
  );
  const teams = teamsData ?? [];
  const branches = branchesData ?? [];
  const { data: revenuesData, isFetching: loadingRevenues } = useRevenues(
    canAccessRevenue ? company?.id : undefined,
    revenueFilters,
  );
  const { data: activityData, isFetching: loadingActivity } =
    useEmployeeActivity(profileId, company?.id);

  const owners = useMemo(() => ownersData ?? [], [ownersData]);
  const clients = useMemo(() => clientsData ?? [], [clientsData]);
  const properties = useMemo(() => propertiesData ?? [], [propertiesData]);
  const revenues = useMemo(() => revenuesData ?? [], [revenuesData]);
  const activity = useMemo(() => activityData ?? [], [activityData]);

  const totalCommission = useMemo(
    () =>
      revenues.reduce(
        (sum, r) => sum + (Number(r.commission_value) || 0),
        0,
      ),
    [revenues],
  );

  const updateEmployeeMutation = useUpdateEmployee();
  const resetPasswordMutation = useResetEmployeePassword();
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const form = useForm<TEmployeeProfileSchema>({
    resolver: zodResolver(EmployeeProfileSchema(t)),
    values: employee
      ? {
          firstNameEn:
            employee.employee?.first_name_en ||
            employee.name?.trim().split(/\s+/)[0] ||
            "",
          firstNameAr: employee.employee?.first_name_ar || "",
          lastNameEn:
            employee.employee?.last_name_en ||
            employee.name?.trim().split(/\s+/).slice(1).join(" ") ||
            "",
          lastNameAr: employee.employee?.last_name_ar || "",
          email: employee.email || employee.employee?.email || "",
          phone:
            employee.employee?.phone && employee.employee.phone !== "N/A"
              ? employee.employee.phone
              : "",
          job_title:
            employee.employee?.job_title ||
            (isCompanyRole(employee.role)
              ? jobTitleForRole(employee.role)
              : "sales_agent"),
          role: isCompanyRole(employee.role)
            ? employee.role
            : "sales_agent",
          team_id: employee.employee?.team_id || "",
          reports_to_employee_id:
            employee.employee?.reports_to_employee_id || "",
          branch_id: employee.employee?.branch_id || "",
        }
      : undefined,
    defaultValues: {
      firstNameEn: "",
      firstNameAr: "",
      lastNameEn: "",
      lastNameAr: "",
      email: "",
      phone: "",
      job_title: "sales_agent",
      role: "sales_agent",
      team_id: "",
      reports_to_employee_id: "",
      branch_id: "",
    },
  });

  useEffect(() => {
    if (!isError) return;
    toast.error(t("Employee not found"));
    router.replace("/company/employees");
  }, [isError, router, t]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    setAvatarFile(null);
    setRemoveAvatar(false);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id, employee?.employee?.avatar_url]);

  const clearAvatarSelection = () => {
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
    setRemoveAvatar(false);
  };

  const watchedName = employeeDisplayName(
    {
      first_name_en: form.watch("firstNameEn"),
      first_name_ar: form.watch("firstNameAr"),
      last_name_en: form.watch("lastNameEn"),
      last_name_ar: form.watch("lastNameAr"),
    },
    language,
  );
  const displayName =
    employeeDisplayName(employee?.employee, language, employee?.name) ||
    watchedName ||
    t("Unnamed");
  const email =
    employee?.email || employee?.employee?.email || form.watch("email") || "";
  const phone = form.watch("phone") || employee?.employee?.phone || "";
  const cleanPhone = phone && phone !== "N/A" ? phone.replace(/\D/g, "") : "";
  const currentAvatarUrl = removeAvatar
    ? null
    : avatarPreview || employee?.employee?.avatar_url || null;

  const handleSave = form.handleSubmit(async (formData) => {
    if (!employee || !company?.id) return;

    if (formData.phone && formData.phone !== "N/A" && !isValidPhoneNumber(formData.phone)) {
      form.setError("phone", {
        message: t(
          "Invalid phone number format. Please use format like +974 1234 5678",
        ),
      });
      return;
    }

    const jobTitle =
      formData.job_title &&
      JOB_TITLES.includes(formData.job_title as (typeof JOB_TITLES)[number])
        ? formData.job_title
        : isCompanyRole(employee?.role)
          ? jobTitleForRole(employee.role)
          : "sales_agent";

    setIsSubmitting(true);
    try {
      const result = await updateEmployeeMutation.mutateAsync({
        profileId: employee.id,
        employeeId: employee.employee_id,
        companyId: company.id,
        first_name_en: formData.firstNameEn,
        first_name_ar: formData.firstNameAr,
        last_name_en: formData.lastNameEn,
        last_name_ar: formData.lastNameAr,
        email: formData.email,
        phone: formData.phone || "N/A",
        job_title: jobTitle,
        role: formData.role,
        team_id: formData.team_id || null,
        reports_to_employee_id: formData.reports_to_employee_id || null,
        branch_id: formData.branch_id || null,
        avatar: avatarFile,
        removeAvatar: removeAvatar && !avatarFile,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Employee updated successfully"));
      clearAvatarSelection();
      setRemoveAvatar(false);
      refetch();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : t("Failed to update employee");
      toast.error(
        message === "Employee photo must be less than 2MB."
          ? t("Employee photo must be less than 2MB.")
          : message === "Please upload a JPG, PNG, or WebP image."
            ? t("Please upload a JPG, PNG, or WebP image.")
            : t("Failed to update employee"),
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleResetPassword = async (newPassword: string) => {
    if (!company?.id || !employee) return;
    const result = await resetPasswordMutation.mutateAsync({
      profileId: employee.id,
      companyId: company.id,
      newPassword,
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("Employee password reset successfully."));
    setResetPasswordOpen(false);
  };

  if (isLoading || !employee) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-8 container max-w-6xl space-y-6">
        <Skeleton className="w-40 h-9" />
        <Skeleton className="w-full h-32 rounded-2xl" />
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const entityHref = (
    type: "owner" | "client" | "property",
    id: string | null,
  ) => {
    if (!id) return null;
    if (type === "owner") return `/company/owners/${id}`;
    if (type === "client") return `/company/clients/${id}`;
    return `/company/properties`;
  };

  return (
    <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/company/employees">
          <Button variant="ghost" size="sm" className="gap-2 -ms-2 h-9">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t("Back to employees")}
          </Button>
        </Link>
        {canManageEmployees(currentUser?.role) ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9"
            disabled={resetPasswordMutation.isPending}
            onClick={() => setResetPasswordOpen(true)}
          >
            {resetPasswordMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <KeyRound className="w-3.5 h-3.5" />
            )}
            {t("Reset password")}
          </Button>
        ) : null}
        {cleanPhone && (
          <div className="flex sm:hidden items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
              <a href={`tel:${cleanPhone}`}>
                <Phone className="w-3.5 h-3.5" />
                {t("Call")}
              </a>
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
        <div className="relative bg-gradient-to-r from-background via-muted/20 to-background border-border/60 border-b">
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="relative flex items-center gap-3.5 sm:gap-4 px-4 sm:px-6 py-5">
            <div className="relative flex justify-center items-center bg-primary/15 rounded-2xl ring-2 ring-primary/30 ring-offset-2 ring-offset-background w-14 h-14 sm:w-16 sm:h-16 font-outfit font-bold text-primary text-xl shadow-sm shrink-0 overflow-hidden">
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
              <span className="absolute -bottom-0.5 -end-0.5 bg-primary border-2 border-background rounded-full w-3.5 h-3.5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                {t("Employee Profile")}
              </p>
              <h1 className="mt-0.5 font-outfit font-bold text-foreground text-xl sm:text-2xl truncate tracking-tight">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] h-5 gap-0.5 font-medium border",
                    isAdmin
                      ? "bg-primary/10 text-primary border-primary/25"
                      : "bg-sky-500/10 text-sky-700 border-sky-500/25",
                  )}
                >
                  {isAdmin ? (
                    <Shield className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  {isManager(employee?.role)
                    ? t("Manager")
                    : isAdministrator(employee?.role)
                      ? t("Administrator")
                      : t("Sales Agent")}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] h-5 gap-0.5 font-medium border",
                    isDisabled
                      ? "bg-destructive/10 text-destructive border-destructive/25"
                      : "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
                  )}
                >
                  {isDisabled ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  {isDisabled ? t("Disabled") : t("Active")}
                </Badge>
                {employee.id === currentUser?.id && (
                  <Badge
                    variant="secondary"
                    className="text-[11px] h-5 font-normal"
                  >
                    {t("You")}
                  </Badge>
                )}
              </div>
            </div>

            {cleanPhone && (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5"
                >
                  <a href={`tel:${cleanPhone}`}>
                    <Phone className="w-3.5 h-3.5" />
                    {t("Call")}
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-[#25D366] hover:bg-[#25D366]/90 h-9 gap-1.5 text-white"
                >
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex lg:flex-row flex-col">
          <div className="flex flex-col flex-1 min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col"
            >
              <div className="bg-muted/10 border-border/60 border-b">
                <div className="px-2 sm:px-4 overflow-x-auto [scrollbar-width:thin]">
                  <TabsList className="justify-start bg-transparent gap-0 p-0 h-11 w-max min-w-full">
                    {[
                      {
                        value: "info",
                        icon: FileText,
                        label: t("Information"),
                        shortLabel: t("Info"),
                      },
                      {
                        value: "owners",
                        icon: UserRound,
                        label: t("Owners"),
                        count: owners.length,
                      },
                      {
                        value: "clients",
                        icon: Users,
                        label: t("Clients"),
                        count: clients.length,
                      },
                      {
                        value: "properties",
                        icon: Building2,
                        label: t("Properties"),
                        count: properties.length,
                      },
                      ...(canAccessRevenue
                        ? [
                            {
                              value: "revenues",
                              icon: Wallet,
                              label: t("Revenue"),
                              count: revenues.length,
                            },
                          ]
                        : []),
                      {
                        value: "activity",
                        icon: History,
                        label: t("Activity"),
                        count: activity.length,
                      },
                    ].map(({ value, icon: Icon, label, shortLabel, count }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className={cn(
                          "gap-1.5 data-[state=active]:bg-transparent px-2.5 sm:px-3.5 rounded-none border-transparent border-b-2 h-11 data-[state=active]:border-primary data-[state=active]:shadow-none text-xs sm:text-sm shrink-0",
                          "data-[state=inactive]:text-muted-foreground",
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden">{shortLabel || label}</span>
                        <span className="hidden sm:inline">{label}</span>
                        {count !== undefined && count > 0 && (
                          <span className="bg-primary/10 ms-0.5 px-1.5 py-0.5 rounded-full font-medium text-[10px] text-primary tabular-nums">
                            {count}
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              <Form {...form}>
                <div>
                  <TabsContent value="info" className="space-y-5 mt-0 p-4 sm:p-6">
                    <SectionCard
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
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) applyAvatarFile(file);
                        }}
                        className={cn(
                          "flex sm:flex-row flex-col sm:items-center gap-4 p-4 border-2 border-dashed rounded-2xl transition-colors",
                          isDragOver
                            ? "border-primary bg-primary/10"
                            : "border-border/60 bg-muted/20 hover:border-primary/35",
                        )}
                      >
                        <Avatar className="bg-primary/10 mx-auto sm:mx-0 rounded-2xl w-20 h-20 ring-2 ring-primary/20 shrink-0">
                          {currentAvatarUrl ? (
                            <AvatarImage
                              src={currentAvatarUrl}
                              alt={t("Employee photo")}
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 rounded-2xl font-outfit font-bold text-primary text-xl">
                            {currentAvatarUrl ? null : (
                              <User className="w-8 h-8 opacity-60" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2.5 min-w-0 text-center sm:text-start">
                          <p className="flex justify-center sm:justify-start items-center gap-1.5 text-muted-foreground text-xs leading-relaxed">
                            <UploadCloud className="hidden sm:block w-3.5 h-3.5 shrink-0" />
                            {t("Drag & drop a photo here, or click to upload")}
                          </p>
                          <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) applyAvatarFile(file);
                                e.target.value = "";
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 bg-background rounded-lg h-9"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {avatarFile || currentAvatarUrl
                                ? t("Change photo")
                                : t("Upload photo")}
                            </Button>
                            {(avatarFile ||
                              employee.employee?.avatar_url) &&
                            !removeAvatar ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 h-9 text-destructive hover:text-destructive"
                                onClick={() => {
                                  clearAvatarSelection();
                                  if (employee.employee?.avatar_url) {
                                    setRemoveAvatar(true);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t("Remove")}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard
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
                                  <FormLabel className="text-xs">
                                    {`${t("First Name")} (EN)`} *
                                  </FormLabel>
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
                                  <FormLabel className="text-xs">
                                    {`${t("Last Name")} (EN)`} *
                                  </FormLabel>
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
                                  <FormLabel className="text-xs">
                                    {`${t("First Name")} (AR)`} *
                                  </FormLabel>
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
                                  <FormLabel className="text-xs">
                                    {`${t("Last Name")} (AR)`} *
                                  </FormLabel>
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
                    </SectionCard>

                    <SectionCard
                      title={t("Contact & access")}
                      description={t(
                        "Work contact details and account role for this team member.",
                      )}
                      icon={Briefcase}
                    >
                      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Email")} *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  dir="ltr"
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
                              <FormLabel className="text-xs">
                                {t("Phone Number")}
                              </FormLabel>
                              <FormControl>
                                <PhoneInput {...field} className="flex-1" />
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
                              <FormLabel className="text-xs">
                                {t("Job Title")}
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.setValue(
                                    "role",
                                    roleFromJobTitle(value),
                                    { shouldDirty: true },
                                  );
                                }}
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
                                  <SelectItem value="administrator">
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
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Account role (access level)")} *
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  if (
                                    value === "sales_agent" ||
                                    value === "administrator" ||
                                    value === "manager"
                                  ) {
                                    form.setValue(
                                      "job_title",
                                      jobTitleForRole(value),
                                      { shouldDirty: true },
                                    );
                                  }
                                }}
                                disabled={employee.id === currentUser?.id}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="sales_agent">
                                    {t("Sales Agent")}
                                  </SelectItem>
                                  <SelectItem value="administrator">
                                    {t("Administrator")}
                                  </SelectItem>
                                  <SelectItem value="manager">
                                    {t("Manager")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-muted-foreground text-[11px] leading-relaxed">
                                {t(
                                  "Manager has full company access. Administrator has operational oversight. Sales Agent has limited access.",
                                )}
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="team_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Team")}
                              </FormLabel>
                              <Select
                                value={field.value || "__none__"}
                                onValueChange={(value) =>
                                  field.onChange(
                                    value === "__none__" ? "" : value,
                                  )
                                }
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background h-10">
                                    <SelectValue
                                      placeholder={t("Select team")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("No team")}
                                  </SelectItem>
                                  {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {bilingualLabel(team, language)}
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
                          name="branch_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Branch")}
                              </FormLabel>
                              <Select
                                value={field.value || "__none__"}
                                onValueChange={(value) =>
                                  field.onChange(
                                    value === "__none__" ? "" : value,
                                  )
                                }
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background h-10">
                                    <SelectValue
                                      placeholder={t("Select branch")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("No branch")}
                                  </SelectItem>
                                  {branches.map((branch) => (
                                    <SelectItem
                                      key={branch.id}
                                      value={branch.id}
                                    >
                                      {bilingualLabel(branch, language)}
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
                          name="reports_to_employee_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Reports to (direct manager)")}
                              </FormLabel>
                              <Select
                                value={field.value || "__none__"}
                                onValueChange={(value) =>
                                  field.onChange(
                                    value === "__none__" ? "" : value,
                                  )
                                }
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background h-10">
                                    <SelectValue
                                      placeholder={t("Select manager")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("No direct manager")}
                                  </SelectItem>
                                  {teammateOptions.map((row) => (
                                    <SelectItem
                                      key={row.employee_id!}
                                      value={row.employee_id!}
                                    >
                                      {employeeDisplayName(
                                        row.employee,
                                        language,
                                        row.name,
                                      ) || row.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </SectionCard>
                  </TabsContent>

                  <TabsContent
                    value="owners"
                    className="space-y-5 mt-0 p-5 sm:p-6"
                  >
                    <SectionCard
                      title={`${t("Assigned Owners")} (${owners.length})`}
                      icon={UserRound}
                    >
                      {loadingOwners ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : owners.length === 0 ? (
                        <div className="flex flex-col items-center bg-muted/20 py-12 border border-border/50 border-dashed rounded-xl text-center">
                          <UserRound className="opacity-20 mb-3 w-10 h-10 text-primary" />
                          <p className="font-medium text-foreground text-sm">
                            {t("No owners assigned to this employee.")}
                          </p>
                        </div>
                      ) : (
                        <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                          {owners.map((owner) => (
                            <Link
                              key={owner.id}
                              href={`/company/owners/${owner.id}`}
                              className="group flex justify-between items-start gap-3 bg-muted/20 hover:bg-muted/40 p-3.5 border border-border/50 hover:border-primary/25 rounded-xl transition-all"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                                  {owner.name}
                                </p>
                                <p
                                  className="mt-1 text-muted-foreground text-xs"
                                  dir="ltr"
                                >
                                  {owner.phone}
                                </p>
                                {owner.marketing_channel && (
                                  <p className="mt-1 text-muted-foreground/80 text-[11px] truncate">
                                    {owner.marketing_channel}
                                  </p>
                                )}
                              </div>
                              <ExternalLink className="opacity-40 group-hover:opacity-100 w-3.5 h-3.5 text-muted-foreground shrink-0 transition-opacity" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  <TabsContent
                    value="clients"
                    className="space-y-5 mt-0 p-5 sm:p-6"
                  >
                    <SectionCard
                      title={`${t("Assigned Clients")} (${clients.length})`}
                      icon={Users}
                    >
                      {loadingClients ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : clients.length === 0 ? (
                        <div className="flex flex-col items-center bg-muted/20 py-12 border border-border/50 border-dashed rounded-xl text-center">
                          <Users className="opacity-20 mb-3 w-10 h-10 text-primary" />
                          <p className="font-medium text-foreground text-sm">
                            {t("No clients assigned to this employee.")}
                          </p>
                        </div>
                      ) : (
                        <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                          {clients.map((client) => (
                            <Link
                              key={client.id}
                              href={`/company/clients/${client.id}`}
                              className="group flex justify-between items-start gap-3 bg-muted/20 hover:bg-muted/40 p-3.5 border border-border/50 hover:border-primary/25 rounded-xl transition-all"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                                    {client.name}
                                  </p>
                                  {client.interest_type && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 px-1"
                                    >
                                      {client.interest_type}
                                    </Badge>
                                  )}
                                </div>
                                <p
                                  className="text-muted-foreground text-xs"
                                  dir="ltr"
                                >
                                  {client.phone}
                                </p>
                              </div>
                              <ExternalLink className="opacity-40 group-hover:opacity-100 w-3.5 h-3.5 text-muted-foreground shrink-0 transition-opacity" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  <TabsContent
                    value="properties"
                    className="space-y-5 mt-0 p-5 sm:p-6"
                  >
                    <SectionCard
                      title={`${t("Assigned Properties")} (${properties.length})`}
                      icon={Building2}
                    >
                      {loadingProperties ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : properties.length === 0 ? (
                        <div className="flex flex-col items-center bg-muted/20 py-12 border border-border/50 border-dashed rounded-xl text-center">
                          <Building2 className="opacity-20 mb-3 w-10 h-10 text-primary" />
                          <p className="font-medium text-foreground text-sm">
                            {t("No properties assigned to this employee.")}
                          </p>
                        </div>
                      ) : (
                        <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                          {properties.map((prop) => (
                            <div
                              key={prop.id}
                              className="group relative flex gap-3 bg-muted/20 hover:bg-muted/40 p-3 border border-border/50 hover:border-primary/25 rounded-xl transition-all overflow-hidden"
                            >
                              <div className="rounded-lg w-[72px] h-[72px] overflow-hidden shrink-0">
                                <img
                                  src={
                                    prop.images?.[0] ||
                                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&auto=format&fit=crop&q=80"
                                  }
                                  alt={prop.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="flex-1 min-w-0 py-0.5">
                                <p
                                  className="font-semibold text-primary text-xs"
                                  dir="ltr"
                                >
                                  {prop.code}
                                </p>
                                <p className="mt-0.5 font-medium text-foreground text-sm line-clamp-2 leading-snug">
                                  {prop.title}
                                </p>
                                <p
                                  className="mt-1 font-outfit font-bold text-foreground text-sm"
                                  dir="ltr"
                                >
                                  AED {prop.price?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>

                  {canAccessRevenue ? (
                  <TabsContent
                    value="revenues"
                    className="space-y-5 mt-0 p-5 sm:p-6"
                  >
                    <SectionCard
                      title={`${t("Revenue")} (${revenues.length})`}
                      icon={Wallet}
                    >
                      {loadingRevenues ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : revenues.length === 0 ? (
                        <div className="flex flex-col items-center bg-muted/20 py-12 border border-border/50 border-dashed rounded-xl text-center">
                          <Wallet className="opacity-20 mb-3 w-10 h-10 text-primary" />
                          <p className="font-medium text-foreground text-sm">
                            {t("No revenue records for this employee.")}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-primary/5 px-4 py-3 border border-primary/15 rounded-xl">
                            <span className="font-medium text-muted-foreground text-sm">
                              {t("Total Commission")}
                            </span>
                            <span
                              className="font-outfit font-bold text-primary text-lg tabular-nums"
                              dir="ltr"
                            >
                              AED {totalCommission.toLocaleString()}
                            </span>
                          </div>
                          {revenues.map((rev) => (
                            <div
                              key={rev.id}
                              className="flex justify-between items-start gap-3 bg-muted/20 p-3.5 border border-border/50 rounded-xl"
                            >
                              <div className="min-w-0">
                                <p
                                  className="font-semibold text-foreground text-sm"
                                  dir="ltr"
                                >
                                  {rev.property_code}
                                </p>
                                <p className="mt-0.5 text-muted-foreground text-xs truncate">
                                  {rev.client_name} · {rev.owner_name}
                                </p>
                                <p className="mt-1 text-muted-foreground text-[11px]">
                                  {format(
                                    new Date(rev.deal_completion_date),
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              </div>
                              <p
                                className="font-semibold text-foreground text-sm tabular-nums shrink-0"
                                dir="ltr"
                              >
                                AED{" "}
                                {(
                                  Number(rev.commission_value) || 0
                                ).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>
                  ) : null}

                  <TabsContent
                    value="activity"
                    className="space-y-5 mt-0 p-5 sm:p-6"
                  >
                    <div className="mb-1">
                      <h3 className="font-outfit font-semibold text-foreground text-base">
                        {t("Activity")}
                      </h3>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {t(
                          "Status updates and notes made by this employee.",
                        )}
                      </p>
                    </div>

                    <SectionCard title={t("Recent Activity")} icon={History}>
                      {loadingActivity ? (
                        <div className="flex justify-center py-10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : activity.length === 0 ? (
                        <div className="flex flex-col items-center bg-muted/20 py-12 border border-border/50 border-dashed rounded-xl text-center">
                          <History className="opacity-20 mb-3 w-10 h-10 text-primary" />
                          <p className="font-medium text-foreground text-sm">
                            {t("No activity recorded yet.")}
                          </p>
                        </div>
                      ) : (
                        <div className="relative space-y-0 ps-2">
                          <div
                            className="top-2 bottom-2 start-[11px] absolute bg-border/70 w-px"
                            aria-hidden
                          />
                          {activity.map((item) => {
                            const href = entityHref(
                              item.entity_type,
                              item.entity_id,
                            );
                            const typeLabel =
                              item.entity_type === "owner"
                                ? t("Owner")
                                : item.entity_type === "client"
                                  ? t("Client")
                                  : t("Property");
                            return (
                              <div
                                key={`${item.entity_type}-${item.id}`}
                                className="relative flex gap-3 pb-5 last:pb-0"
                              >
                                <span className="z-10 flex justify-center items-center bg-primary/15 mt-1 border-2 border-background rounded-full w-5 h-5 shrink-0">
                                  <span className="bg-primary rounded-full w-1.5 h-1.5" />
                                </span>
                                <div className="flex-1 bg-muted/20 p-3.5 border border-border/50 rounded-xl min-w-0">
                                  <div className="flex flex-wrap justify-between items-start gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5"
                                      >
                                        {typeLabel}
                                      </Badge>
                                      {(item.status_name || item.status) && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] h-5 font-normal"
                                        >
                                          {item.status_name || item.status}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-muted-foreground text-[11px] tabular-nums shrink-0">
                                      {formatRelativeDate(
                                        new Date(item.created_at),
                                        t,
                                      )}
                                    </p>
                                  </div>
                                  {item.entity_label && (
                                    <p className="mt-2 font-medium text-foreground text-sm truncate">
                                      {href ? (
                                        <Link
                                          href={href}
                                          className="hover:text-primary transition-colors"
                                        >
                                          {item.entity_label}
                                        </Link>
                                      ) : (
                                        item.entity_label
                                      )}
                                    </p>
                                  )}
                                  {item.note && (
                                    <p className="flex items-start gap-1.5 mt-2 text-muted-foreground text-xs leading-relaxed">
                                      <MessageSquare className="mt-0.5 w-3 h-3 shrink-0" />
                                      {item.note}
                                    </p>
                                  )}
                                  {item.follow_up_date && (
                                    <p className="flex items-center gap-1.5 mt-2 text-amber-700 text-xs">
                                      <CalendarClock className="w-3 h-3" />
                                      {item.follow_up_date}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </SectionCard>
                  </TabsContent>
                </div>
              </Form>
            </Tabs>

            {activeTab === "info" && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-muted/20 px-5 sm:px-6 py-4 border-border/60 border-t">
                <p className="text-muted-foreground text-xs">
                  {t(
                    "Changes to employee information will be saved immediately.",
                  )}
                </p>
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="gap-2 min-w-[140px] h-10"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSubmitting ? t("Saving...") : t("Save changes")}
                </Button>
              </div>
            )}
          </div>

          <aside className="hidden lg:flex flex-col bg-muted/15 w-72 border-border/60 border-s shrink-0">
            <div className="p-5 space-y-5">
              {(cleanPhone || email) && (
                <div className="space-y-3">
                  <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                    {t("Quick Actions")}
                  </p>
                  <div className="flex flex-col gap-2">
                    {cleanPhone && (
                      <>
                        <Button
                          asChild
                          variant="outline"
                          className="justify-start gap-2 h-10"
                        >
                          <a href={`tel:${cleanPhone}`}>
                            <Phone className="w-4 h-4 text-primary" />
                            {t("Call")}
                          </a>
                        </Button>
                        <Button
                          asChild
                          className="justify-start bg-[#25D366] hover:bg-[#25D366]/90 gap-2 h-10 text-white"
                        >
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </a>
                        </Button>
                      </>
                    )}
                    {email && (
                      <Button
                        asChild
                        variant="outline"
                        className="justify-start gap-2 h-10"
                      >
                        <a href={`mailto:${email}`}>
                          <Mail className="w-4 h-4 text-primary" />
                          {t("Email")}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {(cleanPhone || email) && <Separator />}

              <div className="space-y-3">
                <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                  {t("Role")}
                </p>
                <div className="bg-card shadow-sm p-4 border border-border/60 rounded-xl text-center">
                  <div className="flex justify-center items-center bg-primary/10 mx-auto mb-3 rounded-full ring-4 ring-primary/5 w-14 h-14 font-outfit font-bold text-primary text-xl">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-foreground text-sm">
                    {isManager(employee?.role)
                      ? t("Manager")
                      : isAdministrator(employee?.role)
                        ? t("Administrator")
                        : t("Sales Agent")}
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {isElevated && !employee.employee?.job_title
                      ? isManager(employee.role)
                        ? t("Manager")
                        : t("Administrator")
                      : jobTitleLabel(employee.employee?.job_title, t)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="font-medium text-muted-foreground text-[11px] uppercase tracking-widest">
                  {t("Summary")}
                </p>
                <div className="space-y-2">
                  {[
                    {
                      icon: UserRound,
                      label: t("Owners"),
                      value: owners.length,
                    },
                    {
                      icon: Users,
                      label: t("Clients"),
                      value: clients.length,
                    },
                    {
                      icon: Building2,
                      label: t("Properties"),
                      value: properties.length,
                    },
                    ...(canAccessRevenue
                      ? [
                          {
                            icon: Wallet,
                            label: t("Deals"),
                            value: revenues.length,
                          },
                        ]
                      : []),
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between items-center bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {value}
                      </span>
                    </div>
                  ))}
                  {canAccessRevenue ? (
                  <div className="flex justify-between items-center bg-card px-3 py-2.5 border border-border/50 rounded-lg text-sm">
                    <span className="text-muted-foreground">
                      {t("Commission")}
                    </span>
                    <span
                      className="font-semibold text-primary text-xs tabular-nums"
                      dir="ltr"
                    >
                      AED {totalCommission.toLocaleString()}
                    </span>
                  </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        employeeName={displayName}
        isSubmitting={resetPasswordMutation.isPending}
        onConfirm={(password) => {
          void handleResetPassword(password);
        }}
      />
    </div>
  );
};
