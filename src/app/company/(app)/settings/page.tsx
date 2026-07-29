"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DocumentHead from "@/components/common/DocumentHead";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import GeneralSettingsTab from "@/components/company/settings/GeneralSettingsTab";
import OwnerStatusesTab from "@/components/company/settings/OwnerStatusesTab";
import AreasDistrictsTab from "@/components/company/settings/AreasDistrictsTab";
import MarketingChannelsTab from "@/components/company/settings/MarketingChannelsTab";
import PortalIntegrationsTab from "@/components/company/settings/PortalIntegrationsTab";
import EmployeeDeletionDialog from "@/components/company/employees/EmployeeDeletionDialog";
import SettingsSection from "@/components/company/settings/SettingsSection";
import SettingsTableShell from "@/components/company/settings/SettingsTableShell";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Edit2,
  Trash2,
  Plus,
  Users,
  Loader2,
  Check,
  Building2,
  ListChecks,
  UserRound,
  MapPin,
  Megaphone,
  ExternalLink,
  Eye,
  Globe,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  SettingsEntitySchema,
  type TSettingsEntitySchema,
} from "@/validations/settings-entity.schema";
import type {
  PropertyType,
  ClientStatus,
  CompanyEmployeeWithDetails,
} from "@/types/supabase-entities.types";
import {
  usePropertyTypes,
  useCreatePropertyType,
  useUpdatePropertyType,
  useDeletePropertyType,
  useClientStatuses,
  useCreateClientStatus,
  useUpdateClientStatus,
  useUpdateClientStatusPriority,
  useDeleteClientStatus,
  useSettingsEmployees,
} from "@/hooks/queries/useSettings";

