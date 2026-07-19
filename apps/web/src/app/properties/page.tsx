"use client";

import React, { useState, useEffect } from "react";
import DocumentHead from "@/components/DocumentHead";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useProperties,
  usePropertyTypes,
  useOwnersLookup,
  useCompanyEmployeesLookup,
  useAreasDistrictsLookup,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
  useUpdatePropertyStatus,
} from "@/hooks/queries/useProperties";
import CompanyAdminHeader from "@/components/CompanyAdminHeader";
import PropertyCard from "@/components/PropertyCard";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import DealCompletedModal from "@/components/DealCompletedModal";
import FilterPanel from "@/components/FilterPanel";
import FilterChips from "@/components/FilterChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Home, Key, Trash2, Filter, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PropertySchema, type TPropertySchema } from "@/validations/property.schema";
import type {
  PropertyWithRelations as Property,
  AreaDistrict,
} from "@/types/supabase-entities.types";

interface PropertyFilterState {
  statusId: string | null;
  areas: string[];
  createdFromDate: Date | null;
  createdToDate: Date | null;
  updatedFromDate: Date | null;
  updatedToDate: Date | null;
}

const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];
const STATUS_OPTIONS = [
  "Available",
  "Sold",
  "Rented",
  "Hold",
  "Deal Completed",
];

const PropertiesPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("Rent");
  const [viewProperty, setViewProperty] = useState<Property | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilters, setPriceFilters] = useState({
    minPrice: "",
    maxPrice: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<PropertyFilterState>({
    statusId: null,
    areas: [],
    createdFromDate: null,
    createdToDate: null,
    updatedFromDate: null,
    updatedToDate: null,
  });
  const [statusFilter, setStatusFilter] = useState("All");

  const [openForm, setOpenForm] = useState(false);
  const [dealProperty, setDealProperty] = useState<Property | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [imagesFiles, setImagesFiles] = useState<FileList | File[]>([]);

  const form = useForm<TPropertySchema>({
    resolver: zodResolver(PropertySchema(t)),
    defaultValues: {
      listing_type: "Rent",
      type: "",
      land_area: "",
      building_area: "",
      emirate: "Dubai",
      area_district: "",
      area: "",
      owner_id: "",
      price: "",
      commission_percentage: "",
      employee_id:
        currentUser?.role === "company_employee" ? currentUser.id : "",
      title: "",
      description: "",
      status: "Available",
      advertising_permit_number: "",
    },
  });
  const formData = form.watch();

  const propertyStatuses = STATUS_OPTIONS.map((s) => ({ id: s, name: t(s) }));

  const propertyFilters = {
    employeeId:
      currentUser?.role === "company_employee" ? currentUser.id : undefined,
    status: statusFilter && statusFilter !== "All" ? statusFilter : undefined,
    areaDistrictIds: filterState.areas.length > 0 ? filterState.areas : undefined,
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

  const { data: propertiesData, refetch: refetchProperties } = useProperties(
    company?.id,
    propertyFilters,
  );
  const properties = propertiesData ?? [];

  const { data: typesData } = usePropertyTypes(company?.id);
  const types = typesData ?? [];
  const { data: ownersData } = useOwnersLookup(company?.id);
  const owners = ownersData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: allAreasData } = useAreasDistrictsLookup(company?.id);
  const allAreasDistricts = allAreasData ?? [];
  const { data: areasDistrictsData, isFetching: isLoadingAreas } =
    useAreasDistrictsLookup(
      openForm ? company?.id : undefined,
      formData.emirate || undefined,
    );
  const areasDistricts = areasDistrictsData ?? [];

  const createPropertyMutation = useCreateProperty();
  const updatePropertyMutation = useUpdateProperty();
  const deletePropertyMutation = useDeleteProperty();
  const updateStatusMutation = useUpdatePropertyStatus();

  const fetchData = () => refetchProperties();

  const handleEmirateChange = (newEmirate: string) => {
    form.setValue("emirate", newEmirate);
    form.setValue("area_district", "");
  };

  const handleRemoveFilter = (
    key: keyof PropertyFilterState,
    valueToRemove?: string,
  ) => {
    setFilterState((prev) => {
      const newState: any = { ...prev };
      if (key === "areas" && valueToRemove) {
        newState.areas = newState.areas.filter(
          (id: string) => id !== valueToRemove,
        );
      } else {
        newState[key] = null;
      }
      return newState;
    });
    if (key === "statusId") {
      setStatusFilter("All");
    }
  };

  const handleSave = form.handleSubmit(async (formData) => {
    setIsSubmitting(true);
    try {
      // Auto-assign to current user if employee adding new record
      const finalEmployeeId =
        !editId && currentUser?.role === "company_employee"
          ? currentUser.id
          : formData.employee_id;

      const basePayload = {
        listing_type: formData.listing_type,
        type: formData.type,
        land_area: formData.land_area ? Number(formData.land_area) : null,
        building_area: formData.building_area
          ? Number(formData.building_area)
          : null,
        emirate: formData.emirate,
        area_district: formData.area_district || null,
        area: formData.area || "",
        owner_id: formData.owner_id,
        price: Number(formData.price),
        commission_percentage: formData.commission_percentage
          ? Number(formData.commission_percentage)
          : null,
        employee_id: finalEmployeeId,
        title: formData.title,
        description: formData.description || "",
        status: formData.status || "Available",
        advertising_permit_number: formData.advertising_permit_number || "",
        images: Array.from(imagesFiles) as File[],
      };

      if (editId) {
        const result = await updatePropertyMutation.mutateAsync({
          id: editId,
          companyId: company!.id,
          ...basePayload,
        });
        if (result.error) throw new Error(result.error);

        toast.success(t("Property updated."));
      } else {
        const result = await createPropertyMutation.mutateAsync({
          companyId: company!.id,
          companyCode: company!.company_code,
          createdByUserId: currentUser!.id,
          createdByName:
            currentUser?.name || currentUser?.email || "Unknown User",
          ...basePayload,
        });
        if (result.error) throw new Error(result.error);

        toast.success(t("Property added successfully"));
      }
      setOpenForm(false);
      resetForm();
    } catch (err: any) {
      console.error("Property Save Error details:", err);
      toast.error(err.message || t("Error saving property."));
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleDelete = async () => {
    if (
      !editId ||
      !window.confirm(t("Delete this property? This cannot be undone."))
    )
      return;
    try {
      const result = await deletePropertyMutation.mutateAsync(editId);
      if (result.error) throw new Error(result.error);
      toast.success(t("Property deleted."));
      setOpenForm(false);
    } catch (e) {
      toast.error(t("Error deleting property."));
    }
  };

  const handleQuickStatusChange = async (
    propertyId: string,
    newStatus: string,
  ) => {
    if (newStatus === "Deal Completed") {
      const prop = properties.find((p) => p.id === propertyId);
      setDealProperty(prop || null);
      return;
    }

    try {
      const result = await updateStatusMutation.mutateAsync({
        propertyId,
        companyId: company!.id,
        newStatus,
        createdByUserId: currentUser!.id,
        createdByName:
          currentUser?.name || currentUser?.email || "Unknown User",
      });
      if (result.error) throw new Error(result.error);

      toast.success(t("Property status updated successfully"));
    } catch (err: any) {
      console.error("Status Quick Update Error:", err);
      toast.error(
        err.message || t("Failed to update status"),
      );
    }
  };

  const openEditForm = (p: Property | null = null) => {
    if (p) {
      setEditId(p.id);
      form.reset({
        listing_type: p.listing_type,
        type: p.type,
        land_area: p.land_area || "",
        building_area: p.building_area || "",
        emirate: p.emirate || "Dubai",
        area_district: p.area_district || "",
        area: p.area || "",
        owner_id: p.owner_id,
        price: p.price,
        commission_percentage: p.commission_percentage || "",
        employee_id: p.employee_id,
        title: p.title,
        description: p.description || "",
        status: p.status || "Available",
        advertising_permit_number: p.advertising_permit_number || "",
      });
      setImagesFiles([]);
    } else {
      resetForm();
      form.setValue("listing_type", activeTab);
    }
    setOpenForm(true);
  };

  const resetForm = () => {
    setEditId(null);
    form.reset({
      listing_type: "Rent",
      type: "",
      land_area: "",
      building_area: "",
      emirate: "Dubai",
      area_district: "",
      area: "",
      owner_id: "",
      price: "",
      commission_percentage: "",
      employee_id:
        currentUser?.role === "company_employee" ? currentUser.id : "",
      title: "",
      description: "",
      status: "Available",
      advertising_permit_number: "",
    });
    setImagesFiles([]);
  };

  const renderGrid = (listType: string) => {
    const filtered = properties.filter((p) => {
      // 1. Listing Type Match
      if (p.listing_type !== listType) return false;

      // 2. Real-time Search by Code
      if (
        searchQuery &&
        !p.code?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // 3. Real-time Price Filtering
      const propPrice = Number(p.price) || 0;
      const minP = Number(priceFilters.minPrice);
      const maxP = Number(priceFilters.maxPrice);

      let effectiveMin = minP;
      let effectiveMax = maxP;
      if (minP && maxP && minP > maxP) {
        effectiveMin = maxP;
        effectiveMax = minP;
      }

      if (effectiveMin > 0 && propPrice < effectiveMin) return false;
      if (effectiveMax > 0 && propPrice > effectiveMax) return false;

      return true;
    });

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center bg-card py-20 border border-dashed rounded-2xl text-muted-foreground text-center">
          {listType === "Rent" ? (
            <Key className="opacity-20 mb-4 w-12 h-12 text-primary" />
          ) : (
            <Home className="opacity-20 mb-4 w-12 h-12 text-primary" />
          )}
          <p className="font-medium text-foreground text-lg">
            {t(`No ${listType} Properties found`)}
          </p>
          <p className="mt-1 text-sm">
            {t(
              'Adjust your filters or click "Add Property" to create a new listing.',
            )}
          </p>
        </div>
      );
    }
    return (
      <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => (
          <PropertyCard
            key={p.id}
            property={p}
            onEdit={openEditForm}
            onView={setViewProperty}
            onStatusChange={handleQuickStatusChange}
          />
        ))}
      </div>
    );
  };

  const isEmployee = currentUser?.role === "company_employee";

  return (
    <>
      <DocumentHead title={`${t("Properties")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-muted/20 py-8 min-h-[calc(100vh-80px)]">
        <div className="mx-auto px-4 container">
          <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="font-outfit font-bold text-3xl tracking-tight">
                {t("Properties")}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {t("Manage your complete real estate portfolio.")}
              </p>
            </div>
            <div className="flex sm:flex-row flex-col items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
                <Input
                  placeholder={t("Search code (e.g. COMPO01)...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background pl-9 w-full h-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 h-9 w-full sm:w-auto ${showFilters ? "bg-muted" : "bg-background"}`}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? t("Hide Filters") : t("Filters")}
              </Button>
              <Button
                onClick={() => openEditForm()}
                className="gap-2 shadow-sm rounded-xl w-full sm:w-auto h-9 shrink-0"
              >
                <Plus className="w-4 h-4" /> {t("Add Property")}
              </Button>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {showFilters && (
              <div className="slide-in-from-top-4 animate-in duration-300 fade-in">
                <FilterPanel
                  statuses={propertyStatuses}
                  areas={allAreasDistricts}
                  showPriceFilters={true}
                  onPriceChange={setPriceFilters}
                  onApplyFilters={(filters) => {
                    setFilterState(filters as unknown as PropertyFilterState);
                    setStatusFilter((filters.statusId as string) || "All");
                  }}
                  onClearFilters={() => {
                    setFilterState({
                      statusId: null,
                      areas: [],
                      createdFromDate: null,
                      createdToDate: null,
                      updatedFromDate: null,
                      updatedToDate: null,
                    });
                    setStatusFilter("All");
                    setPriceFilters({ minPrice: "", maxPrice: "" });
                  }}
                />
              </div>
            )}

            <FilterChips
              activeFilters={filterState}
              statuses={propertyStatuses}
              areas={allAreasDistricts}
              onRemoveFilter={handleRemoveFilter}
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="bg-muted p-1 rounded-xl">
              <TabsTrigger value="Rent" className="px-8 rounded-lg">
                <Key className="mr-2 w-4 h-4" /> {t("For Rent")}
              </TabsTrigger>
              <TabsTrigger value="Sale" className="px-8 rounded-lg">
                <Home className="mr-2 w-4 h-4" /> {t("For Sale")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="Rent" className="mt-0 outline-none">
              {renderGrid("Rent")}
            </TabsContent>

            <TabsContent value="Sale" className="mt-0 outline-none">
              {renderGrid("Sale")}
            </TabsContent>
          </Tabs>

          <Dialog
            open={openForm}
            onOpenChange={(val) => {
              setOpenForm(val);
              if (!val) resetForm();
            }}
          >
            <DialogContent className="bg-background p-0 sm:max-w-[800px] overflow-hidden">
              <DialogHeader className="flex flex-row justify-between items-center bg-muted/30 p-6 border-b">
                <DialogTitle className="font-outfit text-xl">
                  {editId
                    ? `${t("Edit Property")} (${properties.find((p) => p.id === editId)?.code})`
                    : t("Add Property")}
                </DialogTitle>
                {editId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 w-8 h-8 text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </DialogHeader>

              <Form {...form}>
              <Tabs defaultValue="basic" className="flex flex-col h-[75vh]">
                <div className="px-6 pt-4 border-b">
                  <TabsList className="grid grid-cols-2 w-full max-w-sm">
                    <TabsTrigger value="basic">{t("Basic Info")}</TabsTrigger>
                    <TabsTrigger value="details">
                      {t("Details & Media")}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  <TabsContent value="basic" className="space-y-4 mt-0">
                    <div className="gap-5 grid grid-cols-1 md:grid-cols-2">
                      <div className="space-y-2 col-span-1 md:col-span-2 bg-muted/40 p-4 border border-border/50 rounded-xl">
                        <Label className="block mb-2">
                          {t("Listing Type")} *
                        </Label>
                        <RadioGroup
                          value={formData.listing_type}
                          onValueChange={(v) =>
                            form.setValue("listing_type", v)
                          }
                          className="flex space-x-6"
                          disabled={!!editId}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Sale" id="r-sale" />
                            <Label
                              htmlFor="r-sale"
                              className="font-normal cursor-pointer"
                            >
                              {t("For Sale")}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Rent" id="r-rent" />
                            <Label
                              htmlFor="r-rent"
                              className="font-normal cursor-pointer"
                            >
                              {t("For Rent")}
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("Property Type")} *</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(v) => form.setValue("type", v)}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder={t("Select Type")} />
                          </SelectTrigger>
                          <SelectContent>
                            {types.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("Status")}</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(v) => form.setValue("status", v)}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder={t("Select Status")} />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {t(s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label>
                          {t("Advertising Permit Number")}{" "}
                          <span className="font-normal text-muted-foreground">
                            ({t("Optional")})
                          </span>
                        </Label>
                        <Input
                          value={formData.advertising_permit_number}
                          onChange={(e) =>
                            form.setValue(
                              "advertising_permit_number",
                              e.target.value,
                            )
                          }
                          placeholder={t("e.g. 1234567890")}
                        />
                      </div>

                      <div className="gap-5 space-y-2 grid grid-cols-1 md:grid-cols-2 col-span-1 md:col-span-2 bg-card p-4 border border-border/50 rounded-xl">
                        <div className="space-y-2">
                          <Label>{t("Emirate")} *</Label>
                          <Select
                            value={formData.emirate}
                            onValueChange={handleEmirateChange}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder={t("Select Emirate")} />
                            </SelectTrigger>
                            <SelectContent>
                              {EMIRATES.map((e) => (
                                <SelectItem key={e} value={e}>
                                  {e}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            {t("Area / District")}
                            {isLoadingAreas && (
                              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                            )}
                          </Label>
                          <Select
                            value={formData.area_district}
                            onValueChange={(v) =>
                              form.setValue("area_district", v)
                            }
                          >
                            <SelectTrigger
                              className="bg-background"
                              disabled={isLoadingAreas || !formData.emirate}
                            >
                              <SelectValue
                                placeholder={
                                  areasDistricts.length === 0 && !isLoadingAreas
                                    ? t("No areas available")
                                    : t("Select Area")
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {areasDistricts.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  {t("No configured areas")}
                                </SelectItem>
                              ) : (
                                areasDistricts.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 col-span-1 md:col-span-2">
                          <Label>
                            {t("Specific Address/Sub-area")}{" "}
                            <span className="font-normal text-muted-foreground">
                              ({t("Optional")})
                            </span>
                          </Label>
                          <Input
                            value={formData.area}
                            onChange={(e) =>
                              form.setValue("area", e.target.value)
                            }
                            placeholder={t("e.g. Building 4, Street 12")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("Land Area")} (sqft)</Label>
                        <Input
                          type="number"
                          value={formData.land_area}
                          onChange={(e) =>
                            form.setValue("land_area", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t("Building Area (sqft)")}</Label>
                        <Input
                          type="number"
                          value={formData.building_area}
                          onChange={(e) =>
                            form.setValue("building_area", e.target.value)
                          }
                        />
                      </div>

                      <div className="gap-5 space-y-2 grid grid-cols-1 md:grid-cols-2 col-span-1 md:col-span-2 pt-2 border-t">
                        <div className="space-y-2">
                          <Label>{t("Owner")} *</Label>
                          <Select
                            value={formData.owner_id}
                            onValueChange={(v) => form.setValue("owner_id", v)}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder={t("Select Owner")} />
                            </SelectTrigger>
                            <SelectContent>
                              {owners.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.name} ({o.phone})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("Assigned Agent")} *</Label>
                          <Select
                            value={formData.employee_id}
                            onValueChange={(v) =>
                              form.setValue("employee_id", v)
                            }
                            disabled={isEmployee}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder={t("Select Agent")} />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.name || e.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("Price (AED)")} *</Label>
                          <Input
                            type="number"
                            required
                            value={formData.price}
                            onChange={(e) =>
                              form.setValue("price", e.target.value)
                            }
                            className="font-semibold text-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("Commission %")}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.commission_percentage}
                            onChange={(e) =>
                              form.setValue(
                                "commission_percentage",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-5 mt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t("Listing Title")} *</Label>
                        <span className="text-muted-foreground text-xs">
                          {formData.title?.length || 0}/150
                        </span>
                      </div>
                      <Input
                        maxLength={150}
                        required
                        value={formData.title}
                        onChange={(e) =>
                          form.setValue("title", e.target.value)
                        }
                        className="font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t("Description")}</Label>
                        <span className="text-muted-foreground text-xs">
                          {formData.description?.length || 0}/1000
                        </span>
                      </div>
                      <Textarea
                        maxLength={1000}
                        className="min-h-[160px] resize-none"
                        value={formData.description}
                        onChange={(e) =>
                          form.setValue("description", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2 bg-muted/40 p-4 border border-border/50 rounded-xl">
                      <Label>{t("Property Images (Max 12)")}</Label>
                      <div className="mt-2">
                        <Input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 12) {
                              toast.warning(t("Maximum 12 images allowed."));
                              e.target.value = "";
                              setImagesFiles([]);
                            } else if (files) {
                              setImagesFiles(files);
                            }
                          }}
                          className="bg-background hover:file:bg-primary/20 file:bg-primary/10 file:mr-4 file:px-4 file:py-1 file:border-0 file:rounded-md file:text-primary transition-colors"
                        />
                      </div>
                      <p className="mt-2 text-muted-foreground text-xs">
                        {imagesFiles.length > 0
                          ? `${imagesFiles.length} ${t("file(s) selected for upload.")}`
                          : t(
                              "Select up to 12 images. High quality (870x600px recommended).",
                            )}
                      </p>
                    </div>
                  </TabsContent>
                </div>

                <div className="flex justify-end bg-card p-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    size="lg"
                    className="px-8 rounded-xl w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />{" "}
                        {t("Saving...")}
                      </>
                    ) : (
                      t("Save Property")
                    )}
                  </Button>
                </div>
              </Tabs>
              </Form>
            </DialogContent>
          </Dialog>

          <PropertyDetailModal
            property={viewProperty}
            isOpen={!!viewProperty}
            onClose={() => setViewProperty(null)}
            onStatusUpdated={fetchData}
          />

          <DealCompletedModal
            isOpen={!!dealProperty}
            onClose={() => setDealProperty(null)}
            property={dealProperty}
            onSuccess={() => {
              setDealProperty(null);
              fetchData();
            }}
          />
        </div>
      </main>
    </>
  );
};

export default PropertiesPage;
