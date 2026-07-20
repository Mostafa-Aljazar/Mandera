"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import DocumentHead from "@/components/common/DocumentHead";
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
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import PropertyCard from "@/components/company/properties/PropertyCard";
import PropertyDetailModal from "@/components/company/properties/PropertyDetailModal";
import DealCompletedModal from "@/components/common/DealCompletedModal";
import FilterPanel from "@/components/common/FilterPanel";
import FilterChips from "@/components/common/FilterChips";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Home,
  Key,
  Trash2,
  Filter,
  Loader2,
  Search,
  ChevronDown,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

function StatCard({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "sky" | "emerald" | "amber";
}) {
  const toneStyles = {
    primary: { value: "text-foreground", glow: "from-primary/10" },
    sky: { value: "text-sky-700", glow: "from-sky-500/10" },
    emerald: { value: "text-emerald-700", glow: "from-emerald-500/10" },
    amber: { value: "text-amber-700", glow: "from-amber-500/10" },
  } as const;
  const styles = toneStyles[tone];

  return (
    <div className="relative bg-card/90 shadow-[var(--shadow-subtle)] p-3.5 sm:p-5 border border-border/60 rounded-2xl overflow-hidden">
      <div
        className={cn(
          "top-0 absolute inset-x-0 bg-gradient-to-b to-transparent h-14 pointer-events-none",
          styles.glow,
        )}
        aria-hidden
      />
      <div className="relative min-w-0">
        <p className="font-medium text-muted-foreground text-[11px] sm:text-xs truncate">
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 font-outfit font-bold text-xl sm:text-3xl tracking-tight tabular-nums",
            styles.value,
          )}
          dir="ltr"
        >
          {value}
        </p>
      </div>
    </div>
  );
}

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
  const MAX_IMAGES = 12;

  const [imagesFiles, setImagesFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = imagesFiles.map((f) => URL.createObjectURL(f));
    setNewImageUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imagesFiles]);

  useEffect(() => {
    const combined = [...existingImageUrls, ...newImageUrls];
    setActiveImageUrl((prev) => {
      if (prev && combined.includes(prev)) return prev;
      return combined[0] ?? null;
    });
  }, [existingImageUrls, newImageUrls]);

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

  const { data: propertiesData, isLoading, refetch: refetchProperties } =
    useProperties(company?.id, propertyFilters);
  const properties = propertiesData ?? [];

  const stats = useMemo(() => {
    const rent = properties.filter((p) => p.listing_type === "Rent");
    const sale = properties.filter((p) => p.listing_type === "Sale");
    return {
      total: properties.length,
      rent: rent.length,
      sale: sale.length,
      available: properties.filter((p) => p.status === "Available").length,
    };
  }, [properties]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "All") count += 1;
    if (filterState.areas.length > 0) count += filterState.areas.length;
    if (filterState.createdFromDate) count += 1;
    if (filterState.createdToDate) count += 1;
    if (filterState.updatedFromDate) count += 1;
    if (filterState.updatedToDate) count += 1;
    if (priceFilters.minPrice) count += 1;
    if (priceFilters.maxPrice) count += 1;
    return count;
  }, [statusFilter, filterState, priceFilters]);

  const filterProperties = (listType: string) => {
    return properties.filter((p) => {
      if (p.listing_type !== listType) return false;

      if (
        searchQuery &&
        !p.code?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

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
  };

  const rentListings = useMemo(() => filterProperties("Rent"), [
    properties,
    searchQuery,
    priceFilters,
  ]);
  const saleListings = useMemo(() => filterProperties("Sale"), [
    properties,
    searchQuery,
    priceFilters,
  ]);

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
        images: imagesFiles,
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
      setExistingImageUrls((p.images ?? []) as string[]);
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
    setExistingImageUrls([]);
    setActiveImageUrl(null);
  };

  const handleRemoveNewImage = (index: number) => {
    setImagesFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const renderGrid = (listType: string, listings: Property[]) => {
    if (isLoading) {
      return (
        <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden"
            >
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="w-2/3 h-5" />
                <Skeleton className="w-1/2 h-7" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-9" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (listings.length === 0) {
      return (
        <div className="relative bg-card shadow-[var(--shadow-subtle)] px-6 py-16 sm:py-20 border border-border border-dashed rounded-2xl text-center overflow-hidden">
          <div
            className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.05] to-transparent h-24 pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            {listType === "Rent" ? (
              <Key className="opacity-30 mx-auto mb-4 w-12 h-12 text-primary" />
            ) : (
              <Home className="opacity-30 mx-auto mb-4 w-12 h-12 text-primary" />
            )}
            <p className="font-outfit font-semibold text-foreground text-lg">
              {t(`No ${listType} Properties found`)}
            </p>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
              {t(
                'Adjust your filters or click "Add Property" to create a new listing.',
              )}
            </p>
            <Button
              onClick={() => openEditForm()}
              className="mt-6 rounded-lg h-9"
            >
              <Plus className="w-4 h-4" />
              {t("Add Property")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((p) => (
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
  const currentListings = activeTab === "Rent" ? rentListings : saleListings;

  return (
    <>
      <DocumentHead title={`${t("Properties")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-0 pattern-grid-lg bg-primary/[0.03] opacity-40"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 py-8 sm:py-10 container max-w-6xl">
            <div className="flex md:flex-row flex-col md:justify-between md:items-end gap-5">
              <div className="min-w-0">
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl md:text-4xl tracking-tight">
                  {t("Properties")}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("Manage your complete real estate portfolio.")}
                </p>
              </div>

              <Button
                onClick={() => openEditForm()}
                size="sm"
                className="self-start md:self-auto rounded-lg h-9 font-medium shrink-0"
              >
                <Plus className="w-4 h-4" />
                {t("Add Property")}
              </Button>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 container max-w-6xl">
          <section className="gap-3 sm:gap-4 grid grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("Total Properties")} value={stats.total} />
            <StatCard
              label={t("For Rent")}
              value={stats.rent}
              tone="sky"
            />
            <StatCard
              label={t("For Sale")}
              value={stats.sale}
              tone="emerald"
            />
            <StatCard
              label={t("Available")}
              value={stats.available}
              tone="amber"
            />
          </section>

          <section className="relative bg-card shadow-[var(--shadow-subtle)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden">
            <div
              className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.04] to-transparent h-16 pointer-events-none"
              aria-hidden
            />

            <div className="relative flex lg:flex-row flex-col lg:justify-between lg:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="top-1/2 start-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder={t("Search code (e.g. COMPO01)...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background ps-9 h-10"
                />
              </div>

              <div className="flex sm:flex-row flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "rounded-lg h-10",
                    showFilters && "bg-muted/70 border-primary/20",
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {showFilters ? t("Hide Filters") : t("Filters")}
                  {activeFilterCount > 0 ? (
                    <span className="inline-flex justify-center items-center bg-primary/10 ms-1.5 px-1.5 rounded-full min-w-[1.25rem] h-5 font-semibold text-primary text-[11px] tabular-nums">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>

            {(showFilters || activeFilterCount > 0) && (
              <div className="relative space-y-3 mt-4 pt-4 border-border/60 border-t">
                {showFilters ? (
                  <div className="slide-in-from-top-4 animate-in duration-300 fade-in">
                    <FilterPanel
                      statuses={propertyStatuses}
                      areas={allAreasDistricts}
                      showPriceFilters={true}
                      onPriceChange={setPriceFilters}
                      onApplyFilters={(filters) => {
                        setFilterState(
                          filters as unknown as PropertyFilterState,
                        );
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
                ) : null}

                <FilterChips
                  activeFilters={filterState}
                  statuses={propertyStatuses}
                  areas={allAreasDistricts}
                  onRemoveFilter={handleRemoveFilter}
                />
              </div>
            )}
          </section>

          <section>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-5 sm:space-y-6"
            >
              <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
                <TabsList className="bg-muted/60 p-1 border border-border/60 rounded-xl h-auto">
                  <TabsTrigger
                    value="Rent"
                    className="gap-2 data-[state=active]:bg-background px-4 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                  >
                    <Key className="w-4 h-4" />
                    {t("For Rent")}
                    <span className="bg-muted/80 data-[state=active]:bg-primary/10 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums">
                      {rentListings.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="Sale"
                    className="gap-2 data-[state=active]:bg-background px-4 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                  >
                    <Home className="w-4 h-4" />
                    {t("For Sale")}
                    <span className="bg-muted/80 data-[state=active]:bg-primary/10 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums">
                      {saleListings.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <p className="text-muted-foreground text-sm">
                  {t("properties_showing_count", { count: currentListings.length })}
                </p>
              </div>

              <TabsContent value="Rent" className="mt-0 outline-none">
                {renderGrid("Rent", rentListings)}
              </TabsContent>

              <TabsContent value="Sale" className="mt-0 outline-none">
                {renderGrid("Sale", saleListings)}
              </TabsContent>
            </Tabs>
          </section>

          <Dialog
            open={openForm}
            onOpenChange={(val) => {
              setOpenForm(val);
              if (!val) resetForm();
            }}
          >
            <DialogContent className="bg-background p-0 sm:max-w-[800px] overflow-hidden">
              <DialogHeader className="flex flex-row justify-between items-center bg-gradient-to-r from-primary/[0.10] via-muted/30 to-transparent p-6 border-b">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="flex justify-center items-center rounded-xl w-10 h-10 shrink-0 border border-primary/20 bg-primary/10 text-primary"
                    aria-hidden
                  >
                    {editId ? <Plus className="w-4 h-4 rotate-45" /> : <Plus className="w-4 h-4" />}
                  </span>
                  <DialogTitle className="font-outfit text-xl">
                    {editId
                      ? `${t("Edit Property")} (${properties.find((p) => p.id === editId)?.code})`
                      : t("Add Property")}
                  </DialogTitle>
                </div>
                {editId ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 w-8 h-8 text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : null}
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
                        className="min-h-[160px] resize-y"
                        value={formData.description}
                        onChange={(e) =>
                          form.setValue("description", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2 bg-muted/40 p-4 border border-border/50 rounded-xl">
                      <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <Label>{t("Property Images (Max 12)")}</Label>
                            <p className="text-muted-foreground text-xs">
                              {t(
                                "Select up to 12 images. High quality (870x600px recommended).",
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {existingImageUrls.length +
                            imagesFiles.length >
                            0 ? (
                              <span
                                className="inline-flex items-center bg-background/70 border border-border/60 text-muted-foreground text-[11px] px-2 py-1 rounded-full tabular-nums"
                                dir="ltr"
                              >
                                {existingImageUrls.length +
                                  imagesFiles.length}{" "}
                                / {MAX_IMAGES}
                              </span>
                            ) : null}
                          </div>
                      </div>

                      <div className="mt-2">
                        <div
                          onClick={() => imageFileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            const selected = Array.from(e.dataTransfer.files).filter((f) =>
                              ["image/jpeg", "image/png", "image/webp"].includes(f.type),
                            );
                            const remaining = MAX_IMAGES - existingImageUrls.length - imagesFiles.length;
                            if (selected.length > remaining) {
                              toast.warning(t("Maximum 12 images allowed."));
                              return;
                            }
                            setImagesFiles((prev) => [...prev, ...selected]);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors px-4 py-8 text-center select-none",
                            isDragOver
                              ? "border-primary bg-primary/10"
                              : "border-border/60 bg-background hover:border-primary/50 hover:bg-muted/60",
                          )}
                        >
                          <UploadCloud className="w-8 h-8 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">
                            {t("Drag & drop images here, or click to select")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {imagesFiles.length > 0
                              ? `${imagesFiles.length} ${t("file(s) selected for upload.")}`
                              : t("Select up to 12 images. High quality (870x600px recommended).")}
                          </p>
                        </div>
                        <input
                          ref={imageFileInputRef}
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files) return;
                            const selected = Array.from(files);
                            const remaining = MAX_IMAGES - existingImageUrls.length - imagesFiles.length;
                            if (selected.length > remaining) {
                              toast.warning(t("Maximum 12 images allowed."));
                              e.target.value = "";
                              return;
                            }
                            setImagesFiles((prev) => [...prev, ...selected]);
                            e.target.value = "";
                          }}
                        />
                      </div>

                      {(existingImageUrls.length > 0 ||
                        imagesFiles.length > 0) && (
                        <details className="mt-4 group" open>
                          <summary className="list-none cursor-pointer">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-foreground text-sm">
                                {t("Preview")}
                              </span>
                              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-[open]:rotate-180 rtl:rotate-180" />
                            </div>
                          </summary>
                          <div className="mt-3 space-y-3">
                          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background">
                            {activeImageUrl ? (
                              <img
                                src={activeImageUrl}
                                alt="Property preview"
                                className="w-full h-56 object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            {[...existingImageUrls, ...newImageUrls].map(
                              (url, idx) => {
                                const isExisting = idx < existingImageUrls.length;
                                const isNew = !isExisting;
                                const isActive = activeImageUrl === url;

                                return (
                                  <div
                                    key={`${url}-${idx}`}
                                    onClick={() => setActiveImageUrl(url)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        setActiveImageUrl(url);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    className={cn(
                                      "relative overflow-hidden rounded-lg border transition-colors",
                                      isActive
                                        ? "border-primary/60"
                                        : "border-border/60 hover:border-primary/30",
                                    )}
                                    aria-label="Preview image"
                                  >
                                    <img
                                      src={url}
                                      alt="Thumbnail"
                                      className="w-full h-20 object-cover"
                                    />

                                    {isNew && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleRemoveNewImage(
                                            idx - existingImageUrls.length,
                                          );
                                        }}
                                        className="absolute top-1 end-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                                        aria-label={t("Delete")}
                                        title={t("Delete")}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                          </div>
                        </details>
                      )}
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
