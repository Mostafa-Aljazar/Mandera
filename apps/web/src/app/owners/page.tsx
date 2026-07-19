"use client";

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useOwners,
  useOwnerStatuses,
  useMarketingChannels,
  useOwnerPropertyCount,
  useCreateOwner,
  useUpdateOwner,
  useDeleteOwner,
  useBulkReassignOwners,
} from "@/hooks/queries/useOwners";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { getOwnersExportData } from "@/actions/owners";
import CompanyAdminHeader from "@/components/CompanyAdminHeader";
import OwnerDetailModal from "@/components/OwnerDetailModal";
import FilterPanel from "@/components/FilterPanel";
import FilterChips from "@/components/FilterChips";
import EmployeeReassignmentModal from "@/components/EmployeeReassignmentModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  User,
  MessageCircle,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Download,
  Megaphone,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useOwnerStatusBadge } from "@/hooks/useOwnerStatusBadge";
import { generateCSV, downloadCSV } from "@/utils/csvExport";
import { OwnerSchema, type TOwnerSchema } from "@/validations/owner.schema";
import type {
  Owner,
  CompanyEmployee,
  MarketingChannelRecord,
} from "@/types/supabase-entities.types";

const COUNTRIES = [
  "UAE",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Bahrain",
  "Kuwait",
  "UK",
  "USA",
  "Other",
];

interface OwnerFilterState {
  statusId: string | null;
  marketingChannel: string | null;
  createdFromDate: Date | null;
  createdToDate: Date | null;
  updatedFromDate: Date | null;
  updatedToDate: Date | null;
  employeeId: string | null;
}

interface OwnerCardProps {
  owner: Owner;
  employees: CompanyEmployee[];
  onEdit: (owner: Owner) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: (owner: Owner) => void;
  isSelected: boolean;
  onToggleSelect: (id: string, checked: boolean | "indeterminate") => void;
  companyId?: string;
}

