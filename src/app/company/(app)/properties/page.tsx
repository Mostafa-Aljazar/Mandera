"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { canViewAllClients, isSalesAgent } from "@/lib/permissions";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import {
  usePropertiesPage,
  useAreasDistrictsLookup,
  useCompanyEmployeesLookup,
  usePropertyTypes,
  useOwnersLookup,
} from "@/hooks/queries/useProperties";
import { useDebounce } from "@/hooks/useDebounce";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import PropertyCard from "@/components/company/properties/PropertyCard";
import PendingApprovalsBanner from "@/components/company/approvals/PendingApprovalsBanner";
import DuplicatesReviewPanel from "@/components/company/duplicates/DuplicatesReviewPanel";
import FilterPanel from "@/components/common/FilterPanel";
import FilterChips from "@/components/common/FilterChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Home,
  Key,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyWithRelations as Property } from "@/types/supabase-entities.types";

const PAGE_SIZE = 9;
const STATUS_OPTIONS = [
  "Available",
  "Viewing Scheduled",
  "Under Offer",
  "Reserved",
  "Follow-up Required",
  "Sold",
  "Rented",
  "Unavailable",
  "Archived",
  "Cancelled",
  "Hold",
  "Deal Completed",
];

interface PropertyFilterState {
  statusId: string | null;
  areas: string[];
  createdFromDate: Date | null;
  createdToDate: Date | null;
  updatedFromDate: Date | null;
  updatedToDate: Date | null;
  employeeId: string | null;
  propertyTypeId: string | null;
  classification: string | null;
  ownerId: string | null;
  createdBy: string | null;
}

function getPageNumbers(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone?: "primary" | "sky" | "emerald" | "amber";
  onClick?: () => void;
}) {
  const toneStyles = {
    primary: {
      value: "text-foreground",
      icon: "bg-primary/10 text-primary",
      glow: "from-primary/10",
    },
    sky: {
      value: "text-sky-700",
      icon: "bg-sky-500/10 text-sky-600",
      glow: "from-sky-500/10",
    },
    emerald: {
      value: "text-emerald-700",
      icon: "bg-emerald-500/10 text-emerald-600",
      glow: "from-emerald-500/10",
    },
    amber: {
      value: "text-amber-700",
      icon: "bg-amber-500/10 text-amber-600",
      glow: "from-amber-500/10",
    },
  } as const;
  const styles = toneStyles[tone];

  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative bg-card shadow-[var(--shadow-subtle)] p-3.5 sm:p-4 border border-border/60 rounded-2xl overflow-hidden text-start w-full",
        onClick &&
          "cursor-pointer transition-colors hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
    >
      <div
        className={cn(
          "top-0 absolute inset-x-0 bg-gradient-to-b to-transparent h-12 pointer-events-none",
          styles.glow,
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-muted-foreground text-[11px] sm:text-xs truncate">
            {label}
          </p>
          <p
            className={cn(
              "mt-1.5 font-outfit font-bold text-2xl sm:text-3xl tracking-tight tabular-nums",
              styles.value,
            )}
            dir="ltr"
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex justify-center items-center rounded-xl w-9 h-9 sm:w-10 sm:h-10 shrink-0",
            styles.icon,
          )}
        >
          <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
        </span>
      </div>
    </Comp>
  );
}

const PropertiesPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const canViewAll = canViewAllClients(currentUser?.role);
  const { language } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("Rent");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery.trim(), 400);
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
    employeeId: null,
    propertyTypeId: null,
    classification: null,
    ownerId: null,
    createdBy: null,
  });
  const [statusFilter, setStatusFilter] = useState("All");

  const propertyStatuses = STATUS_OPTIONS.map((s) => ({ id: s, name: t(s) }));

  const toIso = (date: Date | null, endOfDay: boolean) => {
    if (!date) return undefined;
    const d = new Date(date);
    if (endOfDay) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  const minPriceNum = Number(priceFilters.minPrice) || 0;
  const maxPriceNum = Number(priceFilters.maxPrice) || 0;
  let effectiveMin = minPriceNum;
  let effectiveMax = maxPriceNum;
  if (minPriceNum && maxPriceNum && minPriceNum > maxPriceNum) {
    effectiveMin = maxPriceNum;
    effectiveMax = minPriceNum;
  }

  const propertyFilters = {
    employeeId: canViewAll
      ? filterState.employeeId || undefined
      : undefined,
    status: statusFilter && statusFilter !== "All" ? statusFilter : undefined,
    areaDistrictIds:
      filterState.areas.length > 0 ? filterState.areas : undefined,
    createdFrom: toIso(filterState.createdFromDate, false),
    createdTo: toIso(filterState.createdToDate, true),
    updatedFrom: toIso(filterState.updatedFromDate, false),
    updatedTo: toIso(filterState.updatedToDate, true),
    propertyTypeId: filterState.propertyTypeId || undefined,
    classification: filterState.classification || undefined,
    ownerId: canViewAll ? filterState.ownerId || undefined : undefined,
    createdBy: canViewAll ? filterState.createdBy || undefined : undefined,
    search: debouncedSearch || undefined,
    listingType: activeTab === "Sale" || activeTab === "Rent" ? activeTab : undefined,
    minPrice: effectiveMin > 0 ? effectiveMin : undefined,
    maxPrice: effectiveMax > 0 ? effectiveMax : undefined,
    approvedOnly: true,
    page,
    pageSize: PAGE_SIZE,
    includeCounts: page === 1,
  };

  const { data: propertiesPageData, isLoading } = usePropertiesPage(
    company?.id,
    propertyFilters,
  );
  const paginatedListings = useMemo(
    () => propertiesPageData?.items ?? [],
    [propertiesPageData],
  );
  const listTotal = propertiesPageData?.total ?? 0;
  const [cachedCounts, setCachedCounts] = useState(propertiesPageData?.counts);
  const [cachedDrafts, setCachedDrafts] = useState(propertiesPageData?.drafts);
  useEffect(() => {
    if (propertiesPageData?.counts) setCachedCounts(propertiesPageData.counts);
  }, [propertiesPageData?.counts]);
  useEffect(() => {
    if (propertiesPageData?.drafts) setCachedDrafts(propertiesPageData.drafts);
  }, [propertiesPageData?.drafts]);
  const counts = propertiesPageData?.counts ?? cachedCounts;
  const myDrafts = useMemo(
    () => propertiesPageData?.drafts ?? cachedDrafts ?? [],
    [propertiesPageData?.drafts, cachedDrafts],
  );

  const { data: allAreasData } = useAreasDistrictsLookup(company?.id);
  const allAreasDistricts = useMemo(() => allAreasData ?? [], [allAreasData]);
  const { data: employeesData } = useCompanyEmployeesLookup(
    canViewAll ? company?.id : undefined,
  );
  const employees = useMemo(() => employeesData ?? [], [employeesData]);
  const { data: propertyTypesData } = usePropertyTypes(company?.id);
  const propertyTypes = useMemo(
    () => propertyTypesData ?? [],
    [propertyTypesData],
  );
  const { data: ownersData } = useOwnersLookup(
    canViewAll ? company?.id : undefined,
  );
  const owners = useMemo(() => ownersData ?? [], [ownersData]);

  const stats = useMemo(
    () => ({
      total: counts?.total ?? 0,
      rent: counts?.rent ?? 0,
      sale: counts?.sale ?? 0,
      available: counts?.available ?? 0,
    }),
    [counts],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "All") count += 1;
    if (filterState.areas.length > 0) count += filterState.areas.length;
    if (filterState.createdFromDate) count += 1;
    if (filterState.createdToDate) count += 1;
    if (filterState.updatedFromDate) count += 1;
    if (filterState.updatedToDate) count += 1;
    if (filterState.employeeId && canViewAll) count += 1;
    if (priceFilters.minPrice) count += 1;
    if (priceFilters.maxPrice) count += 1;
    if (filterState.propertyTypeId) count += 1;
    if (filterState.classification) count += 1;
    if (filterState.ownerId && canViewAll) count += 1;
    if (filterState.createdBy && canViewAll) count += 1;
    return count;
  }, [statusFilter, filterState, priceFilters, canViewAll]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, priceFilters, filterState, statusFilter, activeTab]);

  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = listTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + paginatedListings.length, listTotal);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const goToProperty = (p: Property) =>
    router.push(`/company/properties/${p.id}`);
  const goToAdd = () =>
    router.push(
      `/company/properties/add?listingType=${encodeURIComponent(activeTab)}`,
    );

  const handleRemoveFilter = (
    key: keyof PropertyFilterState | string,
    valueToRemove?: string,
  ) => {
    setFilterState((prev) => {
      const newState: PropertyFilterState = { ...prev };
      if (key === "areas" && valueToRemove) {
        newState.areas = newState.areas.filter((id) => id !== valueToRemove);
      } else if (key === "employeeId") {
        newState.employeeId = null;
      } else {
        (newState as unknown as Record<string, unknown>)[key] = null;
      }
      return newState;
    });
    if (key === "statusId") setStatusFilter("All");
  };

  const renderGrid = (listType: "Rent" | "Sale") => {
    if (isLoading) {
      return (
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden"
            >
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="space-y-3 p-4 sm:p-5">
                <Skeleton className="w-1/3 h-3" />
                <Skeleton className="w-2/3 h-5" />
                <Skeleton className="w-1/2 h-4" />
                <Skeleton className="w-full h-9" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (listTotal === 0) {
      return (
        <div className="relative bg-card shadow-[var(--shadow-subtle)] px-5 sm:px-6 py-14 sm:py-20 border border-border border-dashed rounded-2xl text-center overflow-hidden">
          <div
            className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.06] to-transparent h-24 pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            <div className="flex justify-center items-center bg-primary/10 mx-auto mb-4 rounded-2xl w-14 h-14">
              {listType === "Rent" ? (
                <Key className="w-7 h-7 text-primary/70" />
              ) : (
                <Home className="w-7 h-7 text-primary/70" />
              )}
            </div>
            <p className="font-outfit font-semibold text-foreground text-lg">
              {listType === "Rent"
                ? t("No rental properties found")
                : t("No sale properties found")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
              {t("Adjust your filters or add a new listing to get started.")}
            </p>
            <Button onClick={goToAdd} className="mt-6 rounded-xl h-10">
              <Plus className="w-4 h-4" />
              {t("Add Property")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedListings.map((p) => (
            <PropertyCard key={p.id} property={p} onView={goToProperty} />
          ))}
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card shadow-[var(--shadow-subtle)] px-3.5 sm:px-4 py-3 border border-border/60 rounded-2xl">
            <p className="order-2 sm:order-1 text-muted-foreground text-xs sm:text-sm tabular-nums">
              {t("Showing {{from}}–{{to}} of {{total}}", {
                from: pageStart + 1,
                to: pageEnd,
                total: listTotal,
              })}
            </p>
            <div className="order-1 sm:order-2 flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl w-9 h-9"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t("Previous")}
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </Button>

              {pageNumbers.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-muted-foreground text-sm"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant={item === currentPage ? "default" : "outline"}
                    size="icon"
                    className="rounded-xl w-9 h-9 tabular-nums"
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </Button>
                ),
              )}

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl w-9 h-9"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t("Next")}
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <>
      <DocumentHead title={`${t("Properties")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-gradient-to-b from-muted/35 via-background to-background min-h-[calc(100vh-68px)] pb-24 sm:pb-8">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.09] via-transparent to-primary/[0.03]"
            aria-hidden
          />
          <div
            className="absolute inset-0 pattern-grid-lg opacity-30"
            aria-hidden
          />

          <div className="relative mx-auto px-4 sm:px-6 py-6 sm:py-9 container max-w-6xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-2xl text-start">
                <Badge
                  variant="secondary"
                  className="mb-3 bg-primary/10 hover:bg-primary/10 border-primary/15 text-primary gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {t("Properties")}
                </Badge>
                <h1 className="font-outfit font-extrabold text-foreground text-2xl sm:text-3xl lg:text-4xl tracking-tight">
                  {t("Property Listings")}
                </h1>
                <p className="mt-2 text-muted-foreground text-sm sm:text-[15px] leading-relaxed">
                  {t(
                    "Browse and manage your rental and sale listings in one place.",
                  )}
                </p>
              </div>

              <div className="hidden sm:flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  onClick={goToAdd}
                  size="sm"
                  className="gap-2 rounded-xl h-10 font-medium shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {t("Add Property")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 sm:space-y-6 container max-w-6xl">
          <section className="gap-3 grid grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("Total Properties")}
              value={stats.total}
              icon={Building2}
            />
            <StatCard
              label={t("For Rent")}
              value={stats.rent}
              icon={Key}
              tone="sky"
              onClick={() => setActiveTab("Rent")}
            />
            <StatCard
              label={t("For Sale")}
              value={stats.sale}
              icon={Home}
              tone="emerald"
              onClick={() => setActiveTab("Sale")}
            />
            <StatCard
              label={t("Available")}
              value={stats.available}
              icon={CheckCircle2}
              tone="amber"
            />
          </section>

          <PendingApprovalsBanner />

          {myDrafts.length > 0 ? (
            <section className="relative bg-card shadow-[var(--shadow-subtle)] border border-amber-500/25 rounded-2xl overflow-hidden">
              <div className="p-3.5 sm:p-5 space-y-3">
                <div>
                  <h2 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
                    {t("My drafts & reviews")}
                  </h2>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {t(
                      "Draft and pending listings stay out of the active inventory until approved.",
                    )}
                  </p>
                </div>
                <div className="gap-3 sm:gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {myDrafts.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onView={goToProperty}
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {canViewAllClients(currentUser?.role) && company?.id ? (
            <DuplicatesReviewPanel companyId={company.id} initialTab="properties" />
          ) : null}

          <section className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
            <div
              className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.05] to-transparent h-16 pointer-events-none"
              aria-hidden
            />

            <div className="relative p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="top-1/2 start-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
                  <Input
                    placeholder={t("Search by title, code, or note...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background ps-9 h-11 rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewAll ? (
                    <Select
                      key={`employee-filter-${language}`}
                      value={filterState.employeeId || "all"}
                      onValueChange={(val) =>
                        setFilterState((prev) => ({
                          ...prev,
                          employeeId: val === "all" ? null : val,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-background rounded-xl w-full lg:w-[210px] h-11">
                        <SelectValue placeholder={t("All Employees")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("All Employees")}
                        </SelectItem>
                        <SelectItem value="unassigned">
                          {t("Unassigned")}
                        </SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            <span dir="auto">
                              {employeeDisplayName(emp, language, emp.name) ||
                                emp.id}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "rounded-xl h-11 w-full sm:w-auto justify-center",
                      showFilters && "bg-muted/70 border-primary/25",
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    {showFilters ? t("Hide Filters") : t("Filters")}
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex justify-center items-center bg-primary/10 ms-1 px-1.5 rounded-full min-w-[1.25rem] h-5 font-semibold text-primary text-[11px] tabular-nums">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </div>
              </div>

              {(showFilters || activeFilterCount > 0) && (
                <div className="space-y-3 pt-3.5 border-border/60 border-t">
                  {showFilters ? (
                    <div className="slide-in-from-top-4 animate-in duration-300 fade-in">
                      <FilterPanel
                        statuses={propertyStatuses}
                        areas={allAreasDistricts}
                        showPriceFilters={true}
                        propertyTypes={propertyTypes}
                        showClassificationFilter={true}
                        owners={canViewAll ? owners : []}
                        createdByUsers={canViewAll ? employees : []}
                        initialValues={{
                          ...filterState,
                          minPrice: priceFilters.minPrice,
                          maxPrice: priceFilters.maxPrice,
                        }}
                        onPriceChange={setPriceFilters}
                        onApplyFilters={(filters) => {
                          setFilterState((prev) => ({
                            ...prev,
                            statusId:
                              (filters.statusId as string | null) ?? null,
                            areas: Array.isArray(filters.areas)
                              ? (filters.areas as string[])
                              : [],
                            createdFromDate:
                              (filters.createdFromDate as Date | null) ?? null,
                            createdToDate:
                              (filters.createdToDate as Date | null) ?? null,
                            updatedFromDate:
                              (filters.updatedFromDate as Date | null) ?? null,
                            updatedToDate:
                              (filters.updatedToDate as Date | null) ?? null,
                            propertyTypeId:
                              (filters.propertyTypeId as string | null) ?? null,
                            classification:
                              (filters.classification as string | null) ?? null,
                            ownerId: (filters.ownerId as string | null) ?? null,
                            createdBy:
                              (filters.createdBy as string | null) ?? null,
                          }));
                          setStatusFilter(
                            (filters.statusId as string) || "All",
                          );
                        }}
                        onClearFilters={() => {
                          setFilterState((prev) => ({
                            ...prev,
                            statusId: null,
                            areas: [],
                            createdFromDate: null,
                            createdToDate: null,
                            updatedFromDate: null,
                            updatedToDate: null,
                            propertyTypeId: null,
                            classification: null,
                            ownerId: null,
                            createdBy: null,
                          }));
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
                    employees={employees}
                    propertyTypes={propertyTypes}
                    owners={owners}
                    onRemoveFilter={handleRemoveFilter}
                  />
                </div>
              )}
            </div>
          </section>

          <section>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <TabsList className="bg-muted/60 p-1 border border-border/60 rounded-xl h-auto w-full sm:w-auto">
                  <TabsTrigger
                    value="Rent"
                    className="gap-2 data-[state=active]:bg-background flex-1 sm:flex-none px-4 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                  >
                    <Key className="w-4 h-4" />
                    {t("For Rent")}
                    <span
                      className="bg-muted/80 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums"
                      dir="ltr"
                    >
                      {stats.rent}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="Sale"
                    className="gap-2 data-[state=active]:bg-background flex-1 sm:flex-none px-4 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                  >
                    <Home className="w-4 h-4" />
                    {t("For Sale")}
                    <span
                      className="bg-muted/80 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums"
                      dir="ltr"
                    >
                      {stats.sale}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <p className="text-muted-foreground text-xs sm:text-sm tabular-nums">
                  {listTotal === 0
                    ? t("properties_showing_count", { count: 0 })
                    : t("Showing {{from}}–{{to}} of {{total}}", {
                        from: pageStart + 1,
                        to: pageEnd,
                        total: listTotal,
                      })}
                </p>
              </div>

              <TabsContent value="Rent" className="mt-0 space-y-4 outline-none">
                {renderGrid("Rent")}
              </TabsContent>
              <TabsContent value="Sale" className="mt-0 space-y-4 outline-none">
                {renderGrid("Sale")}
              </TabsContent>
            </Tabs>
          </section>
        </div>

        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md p-3 safe-area-pb">
          <Button
            onClick={goToAdd}
            className="gap-2 rounded-xl w-full h-11 font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("Add Property")}
          </Button>
        </div>
      </main>
    </>
  );
};

export default PropertiesPage;
