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
  useUpdateEmployee,
} from "@/hooks/queries/useEmployees";
import { useOwners } from "@/hooks/queries/useOwners";
import { useClients } from "@/hooks/queries/useClients";
import { useProperties } from "@/hooks/queries/useProperties";
import { useRevenues } from "@/hooks/queries/useRevenues";
import { useEmployeeActivity } from "@/hooks/queries/useStatusHistory";

const JOB_TITLES = ["sales_agent", "admin", "manager"] as const;

const EmployeeProfileSchema = (t: TFunction, hasEmployeeRecord: boolean) =>
  z
    .object({
      name: z.string().trim().min(1, t("Full name is required")),
      email: z.string().trim().email(t("Email")),
      phone: z.string(),
      job_title: z.string(),
      role: z.enum(["company_super_admin", "company_employee"]),
    })
    .superRefine((data, ctx) => {
      if (!hasEmployeeRecord) return;
      if (!data.phone || !isValidPhoneNumber(data.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: t(
            "Invalid phone number format. Please use format like +974 1234 5678",
          ),
        });
      }
      if (!JOB_TITLES.includes(data.job_title as (typeof JOB_TITLES)[number])) {
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
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-xl overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 bg-muted/30 px-5 py-3.5 border-border/50 border-b">
        <span className="flex justify-center items-center bg-primary/10 rounded-lg w-7 h-7 text-primary">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
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
    case "admin":
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
  const router = useRouter();
  const { company, currentUser } = useCompanyAuth();
  const [activeTab, setActiveTab] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: employee,
    isLoading,
    isError,
    refetch,
  } = useCompanyEmployee(profileId, company?.id);

  const hasEmployeeRecord = Boolean(employee?.employee_id);
  const isAdmin = employee?.role === "company_super_admin";
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
  const { data: revenuesData, isFetching: loadingRevenues } = useRevenues(
    company?.id,
    revenueFilters,
  );
  const { data: activityData, isFetching: loadingActivity } =
    useEmployeeActivity(profileId, company?.id);

  const owners = ownersData ?? [];
  const clients = clientsData ?? [];
  const properties = propertiesData ?? [];
  const revenues = revenuesData ?? [];
  const activity = activityData ?? [];

  const totalCommission = useMemo(
    () =>
      revenues.reduce(
        (sum, r) => sum + (Number(r.commission_value) || 0),
        0,
      ),
    [revenues],
  );

  const updateEmployeeMutation = useUpdateEmployee();

  const form = useForm<TEmployeeProfileSchema>({
    resolver: zodResolver(EmployeeProfileSchema(t, hasEmployeeRecord)),
    values: employee
      ? {
          name: employee.name || "",
          email: employee.email || employee.employee?.email || "",
          phone: employee.employee?.phone || "",
          job_title: employee.employee?.job_title || "",
          role:
            employee.role === "company_super_admin"
              ? "company_super_admin"
              : "company_employee",
        }
      : undefined,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      job_title: "",
      role: "company_employee",
    },
  });

  useEffect(() => {
    if (!isError) return;
    toast.error(t("Employee not found"));
    router.replace("/company/employees");
  }, [isError, router, t]);

  const displayName =
    employee?.name || form.watch("name") || t("Unnamed");
  const email =
    employee?.email || employee?.employee?.email || form.watch("email") || "";
  const phone = form.watch("phone") || employee?.employee?.phone || "";
  const cleanPhone = phone.replace(/\D/g, "");

  const handleSave = form.handleSubmit(async (formData) => {
    if (!employee) return;
    if (hasEmployeeRecord) {
      if (!formData.phone || !isValidPhoneNumber(formData.phone)) {
        form.setError("phone", {
          message: t(
            "Invalid phone number format. Please use format like +974 1234 5678",
          ),
        });
        return;
      }
      if (
        !JOB_TITLES.includes(
          formData.job_title as (typeof JOB_TITLES)[number],
        )
      ) {
        form.setError("job_title", {
          message: t("Please select a valid job title."),
        });
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const result = await updateEmployeeMutation.mutateAsync({
        profileId: employee.id,
        employeeId: employee.employee_id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        job_title: formData.job_title || "sales_agent",
        role: formData.role,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Employee updated successfully"));
      refetch();
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to update employee"));
    } finally {
      setIsSubmitting(false);
    }
  });

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
          <div className="relative flex items-center gap-4 px-5 sm:px-6 py-5">
            <div className="relative flex justify-center items-center bg-primary/15 rounded-2xl ring-2 ring-primary/30 ring-offset-2 ring-offset-background w-14 h-14 font-outfit font-bold text-primary text-xl shadow-sm shrink-0">
              {displayName.charAt(0).toUpperCase()}
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
                  {isAdmin ? t("Admin") : t("Employee")}
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
              <div className="bg-muted/10 px-4 sm:px-6 border-border/60 border-b">
                <TabsList className="justify-start bg-transparent gap-1 p-0 h-11 w-full overflow-x-auto">
                  {[
                    { value: "info", icon: FileText, label: t("Information") },
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
                    {
                      value: "revenues",
                      icon: Wallet,
                      label: t("Revenue"),
                      count: revenues.length,
                    },
                    {
                      value: "activity",
                      icon: History,
                      label: t("Activity"),
                      count: activity.length,
                    },
                  ].map(({ value, icon: Icon, label, count }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={cn(
                        "gap-1.5 data-[state=active]:bg-background px-3 sm:px-4 rounded-none border-transparent border-b-2 h-11 data-[state=active]:border-primary data-[state=active]:shadow-none text-sm shrink-0",
                        "data-[state=inactive]:text-muted-foreground",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                      {count !== undefined && count > 0 && (
                        <span className="bg-primary/10 ms-0.5 px-1.5 py-0.5 rounded-full font-medium text-[10px] text-primary tabular-nums">
                          {count}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <Form {...form}>
                <div>
                  <TabsContent value="info" className="space-y-5 mt-0 p-5 sm:p-6">
                    <SectionCard title={t("Contact Information")} icon={User}>
                      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-xs">
                                {t("Full Name")} *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="bg-background h-10"
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
                              <FormLabel className="text-xs">
                                {t("Email")} *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  dir="ltr"
                                  className="bg-background h-10"
                                  disabled={!hasEmployeeRecord}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {hasEmployeeRecord && (
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  {t("Phone Number")} *
                                </FormLabel>
                                <FormControl>
                                  <PhoneInput {...field} className="flex-1" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard title={t("Role & Job")} icon={Briefcase}>
                      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                        {hasEmployeeRecord && (
                          <FormField
                            control={form.control}
                            name="job_title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  {t("Job Title")} *
                                </FormLabel>
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
                        )}
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t("Role")} *
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={employee.id === currentUser?.id}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="company_employee">
                                    {t("Employee")}
                                  </SelectItem>
                                  <SelectItem value="company_super_admin">
                                    {t("Admin")}
                                  </SelectItem>
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
                    {isAdmin ? t("Admin") : t("Employee")}
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {isAdmin && !employee.employee?.job_title
                      ? t("Company Admin")
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
                    {
                      icon: Wallet,
                      label: t("Deals"),
                      value: revenues.length,
                    },
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
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