const OwnerCard = ({
  owner,
  employees,
  onEdit,
  onDelete,
  onClick,
  isSelected,
  onToggleSelect,
  companyId,
}: OwnerCardProps) => {
  const { t } = useTranslation();
  const badge = useOwnerStatusBadge(owner.id, companyId);
  const cleanPhone = owner.phone?.replace(/\D/g, "") || "";

  const assignedEmp = employees.find(
    (e) => e.id === owner.assigned_employee_id,
  );
  const empName = assignedEmp
    ? assignedEmp.name || assignedEmp.id
    : t("Unassigned");

  const { data: propertyCountData } = useOwnerPropertyCount(owner.id);
  const propertyCount = propertyCountData ?? 0;

  return (
    <Card
      className={`group cursor-pointer hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col relative ${isSelected ? "border-primary ring-1 ring-primary/20" : "border-border/60 hover:border-primary/40"}`}
      onClick={() => onClick(owner)}
    >
      <div
        className="top-3 left-3 z-10 absolute"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(owner.id, checked)}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      <div
        className={`absolute top-3 right-3 z-10 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${badge.color}`}
      >
        {badge.icon === "check" ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        {badge.text}
      </div>

      <CardHeader className="relative pt-10 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex justify-center items-center bg-primary/10 rounded-full w-12 h-12 font-outfit font-bold text-primary text-lg shrink-0">
            {owner.name.charAt(0).toUpperCase()}
          </div>
          <div className="pr-2">
            <CardTitle className="group-hover:text-primary text-lg line-clamp-1 transition-colors">
              {owner.name}
            </CardTitle>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground text-xs">
              <User className="w-3 h-3" />
              <span className="line-clamp-1">{empName}</span>
            </div>
          </div>
        </div>
        <div className="top-10 right-4 absolute flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 shadow-sm backdrop-blur-sm w-8 h-8"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(owner);
            }}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 shadow-sm backdrop-blur-sm w-8 h-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(owner.id, e);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="gap-2 grid grid-cols-2 text-sm">
          <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md text-muted-foreground">
            <Phone className="w-4 h-4 text-primary/70 shrink-0" />
            <span className="line-clamp-1">{owner.phone}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
            <span className="line-clamp-1">{owner.country || t("N/A")}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md text-muted-foreground">
            <Building2 className="w-4 h-4 text-primary/70 shrink-0" />
            <span className="line-clamp-1">
              {t("Number of properties:")} {propertyCount}
            </span>
          </div>
          {owner.marketing_channel && (
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md text-muted-foreground">
              <Megaphone className="w-4 h-4 text-primary/70 shrink-0" />
              <span className="line-clamp-1">{owner.marketing_channel}</span>
            </div>
          )}
        </div>
      </CardContent>
      <div className="flex justify-between items-center bg-muted/30 group-hover:bg-primary/5 p-3 border-border/40 border-t text-muted-foreground text-xs text-center transition-colors">
        {cleanPhone && (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={`tel:${cleanPhone}`}
              className="bg-background hover:bg-primary/10 shadow-sm p-1.5 border rounded-md hover:text-primary transition-colors"
              title={t("Call")}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-background hover:bg-[#25D366]/10 shadow-sm p-1.5 border rounded-md hover:text-[#25D366] transition-colors"
              title={t("WhatsApp")}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
        <span>{t("Click to view details")}</span>
      </div>
    </Card>
  );
};

const OwnersPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Owner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TOwnerSchema>({
    resolver: zodResolver(OwnerSchema(t)),
    defaultValues: {
      name: "",
      phone: "",
      country: "UAE",
      assigned_employee_id: "",
      marketing_channel: "",
    },
  });

  const [activeOwner, setActiveOwner] = useState<Owner | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<OwnerFilterState>({
    statusId: null,
    marketingChannel: null,
    createdFromDate: null,
    createdToDate: null,
    updatedFromDate: null,
    updatedToDate: null,
    employeeId: null,
  });

  const ownerFilters = {
    assignedEmployeeId:
      currentUser?.role === "company_employee"
        ? currentUser.id
        : filterState.employeeId || undefined,
    statusId: filterState.statusId || undefined,
    marketingChannel: filterState.marketingChannel || undefined,
    createdFrom: filterState.createdFromDate
      ? (() => {
          const d = new Date(filterState.createdFromDate!);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })()
      : undefined,
    createdTo: filterState.createdToDate
      ? (() => {
          const d = new Date(filterState.createdToDate!);
          d.setHours(23, 59, 59, 999);
          return d.toISOString();
        })()
      : undefined,
    updatedFrom: filterState.updatedFromDate
      ? (() => {
          const d = new Date(filterState.updatedFromDate!);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })()
      : undefined,
    updatedTo: filterState.updatedToDate
      ? (() => {
          const d = new Date(filterState.updatedToDate!);
          d.setHours(23, 59, 59, 999);
          return d.toISOString();
        })()
      : undefined,
  };

  const { data: ownersData, refetch: refetchOwners } = useOwners(
    company?.id,
    ownerFilters,
  );
  const owners = ownersData ?? [];
  const { data: statusesData } = useOwnerStatuses(company?.id);
  const statuses = statusesData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannels = marketingChannelsData ?? [];

  const createOwnerMutation = useCreateOwner();
  const updateOwnerMutation = useUpdateOwner();
  const deleteOwnerMutation = useDeleteOwner();
  const bulkReassignMutation = useBulkReassignOwners();

  const fetchData = () => refetchOwners();

  const handleExportCSV = async () => {
    if (owners.length === 0) {
      toast.info(t("No data to export"));
      return;
    }

    const loadingToast = toast.loading(t("Exporting CSV..."));
    try {
      const result = await getOwnersExportData(company!.id);
      if (result.error) throw new Error(result.error);
      const rows = result.data;

      const headers = [
        "اسم المالك",
        "رقم الهاتف",
        "الموظف المسؤول",
        "قناة التسويق",
        "الحالة",
        "عدد العقارات",
        "تاريخ آخر تحديث للحالة",
        "مؤشر الحالة",
        "تاريخ الإنشاء",
      ];
      const columns = [
        (o: (typeof rows)[number]) => o.name || "",
        (o: (typeof rows)[number]) => o.phone || "",
        (o: (typeof rows)[number]) => o.assigned_employee_name || "غير مسند",
        (o: (typeof rows)[number]) => o.marketing_channel || "",
        (o: (typeof rows)[number]) => o.status_name || "لا يوجد",
        (o: (typeof rows)[number]) => o.properties_count || 0,
        (o: (typeof rows)[number]) =>
          o.last_status_date
            ? format(new Date(o.last_status_date), "dd/MM/yyyy")
            : "لا يوجد",
        (o: (typeof rows)[number]) => {
          if (!o.last_status_date) return "محدث";
          const daysDiff =
            (new Date().getTime() - new Date(o.last_status_date).getTime()) /
            (1000 * 60 * 60 * 24);
          return daysDiff > 30 ? "قديم" : "محدث";
        },
        (o: (typeof rows)[number]) =>
          o.created_at ? format(new Date(o.created_at), "dd/MM/yyyy") : "",
      ];

      const csvString = generateCSV(rows, columns, headers);
      downloadCSV(csvString, `owners_${format(new Date(), "yyyy-MM-dd")}.csv`);
      toast.success(t("Exported successfully"), { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error(t("Export error"), { id: loadingToast });
    }
  };

  const handleSave = async (formData: TOwnerSchema) => {
    setIsSubmitting(true);
    try {
      if (editItem) {
        const result = await updateOwnerMutation.mutateAsync({
          id: editItem.id,
          name: formData.name,
          phone: formData.phone,
          country: formData.country,
          marketing_channel: formData.marketing_channel,
          assigned_employee_id: formData.assigned_employee_id,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner updated successfully."));
      } else {
        const result = await createOwnerMutation.mutateAsync({
          companyId: company!.id,
          name: formData.name,
          phone: formData.phone,
          country: formData.country,
          marketing_channel: formData.marketing_channel,
          assigned_employee_id: formData.assigned_employee_id,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Owner added successfully."));
      }
      setOpen(false);
    } catch (err: any) {
      console.error("Owner Save Error details:", err);
      toast.error(err.message || t("Error saving owner."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t("Delete this owner?"))) return;
    try {
      const result = await deleteOwnerMutation.mutateAsync(id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Owner deleted."));
      setSelectedOwners((prev) => prev.filter((ownerId) => ownerId !== id));
    } catch (error) {
      toast.error(t("Could not delete. Owner might be linked to properties."));
    }
  };

  const handleBulkReassign = async (targetEmployeeId: string) => {
    setIsReassigning(true);
    try {
      const result = await bulkReassignMutation.mutateAsync({
        ownerIds: selectedOwners,
        targetEmployeeId,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Owners reassigned successfully."));
      setSelectedOwners([]);
      setIsReassignModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("Error reassigning owners."));
    } finally {
      setIsReassigning(false);
    }
  };

  const resetForm = () => {
    setEditItem(null);
    form.reset({
      name: "",
      phone: "",
      country: "UAE",
      assigned_employee_id:
        currentUser?.role === "company_employee" ? currentUser.id : "",
      marketing_channel: "",
    });
  };

  const openEditForm = (owner: Owner) => {
    setEditItem(owner);
    form.reset({
      name: owner.name,
      phone: owner.phone,
      country: owner.country || "UAE",
      assigned_employee_id: owner.assigned_employee_id || "",
      marketing_channel: owner.marketing_channel || "",
    });
    setOpen(true);
  };

  const openDetailModal = (owner: Owner) => {
    setActiveOwner(owner);
    setIsDetailModalOpen(true);
  };

  const handleRemoveFilter = (key: keyof OwnerFilterState) => {
    setFilterState((prev) => ({ ...prev, [key]: null }));
  };

  const toggleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedOwners(owners.map((o) => o.id));
    } else {
      setSelectedOwners([]);
    }
  };

  const toggleSelectOwner = (
    id: string,
    checked: boolean | "indeterminate",
  ) => {
    if (checked) {
      setSelectedOwners((prev) => [...prev, id]);
    } else {
      setSelectedOwners((prev) => prev.filter((ownerId) => ownerId !== id));
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("Owners")} | MANDERA CRM</title>
      </Helmet>
      <CompanyAdminHeader />

      <main className="bg-muted/20 py-8 min-h-[calc(100vh-80px)]">
        <div className="mx-auto px-4 container">
          <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="font-outfit font-bold text-3xl tracking-tight">
                {t("Property Owners")}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {t("Manage individuals who own your listed properties.")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {currentUser?.role === "company_super_admin" && (
                <Select
                  value={filterState.employeeId || "all"}
                  onValueChange={(val) =>
                    setFilterState((prev) => ({
                      ...prev,
                      employeeId: val === "all" ? null : val,
                    }))
                  }
                >
                  <SelectTrigger className="bg-background w-[200px]">
                    <SelectValue placeholder={t("All Employees")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Employees")}</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name || emp.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="gap-2 bg-background"
                title={t("Export to CSV")}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t("Export")}</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 ${showFilters ? "bg-muted" : "bg-background"}`}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? t("Hide Filters") : t("Filter Owners")}
              </Button>
              <Dialog
                open={open}
                onOpenChange={(val) => {
                  setOpen(val);
                  if (!val) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="gap-2 shadow-sm rounded-xl"
                    onClick={resetForm}
                  >
                    <Plus className="w-4 h-4" /> {t("Add New Owner")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editItem ? t("Edit Owner") : t("Add New Owner")}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleSave)}
                      className="space-y-4 py-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Full Name")} *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t("e.g. John Doe")}
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
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Country")}</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("Select Country")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COUNTRIES.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
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
                        name="marketing_channel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Marketing Channel")} *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("Select Channel")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {marketingChannels.map((mc) => (
                                  <SelectItem key={mc.id} value={mc.name}>
                                    {mc.name}
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
                        name="assigned_employee_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Assigned Employee")} *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={
                                currentUser?.role === "company_employee"
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("Select Employee")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {employees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.name || emp.id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? t("Saving...") : t("Save Owner")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 bg-card shadow-sm px-3 py-1.5 border rounded-lg text-muted-foreground text-sm">
              <span className="font-semibold text-foreground">
                {owners.length}
              </span>{" "}
              {t("owners found")}
              {filterState.employeeId && (
                <Badge variant="secondary" className="ms-2 font-normal">
                  {t("Filtered by Employee")}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {showFilters && (
              <div className="slide-in-from-top-4 animate-in duration-300 fade-in">
                <FilterPanel
                  statuses={statuses}
                  marketingChannels={marketingChannels}
                  onApplyFilters={(filters) =>
                    setFilterState((prev) => ({ ...prev, ...filters }))
                  }
                  onClearFilters={() =>
                    setFilterState((prev) => ({
                      ...prev,
                      statusId: null,
                      marketingChannel: null,
                      createdFromDate: null,
                      createdToDate: null,
                      updatedFromDate: null,
                      updatedToDate: null,
                    }))
                  }
                />
              </div>
            )}
            <FilterChips
              activeFilters={filterState}
              statuses={statuses}
              marketingChannels={marketingChannels}
              employees={employees}
              onRemoveFilter={handleRemoveFilter}
            />
          </div>

          {/* Bulk Actions Bar */}
          <div className="flex sm:flex-row flex-col justify-between items-center gap-4 bg-card shadow-sm mb-6 p-3 border rounded-xl">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={
                  owners.length > 0 && selectedOwners.length === owners.length
                }
                onCheckedChange={toggleSelectAll}
                id="select-all"
              />
              <Label
                htmlFor="select-all"
                className="font-medium cursor-pointer"
              >
                {t("Select All")}
              </Label>
              {selectedOwners.length > 0 && (
                <span className="bg-primary/10 px-3 py-1 rounded-full font-medium text-primary text-sm">
                  {t("Selected")} {selectedOwners.length} {t("Owner")}
                </span>
              )}
            </div>

            {selectedOwners.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOwners([])}
                  className="w-full sm:w-auto"
                >
                  {t("Clear Selection")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsReassignModalOpen(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Users className="w-4 h-4" />
                  {t("Reassign Selected")}
                </Button>
              </div>
            )}
          </div>

          <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {owners.length === 0 && (
              <div className="col-span-full bg-card py-24 border border-dashed rounded-2xl text-muted-foreground text-center">
                <User className="opacity-20 mx-auto mb-4 w-14 h-14 text-primary" />
                <p className="font-medium text-foreground text-lg">
                  {t("No owners found")}
                </p>
                <p className="mt-1 text-sm">
                  {t("Adjust your filters or add a new owner.")}
                </p>
              </div>
            )}

            {owners.map((owner) => (
              <OwnerCard
                key={owner.id}
                owner={owner}
                employees={employees}
                companyId={company?.id}
                isSelected={selectedOwners.includes(owner.id)}
                onToggleSelect={toggleSelectOwner}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onClick={openDetailModal}
              />
            ))}
          </div>

          <OwnerDetailModal
            owner={activeOwner}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              if (filterState.statusId) fetchData();
            }}
          />

          <EmployeeReassignmentModal
            isOpen={isReassignModalOpen}
            onClose={() => setIsReassignModalOpen(false)}
            selectedOwnerIds={selectedOwners}
            onConfirm={handleBulkReassign}
            isProcessing={isReassigning}
          />
        </div>
      </main>
    </>
  );
};

export default OwnersPage;