const SETTINGS_TABS = [
  "general",
  "employees",
  "property-types",
  "client-statuses",
  "owner-statuses",
  "areas-districts",
  "marketing-channels",
  "portal-integrations",
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

function resolveSettingsTab(raw: string | null): SettingsTab {
  if (raw === "portals") return "portal-integrations";
  if (raw && (SETTINGS_TABS as readonly string[]).includes(raw)) {
    return raw as SettingsTab;
  }
  return "employees";
}

const SettingsPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSuperAdmin = currentUser?.role === "company_super_admin";
  const companyId = currentUser?.company_id || company?.id;

  const tabFromUrl = resolveSettingsTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "employees") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const navItems: { value: SettingsTab; label: string; icon: LucideIcon }[] = [
    { value: "general", label: t("General"), icon: Settings2 },
    { value: "employees", label: t("Employees"), icon: Users },
    { value: "property-types", label: t("Property Types"), icon: Building2 },
    { value: "client-statuses", label: t("Client Status"), icon: ListChecks },
    { value: "owner-statuses", label: t("Owner Status"), icon: UserRound },
    { value: "areas-districts", label: t("Areas"), icon: MapPin },
    { value: "marketing-channels", label: t("Marketing"), icon: Megaphone },
    { value: "portal-integrations", label: t("Portals"), icon: Globe },
  ];

  const { data: propertyTypesData } = usePropertyTypes(companyId);
  const propertyTypes = [...(propertyTypesData ?? [])].sort((a, b) => {
    if (language === "ar") {
      return a.name_ar.localeCompare(b.name_ar, "ar", { sensitivity: "base" });
    }
    return a.name_en.localeCompare(b.name_en, "en", { sensitivity: "base" });
  });
  const { data: clientStatusesData } = useClientStatuses(companyId);
  const clientStatuses = clientStatusesData ?? [];
  const { data: employeesData } = useSettingsEmployees(companyId);
  const employees: CompanyEmployeeWithDetails[] = employeesData ?? [];

  const createPropertyTypeMutation = useCreatePropertyType();
  const updatePropertyTypeMutation = useUpdatePropertyType();
  const deletePropertyTypeMutation = useDeletePropertyType();

  const createClientStatusMutation = useCreateClientStatus();
  const updateClientStatusMutation = useUpdateClientStatus();
  const updateClientStatusPriorityMutation = useUpdateClientStatusPriority();
  const deleteClientStatusMutation = useDeleteClientStatus();

  const [openPropertyType, setOpenPropertyType] = useState(false);
  const [openClientStatus, setOpenClientStatus] = useState(false);

  const [editItem, setEditItem] = useState<PropertyType | ClientStatus | null>(
    null,
  );
  const isSubmitting =
    createPropertyTypeMutation.isPending ||
    updatePropertyTypeMutation.isPending ||
    createClientStatusMutation.isPending ||
    updateClientStatusMutation.isPending;

  const propertyTypeForm = useForm<TSettingsEntitySchema>({
    resolver: zodResolver(SettingsEntitySchema(t, false)),
    defaultValues: { name_en: "", name_ar: "", priority_order: 1 },
  });

  const clientStatusForm = useForm<TSettingsEntitySchema>({
    resolver: zodResolver(SettingsEntitySchema(t, true)),
    defaultValues: { name_en: "", name_ar: "", priority_order: 1 },
  });

  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(
    null,
  );
  const [editingPriorityValue, setEditingPriorityValue] = useState("");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] =
    useState<CompanyEmployeeWithDetails | null>(null);

  const savePropertyType = propertyTypeForm.handleSubmit(async (formData) => {
    if (!companyId) return;
    try {
      const nameEn = formData.name_en?.trim() || "";
      const nameAr = formData.name_ar?.trim() || "";
      if (editItem) {
        const result = await updatePropertyTypeMutation.mutateAsync({
          id: editItem.id,
          nameEn,
          nameAr,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Updated successfully."));
      } else {
        const result = await createPropertyTypeMutation.mutateAsync({
          companyId,
          nameEn,
          nameAr,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Created successfully."));
      }
      setOpenPropertyType(false);
      setEditItem(null);
      propertyTypeForm.reset({ name_en: "", name_ar: "", priority_order: 1 });
    } catch (error: any) {
      toast.error(error.message || t("An error occurred."));
    }
  });

  const saveClientStatus = clientStatusForm.handleSubmit(async (formData) => {
    if (!companyId) return;
    try {
      const priorityOrder = parseInt(String(formData.priority_order), 10);
      const nameEn = formData.name_en?.trim() || "";
      const nameAr = formData.name_ar?.trim() || "";
      if (editItem) {
        const result = await updateClientStatusMutation.mutateAsync({
          id: editItem.id,
          nameEn,
          nameAr,
          priorityOrder,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Updated successfully."));
      } else {
        const result = await createClientStatusMutation.mutateAsync({
          companyId,
          nameEn,
          nameAr,
          priorityOrder,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Created successfully."));
      }
      setOpenClientStatus(false);
      setEditItem(null);
      clientStatusForm.reset({ name_en: "", name_ar: "", priority_order: 1 });
    } catch (error: any) {
      toast.error(error.message || t("An error occurred."));
    }
  });

  const handleDeletePropertyType = async (id: string) => {
    if (!window.confirm(t("Are you sure you want to delete this item?")))
      return;
    try {
      const result = await deletePropertyTypeMutation.mutateAsync(id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Deleted successfully."));
    } catch (error) {
      toast.error(t("Failed to delete. It might be in use."));
    }
  };

  const handleDeleteClientStatus = async (id: string) => {
    if (!window.confirm(t("Are you sure you want to delete this item?")))
      return;
    try {
      const result = await deleteClientStatusMutation.mutateAsync(id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Deleted successfully."));
    } catch (error) {
      toast.error(t("Failed to delete. It might be in use."));
    }
  };

  const handleInlinePrioritySave = async (id: string) => {
    const newPriority = parseInt(editingPriorityValue, 10);
    if (isNaN(newPriority) || newPriority < 1) {
      toast.error(t("Priority must be a positive number."));
      setEditingPriorityId(null);
      return;
    }

    try {
      const result = await updateClientStatusPriorityMutation.mutateAsync({
        id,
        priorityOrder: newPriority,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Priority updated."));
      setEditingPriorityId(null);
    } catch (error) {
      console.error(error);
      toast.error(t("Failed to update priority."));
    }
  };

  const openAddClientStatus = () => {
    const nextPriority =
      clientStatuses.length > 0
        ? Math.max(...clientStatuses.map((s) => s.priority_order || 0)) + 1
        : 1;
    setEditItem(null);
    clientStatusForm.reset({
      name_en: "",
      name_ar: "",
      priority_order: nextPriority,
    });
    setOpenClientStatus(true);
  };

  const initiateEmployeeDeletion = (employee: CompanyEmployeeWithDetails) => {
    if (employee.id === currentUser?.id) {
      toast.error(t("You cannot delete your own account."));
      return;
    }
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleEmployeeDeletedSuccess = () => {
    setIsDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  const renderTable = (
    data: PropertyType[],
    setOpen: (open: boolean) => void,
  ) => (
    <SettingsTableShell>
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="text-start">{`${t("Name")} (EN)`}</TableHead>
            <TableHead className="text-start">{`${t("Name")} (AR)`}</TableHead>
            <TableHead className="w-[120px] text-end">{t("Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-10 text-muted-foreground text-center"
              >
                {t("No items found. Create one to get started.")}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="font-medium text-start">
                  <span dir="ltr" className="inline-block">
                    {item.name_en}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-start">
                  <span dir="rtl" className="inline-block">
                    {item.name_ar}
                  </span>
                </TableCell>
                <TableCell className="text-end">
                  <div className="inline-flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setEditItem(item);
                        propertyTypeForm.reset({
                          name_en: item.name_en,
                          name_ar: item.name_ar,
                        });
                        setOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeletePropertyType(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </SettingsTableShell>
  );

  const renderClientStatusTable = () => (
    <SettingsTableShell>
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[100px]">{t("Priority")}</TableHead>
            <TableHead className="text-start">{`${t("Name")} (EN)`}</TableHead>
            <TableHead className="text-start">{`${t("Name")} (AR)`}</TableHead>
            <TableHead className="w-[120px] text-end">{t("Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientStatuses.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-10 text-muted-foreground text-center"
              >
                {t("No items found. Create one to get started.")}
              </TableCell>
            </TableRow>
          ) : (
            clientStatuses.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell>
                  {editingPriorityId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        className="px-2 py-1 w-16 h-8"
                        value={editingPriorityValue}
                        onChange={(e) =>
                          setEditingPriorityValue(e.target.value)
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleInlinePrioritySave(item.id)
                        }
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-primary"
                        onClick={() => handleInlinePrioritySave(item.id)}
                        disabled={updateClientStatusPriorityMutation.isPending}
                      >
                        {updateClientStatusPriorityMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="inline-block hover:bg-muted px-2 py-1 rounded transition-colors cursor-pointer"
                      onClick={() => {
                        setEditingPriorityId(item.id);
                        setEditingPriorityValue(
                          String(item.priority_order || 1),
                        );
                      }}
                      title={t("Click to edit priority")}
                    >
                      <span className="font-mono font-medium text-muted-foreground" dir="ltr">
                        #{item.priority_order || "-"}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium text-start">
                  <span dir="ltr" className="inline-block">
                    {item.name_en}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-start">
                  <span dir="rtl" className="inline-block">
                    {item.name_ar}
                  </span>
                </TableCell>
                <TableCell className="text-end">
                  <div className="inline-flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setEditItem(item);
                        clientStatusForm.reset({
                          name_en: item.name_en,
                          name_ar: item.name_ar,
                          priority_order: item.priority_order || 1,
                        });
                        setOpenClientStatus(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClientStatus(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </SettingsTableShell>
  );

  const activeLabel =
    navItems.find((item) => item.value === activeTab)?.label ?? t("Settings");

  return (
    <>
      <DocumentHead title={`${t("Settings")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-muted/20 min-h-[calc(100vh-68px)]">
        <section className="bg-card border-border/50 border-b">
          <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex justify-center items-center bg-primary/10 rounded-xl w-10 h-10 sm:w-11 sm:h-11 text-primary shrink-0">
                <Settings2 className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h1 className="font-outfit font-bold text-foreground text-xl sm:text-2xl md:text-3xl tracking-tight">
                  {t("System Settings")}
                </h1>
                <p className="mt-1 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t(
                    "Configure global properties, statuses, locations and employees.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-5 sm:py-8 container max-w-6xl">
          <div className="items-start gap-6 lg:gap-8 grid lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* Mobile nav */}
            <div className="lg:hidden space-y-2">
              <label
                htmlFor="settings-section"
                className="block font-medium text-muted-foreground text-xs ltr:uppercase tracking-wide"
              >
                {t("Settings")}
              </label>
              <Select
                value={activeTab}
                onValueChange={(value) =>
                  selectTab(resolveSettingsTab(value))
                }
              >
                <SelectTrigger
                  id="settings-section"
                  className="bg-card shadow-[var(--shadow-subtle)] border-border/60 h-11"
                >
                  <SelectValue placeholder={activeLabel} />
                </SelectTrigger>
                <SelectContent>
                  {navItems.map(({ value, label, icon: Icon }) => (
                    <SelectItem key={value} value={value}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden lg:block">
              <nav
                aria-label={t("Settings")}
                className="bg-card shadow-[var(--shadow-subtle)] p-2 border border-border/60 rounded-2xl"
              >
                <p className="px-3 pt-2 pb-3 font-medium text-muted-foreground text-[11px] ltr:uppercase tracking-wider">
                  {t("Settings")}
                </p>
                <ul className="space-y-0.5">
                  {navItems.map(({ value, label, icon: Icon }) => {
                    const isActive = activeTab === value;
                    return (
                      <li key={value}>
                        <button
                          type="button"
                          onClick={() => selectTab(value)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl w-full font-medium text-sm text-start transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0 opacity-90" />
                          <span className="truncate">{label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* Content */}
            <div className="min-w-0">
              {activeTab === "employees" && (
                <SettingsSection
                  title={t("Manage Employees")}
                  description={t("View and manage company employees.")}
                  icon={Users}
                  action={
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full sm:w-auto h-9"
                    >
                      <Link href="/company/employees">
                        {t("Open Employees")}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  }
                >
                  <SettingsTableShell>
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead>{t("Name")}</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            {t("Email")}
                          </TableHead>
                          <TableHead>{t("Role")}</TableHead>
                          <TableHead className="w-[7rem] text-end">
                            {t("Actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="py-10 text-muted-foreground text-center"
                            >
                              {t("Loading...")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          employees.map((emp) => {
                            const empLabel =
                              employeeDisplayName(
                                emp.employee,
                                language,
                                emp.name,
                              ) || t("Unnamed");
                            return (
                            <TableRow
                              key={emp.id}
                              className="hover:bg-muted/30"
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="flex justify-center items-center bg-primary/10 rounded-lg w-8 h-8 font-semibold text-primary text-xs shrink-0">
                                    {empLabel.charAt(0).toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate">
                                        {empLabel}
                                      </span>
                                      {emp.id === currentUser?.id && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] h-5 shrink-0"
                                        >
                                          {t("You")}
                                        </Badge>
                                      )}
                                    </div>
                                    <p
                                      dir="ltr"
                                      className="sm:hidden mt-0.5 text-muted-foreground text-xs truncate"
                                    >
                                      {emp.email ||
                                        emp.employee?.email ||
                                        "—"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                                <span dir="ltr" className="inline-block">
                                  {emp.email || emp.employee?.email || "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] h-5 font-medium",
                                    emp.role === "company_super_admin"
                                      ? "bg-primary/10 text-primary border-primary/25"
                                      : "bg-sky-500/10 text-sky-700 border-sky-500/25",
                                  )}
                                >
                                  {emp.role === "company_super_admin"
                                    ? t("Admin")
                                    : t("Employee")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-end">
                                <div className="inline-flex items-center gap-0.5">
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 text-muted-foreground hover:text-primary"
                                    title={t("View Details")}
                                  >
                                    <Link
                                      href={`/company/employees/${emp.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Link>
                                  </Button>
                                  {isSuperAdmin &&
                                    emp.id !== currentUser?.id && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="hover:bg-destructive/10 w-8 h-8 text-muted-foreground hover:text-destructive"
                                        onClick={() =>
                                          initiateEmployeeDeletion(emp)
                                        }
                                        title={t("Delete Employee")}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                </div>
                              </TableCell>
                            </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </SettingsTableShell>
                </SettingsSection>
              )}

              {activeTab === "property-types" && (
                <SettingsSection
                  title={t("Property Types")}
                  description={t(
                    "Manage types of properties (e.g. Villa, Apartment).",
                  )}
                  icon={Building2}
                  action={
                    <Dialog
                      open={openPropertyType}
                      onOpenChange={(open) => {
                        setOpenPropertyType(open);
                        if (!open) {
                          setEditItem(null);
                          propertyTypeForm.reset({
                            name_en: "",
                            name_ar: "",
                            priority_order: 1,
                          });
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="gap-2 w-full sm:w-auto h-9"
                        >
                          <Plus className="w-4 h-4" /> {t("Add Type")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editItem ? t("Edit") : t("Add")}{" "}
                            {t("Property Type")}
                          </DialogTitle>
                        </DialogHeader>
                        <Form {...propertyTypeForm}>
                          <div className="space-y-4 py-4">
                            <FormField
                              control={propertyTypeForm.control}
                              name="name_en"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{`${t("Name")} (EN)`}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      value={field.value ?? ""}
                                      dir="ltr"
                                      placeholder="e.g. Villa"
                                      className="bg-background h-10"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={propertyTypeForm.control}
                              name="name_ar"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{`${t("Name")} (AR)`}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      value={field.value ?? ""}
                                      dir="rtl"
                                      placeholder="مثال: فيلا"
                                      className="bg-background h-10"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </Form>
                        <DialogFooter>
                          <Button
                            disabled={isSubmitting}
                            onClick={savePropertyType}
                            className="w-full sm:w-auto"
                          >
                            {isSubmitting ? t("Saving...") : t("Save")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  }
                >
                  {renderTable(propertyTypes, setOpenPropertyType)}
                </SettingsSection>
              )}

              {activeTab === "client-statuses" && (
                <SettingsSection
                  title={t("Client Statuses")}
                  description={t("Manage stages for client pipeline.")}
                  icon={ListChecks}
                  action={
                    <Dialog
                      open={openClientStatus}
                      onOpenChange={(open) => {
                        setOpenClientStatus(open);
                        if (!open) {
                          setEditItem(null);
                          clientStatusForm.reset({
                            name_en: "",
                            name_ar: "",
                            priority_order: 1,
                          });
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          onClick={openAddClientStatus}
                          size="sm"
                          className="gap-2 w-full sm:w-auto h-9"
                        >
                          <Plus className="w-4 h-4" /> {t("Add Status")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editItem ? t("Edit") : t("Add")}{" "}
                            {t("Client Status")}
                          </DialogTitle>
                        </DialogHeader>
                        <Form {...clientStatusForm}>
                          <div className="space-y-4 py-4">
                            <FormField
                              control={clientStatusForm.control}
                              name="name_en"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{`${t("Name")} (EN)`}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      value={field.value ?? ""}
                                      dir="ltr"
                                      placeholder="e.g. Hot Lead"
                                      className="bg-background h-10"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={clientStatusForm.control}
                              name="name_ar"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{`${t("Name")} (AR)`}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      value={field.value ?? ""}
                                      dir="rtl"
                                      placeholder="مثال: عميل مهتم"
                                      className="bg-background h-10"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={clientStatusForm.control}
                              name="priority_order"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("Priority Order")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="1"
                                      className="bg-background h-10"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </Form>
                        <DialogFooter>
                          <Button
                            disabled={isSubmitting}
                            onClick={saveClientStatus}
                            className="w-full sm:w-auto"
                          >
                            {isSubmitting ? t("Saving...") : t("Save")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  }
                >
                  {renderClientStatusTable()}
                </SettingsSection>
              )}

              {activeTab === "general" && <GeneralSettingsTab />}
              {activeTab === "owner-statuses" && <OwnerStatusesTab />}
              {activeTab === "areas-districts" && <AreasDistrictsTab />}
              {activeTab === "marketing-channels" && <MarketingChannelsTab />}
              {activeTab === "portal-integrations" && (
                <PortalIntegrationsTab />
              )}
            </div>
          </div>
        </div>
      </main>

      <EmployeeDeletionDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        employeeToDelete={
          employeeToDelete
            ? {
                id: employeeToDelete.id,
                name: employeeToDelete.name || undefined,
                employeeId: employeeToDelete.employee_id || undefined,
              }
            : null
        }
        onSuccess={handleEmployeeDeletedSuccess}
        companyId={companyId}
      />
    </>
  );
};

export default SettingsPage;
