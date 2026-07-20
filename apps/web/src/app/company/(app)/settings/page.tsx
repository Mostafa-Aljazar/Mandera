"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DocumentHead from "@/components/common/DocumentHead";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import OwnerStatusesTab from "@/components/company/settings/OwnerStatusesTab";
import AreasDistrictsTab from "@/components/company/settings/AreasDistrictsTab";
import MarketingChannelsTab from "@/components/company/settings/MarketingChannelsTab";
import EmployeeDeletionDialog from "@/components/company/employees/EmployeeDeletionDialog";
import SettingsSection from "@/components/company/settings/SettingsSection";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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

const SettingsPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const isSuperAdmin = currentUser?.role === "company_super_admin";
  const companyId = currentUser?.company_id || company?.id;

  const { data: propertyTypesData } = usePropertyTypes(companyId);
  const propertyTypes = propertyTypesData ?? [];
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
    defaultValues: { name: "", priority_order: 1 },
  });

  const clientStatusForm = useForm<TSettingsEntitySchema>({
    resolver: zodResolver(SettingsEntitySchema(t, true)),
    defaultValues: { name: "", priority_order: 1 },
  });

  // Inline editing state for client statuses
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(
    null,
  );
  const [editingPriorityValue, setEditingPriorityValue] = useState("");

  // Employee Deletion State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] =
    useState<CompanyEmployeeWithDetails | null>(null);

  const savePropertyType = propertyTypeForm.handleSubmit(async (formData) => {
    if (!companyId) return;
    try {
      if (editItem) {
        const result = await updatePropertyTypeMutation.mutateAsync({
          id: editItem.id,
          name: formData.name,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Updated successfully."));
      } else {
        const result = await createPropertyTypeMutation.mutateAsync({
          companyId,
          name: formData.name,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Created successfully."));
      }
      setOpenPropertyType(false);
      setEditItem(null);
      propertyTypeForm.reset({ name: "", priority_order: 1 });
    } catch (error: any) {
      toast.error(error.message || t("An error occurred."));
    }
  });

  const saveClientStatus = clientStatusForm.handleSubmit(async (formData) => {
    if (!companyId) return;
    try {
      const priorityOrder = parseInt(String(formData.priority_order), 10);
      if (editItem) {
        const result = await updateClientStatusMutation.mutateAsync({
          id: editItem.id,
          name: formData.name,
          priorityOrder,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Updated successfully."));
      } else {
        const result = await createClientStatusMutation.mutateAsync({
          companyId,
          name: formData.name,
          priorityOrder,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Created successfully."));
      }
      setOpenClientStatus(false);
      setEditItem(null);
      clientStatusForm.reset({ name: "", priority_order: 1 });
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
    clientStatusForm.reset({ name: "", priority_order: nextPriority });
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
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <Table>
                    <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>{t("Name")}</TableHead>
            <TableHead className="w-[150px] text-end">
              {t("Actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={2}
                className="py-8 text-muted-foreground text-center"
              >
                {t("No items found. Create one to get started.")}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-end">
                  <div className="inline-flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setEditItem(item);
                        propertyTypeForm.reset({ name: item.name });
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
    </div>
  );

  const renderClientStatusTable = () => (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <Table>
                    <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[100px]">{t("Priority")}</TableHead>
            <TableHead>{t("Name")}</TableHead>
            <TableHead className="w-[150px] text-end">
              {t("Actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientStatuses.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-8 text-muted-foreground text-center"
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
                      <span className="font-mono font-medium text-muted-foreground">
                        #{item.priority_order || "-"}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-end">
                  <div className="inline-flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setEditItem(item);
                        clientStatusForm.reset({
                          name: item.name,
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
    </div>
  );

  return (
    <>
      <DocumentHead title={`${t("Settings")} | MANDERA CRM`} />
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
          <div className="relative mx-auto px-4 sm:px-6 py-8 sm:py-10 container max-w-6xl">
            <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl md:text-4xl tracking-tight">
              {t("System Settings")}
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
              {t(
                "Configure global properties, statuses, locations and employees.",
              )}
            </p>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 container max-w-6xl">
          <Tabs defaultValue="employees" className="space-y-6">
            <div className="bg-card shadow-[var(--shadow-subtle)] p-1.5 border border-border/60 rounded-2xl overflow-x-auto">
              <TabsList className="justify-start bg-transparent gap-1 p-0 h-auto w-full min-w-[720px]">
                {[
                  { value: "employees", label: t("Employees"), icon: Users },
                  {
                    value: "property-types",
                    label: t("Property Types"),
                    icon: Building2,
                  },
                  {
                    value: "client-statuses",
                    label: t("Client Status"),
                    icon: ListChecks,
                  },
                  {
                    value: "owner-statuses",
                    label: t("Owner Status"),
                    icon: UserRound,
                  },
                  {
                    value: "areas-districts",
                    label: t("Areas"),
                    icon: MapPin,
                  },
                  {
                    value: "marketing-channels",
                    label: t("Marketing"),
                    icon: Megaphone,
                  },
                ].map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(
                      "gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:shadow-none px-3 sm:px-4 rounded-xl h-10 data-[state=active]:text-primary text-muted-foreground text-sm shrink-0",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="employees" className="mt-0 outline-none">
              <SettingsSection
                title={t("Manage Employees")}
                description={t("View and manage company employees.")}
                icon={Users}
                action={
                  <Button asChild variant="outline" size="sm" className="gap-2 h-9">
                    <Link href="/company/employees">
                      {t("Open Employees")}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                }
              >
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead>{t("Name")}</TableHead>
                        <TableHead>{t("Email")}</TableHead>
                        <TableHead>{t("Role")}</TableHead>
                        <TableHead className="w-[7.5rem] text-end">
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
                        employees.map((emp) => (
                          <TableRow
                            key={emp.id}
                            className="hover:bg-muted/30"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2.5">
                                <span className="flex justify-center items-center bg-primary/10 rounded-lg w-8 h-8 font-semibold text-primary text-xs shrink-0">
                                  {(emp.name || "?").charAt(0).toUpperCase()}
                                </span>
                                <span>{emp.name || t("Unnamed")}</span>
                                {emp.id === currentUser?.id && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5"
                                  >
                                    {t("You")}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
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
                                  <Link href={`/company/employees/${emp.id}`}>
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                </Button>
                                {isSuperAdmin && emp.id !== currentUser?.id && (
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </SettingsSection>
            </TabsContent>

            <TabsContent value="property-types" className="mt-0 outline-none">
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
                        propertyTypeForm.reset({ name: "" });
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 h-9">
                        <Plus className="w-4 h-4" /> {t("Add Type")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editItem ? t("Edit") : t("Add")} {t("Property Type")}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...propertyTypeForm}>
                        <div className="space-y-4 py-4">
                          <FormField
                            control={propertyTypeForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("Name")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={t("e.g. Villa")}
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
            </TabsContent>

            <TabsContent value="client-statuses" className="mt-0 outline-none">
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
                          name: "",
                          priority_order: 1,
                        });
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        onClick={openAddClientStatus}
                        size="sm"
                        className="gap-2 h-9"
                      >
                        <Plus className="w-4 h-4" /> {t("Add Status")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editItem ? t("Edit") : t("Add")} {t("Client Status")}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...clientStatusForm}>
                        <div className="space-y-4 py-4">
                          <FormField
                            control={clientStatusForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("Name")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={t("e.g. Hot Lead")}
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
            </TabsContent>

            <TabsContent value="owner-statuses" className="mt-0 outline-none">
              <OwnerStatusesTab />
            </TabsContent>

            <TabsContent value="areas-districts" className="mt-0 outline-none">
              <AreasDistrictsTab />
            </TabsContent>

            <TabsContent
              value="marketing-channels"
              className="mt-0 outline-none"
            >
              <MarketingChannelsTab />
            </TabsContent>
          </Tabs>
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
