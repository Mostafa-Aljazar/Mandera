"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useProperties,
  useAreasDistrictsLookup,
  useUpdatePropertyStatus,
} from "@/hooks/queries/useProperties";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import PropertyCard from "@/components/company/properties/PropertyCard";
import DealCompletedModal from "@/components/common/DealCompletedModal";
import FilterPanel from "@/components/common/FilterPanel";
import FilterChips from "@/components/common/FilterChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Home, Key, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PropertyWithRelations as Property } from "@/types/supabase-entities.types";

interface PropertyFilterState {
  statusId: string | null;
  areas: string[];
  createdFromDate: Date | null;
  createdToDate: Date | null;
  updatedFromDate: Date | null;
  updatedToDate: Date | null;
}

const STATUS_OPTIONS = ["Available", "Sold", "Rented", "Hold", "Deal Completed"];

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
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("Rent");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilters, setPriceFilters] = useState({ minPrice: "", maxPrice: "" });
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
  const [dealProperty, setDealProperty] = useState<Property | null>(null);

  const propertyStatuses = STATUS_OPTIONS.map((s) => ({ id: s, name: t(s) }));

  const toIso = (date: Date | null, endOfDay: boolean) => {
    if (!date) return undefined;
    const d = new Date(date);
    if (endOfDay) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  const propertyFilters = {
    employeeId: currentUser?.role === "company_employee" ? currentUser.id : undefined,
    status: statusFilter && statusFilter !== "All" ? statusFilter : undefined,
    areaDistrictIds: filterState.areas.length > 0 ? filterState.areas : undefined,
    createdFrom: toIso(filterState.createdFromDate, false),
    createdTo: toIso(filterState.createdToDate, true),
    updatedFrom: toIso(filterState.updatedFromDate, false),
    updatedTo: toIso(filterState.updatedToDate, true),
  };

  const { data: propertiesData, isLoading } = useProperties(company?.id, propertyFilters);
  const properties = propertiesData ?? [];

  const { data: allAreasData } = useAreasDistrictsLookup(company?.id);
  const allAreasDistricts = allAreasData ?? [];

  const updateStatusMutation = useUpdatePropertyStatus();

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

  const filterProperties = (listType: string) =>
    properties.filter((p) => {
      if (p.listing_type !== listType) return false;
      if (searchQuery && !p.code?.toLowerCase().includes(searchQuery.toLowerCase())) {
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

  const handleQuickStatusChange = async (propertyId: string, newStatus: string) => {
    if (newStatus === "Deal Completed") {
      setDealProperty(properties.find((p) => p.id === propertyId) || null);
      return;
    }
    try {
      const result = await updateStatusMutation.mutateAsync({
        propertyId,
        companyId: company!.id,
        newStatus,
        createdByUserId: currentUser!.id,
        createdByName: currentUser?.name || currentUser?.email || "Unknown User",
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Property status updated successfully"));
    } catch (err) {
      toast.error((err as Error).message || t("Failed to update status"));
    }
  };

  const goToProperty = (p: Property) => router.push(`/company/properties/${p.id}`);
  const goToAdd = () => router.push("/company/properties/add");

  const handleRemoveFilter = (
    key: keyof PropertyFilterState,
    valueToRemove?: string,
  ) => {
    setFilterState((prev) => {
      const newState: PropertyFilterState = { ...prev };
      if (key === "areas" && valueToRemove) {
        newState.areas = newState.areas.filter((id) => id !== valueToRemove);
      } else {
        (newState as unknown as Record<string, unknown>)[key] = null;
      }
      return newState;
    });
    if (key === "statusId") setStatusFilter("All");
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
              {t('Adjust your filters or click "Add Property" to create a new listing.')}
            </p>
            <Button onClick={goToAdd} className="mt-6 rounded-lg h-9">
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
            onEdit={goToProperty}
            onView={goToProperty}
            onStatusChange={handleQuickStatusChange}
          />
        ))}
      </div>
    );
  };

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
                onClick={goToAdd}
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
            <StatCard label={t("For Rent")} value={stats.rent} tone="sky" />
            <StatCard label={t("For Sale")} value={stats.sale} tone="emerald" />
            <StatCard label={t("Available")} value={stats.available} tone="amber" />
          </section>

          <section className="relative bg-card shadow-[var(--shadow-subtle)] p-4 sm:p-5 border border-border/60 rounded-2xl overflow-hidden">
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
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("rounded-lg h-10", showFilters && "bg-muted/70 border-primary/20")}
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5 sm:space-y-6">
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

          <DealCompletedModal
            isOpen={!!dealProperty}
            onClose={() => setDealProperty(null)}
            property={dealProperty}
            onSuccess={() => setDealProperty(null)}
          />
        </div>
      </main>
    </>
  );
};

export default PropertiesPage;
