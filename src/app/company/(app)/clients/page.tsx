"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useClients,
  useClientStatuses,
  useBulkAssignClients,
  getClientsExportData,
} from "@/hooks/queries/useClients";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { useMarketingChannels } from "@/hooks/queries/useOwners";
import CompanyAdminHeader from "@/components/company/CompanyAdminHeader";
import ClientCard from "@/components/company/clients/ClientCard";
import FilterPanel from "@/components/common/FilterPanel";
import FilterChips from "@/components/common/FilterChips";
import BulkAssignModal from "@/components/common/BulkAssignModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Users,
  User,
  Home,
  Key,
  Filter,
  Download,
  Search,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateCSV, downloadCSV } from "@/utils/csvExport";
import type { ClientWithRelations as Client } from "@/types/supabase-entities.types";

interface ClientFilterState {
  statusId: string | null;
  marketingChannel: string | null;
  createdFromDate: Date | null;
  createdToDate: Date | null;
  updatedFromDate: Date | null;
  updatedToDate: Date | null;
  employeeId: string | null;
}

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

const ClientsPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<ClientFilterState>({
    statusId: null,
    marketingChannel: null,
    createdFromDate: null,
    createdToDate: null,
    updatedFromDate: null,
    updatedToDate: null,
    employeeId: null,
  });

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const clientFilters = {
    employeeId:
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

  const { data: clientsData, isLoading } = useClients(
    company?.id,
    clientFilters,
  );
  const clients = clientsData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: statusesData } = useClientStatuses(company?.id);
  const statuses = statusesData ?? [];
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannels = marketingChannelsData ?? [];

  const bulkAssignMutation = useBulkAssignClients();

  const openClient = (client: Client | null = null) => {
    if (client?.id) {
      router.push(`/company/clients/${client.id}`);
    } else {
      router.push("/company/clients/new");
    }
  };

  const stats = useMemo(() => {
    const sale = clients.filter((c) => c.interest_type === "Sale");
    const rent = clients.filter((c) => c.interest_type === "Rent");
    const followUps = clients.filter((c) => {
      if (!c.follow_up_date) return false;
      const dateStr = c.follow_up_date.split(" ")[0];
      const timeStr = c.follow_up_time || "00:00";
      return !isBefore(new Date(`${dateStr}T${timeStr}:00`), new Date());
    });
    return {
      total: clients.length,
      sale: sale.length,
      rent: rent.length,
      followUps: followUps.length,
    };
  }, [clients]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.statusId) count += 1;
    if (filterState.marketingChannel) count += 1;
    if (filterState.createdFromDate) count += 1;
    if (filterState.createdToDate) count += 1;
    if (filterState.updatedFromDate) count += 1;
    if (filterState.updatedToDate) count += 1;
    if (
      filterState.employeeId &&
      currentUser?.role === "company_super_admin"
    ) {
      count += 1;
    }
    return count;
  }, [filterState, currentUser?.role]);

  const filterClients = (interestType: string) => {
    return clients.filter((c) => {
      if (interestType !== "All" && c.interest_type !== interestType) {
        return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        if (!matchesName && !matchesPhone) return false;
      }

      return true;
    });
  };

  const allClients = useMemo(
    () => filterClients("All"),
    [clients, searchQuery],
  );
  const saleClients = useMemo(
    () => filterClients("Sale"),
    [clients, searchQuery],
  );
  const rentClients = useMemo(
    () => filterClients("Rent"),
    [clients, searchQuery],
  );

  const currentListings =
    activeTab === "All"
      ? allClients
      : activeTab === "Sale"
        ? saleClients
        : rentClients;

  const handleExportCSV = async () => {
    if (clients.length === 0) {
      toast.info(t("No data to export"));
      return;
    }

    const loadingToast = toast.loading(t("Exporting CSV..."));
    try {
      const result = await getClientsExportData(company!.id);
      if (result.error) throw new Error(result.error);
      const rows = result.data;

      const headers = [
        "اسم العميل",
        "رقم الهاتف",
        "الموظف المسؤول",
        "قناة التسويق",
        "الحالة",
        "تاريخ الإنشاء",
      ];
      const columns = [
        (c: (typeof rows)[number]) => c.name || "",
        (c: (typeof rows)[number]) => c.phone || "",
        (c: (typeof rows)[number]) => c.employee_name || "غير مسند",
        (c: (typeof rows)[number]) => c.marketing_channel || "",
        (c: (typeof rows)[number]) => c.status_name || "بدون حالة",
        (c: (typeof rows)[number]) =>
          c.created_at ? format(new Date(c.created_at), "dd/MM/yyyy") : "",
      ];

      const csvString = generateCSV(rows, columns, headers);
      downloadCSV(csvString, `clients_${format(new Date(), "yyyy-MM-dd")}.csv`);
      toast.success(t("Exported successfully"), { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error(t("Export error"), { id: loadingToast });
    }
  };

  const handleRemoveFilter = (key: keyof ClientFilterState) => {
    setFilterState((prev) => ({ ...prev, [key]: null }));
  };

  const toggleClientSelection = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id],
    );
  };

  const handleBulkAssign = async ({
    employeeId,
    statusId,
  }: {
    employeeId: string;
    statusId?: string | null;
  }) => {
    try {
      const result = await bulkAssignMutation.mutateAsync({
        clientIds: selectedClientIds,
        employeeId,
        statusId,
        companyId: company!.id,
        createdByUserId: currentUser!.id,
        createdByName: currentUser?.name || currentUser?.id || "Admin",
      });
      if (result.error) throw new Error(result.error);

      toast.success(
        t("Successfully reassigned clients.", {
          count: selectedClientIds.length,
        }),
      );
      setSelectedClientIds([]);
      setIsBulkModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(
        t(
          "An error occurred during bulk assignment. Some clients may not have been updated.",
        ),
      );
    }
  };

  const renderGrid = (listType: string, listings: Client[]) => {
    if (isLoading) {
      return (
        <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden"
            >
              <Skeleton className="h-28 w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="w-2/3 h-5" />
                <Skeleton className="w-full h-4" />
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
            <Users className="opacity-30 mx-auto mb-4 w-12 h-12 text-primary" />
            <p className="font-outfit font-semibold text-foreground text-lg">
              {listType === "All"
                ? t("No clients found")
                : t("No {{type}} clients found", { type: t(listType) })}
            </p>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-relaxed">
              {t("Adjust your filters or add a new client.")}
            </p>
            <Button
              onClick={() => openClient(null)}
              className="mt-6 rounded-lg h-9"
            >
              <Plus className="w-4 h-4" />
              {t("Add Client")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="gap-4 sm:gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            isSelected={selectedClientIds.includes(c.id)}
            onSelect={toggleClientSelection}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <DocumentHead title={`${t("Clients")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-gradient-to-b from-muted/40 via-background to-background min-h-[calc(100vh-68px)]">
        <section className="relative border-border/50 border-b overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.08] via-transparent to-transparent"
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
                  {t("Client Directory")}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t(
                    "Manage leads, inquiries, and track their pipeline lifecycle.",
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                {selectedClientIds.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsBulkModalOpen(true)}
                    className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg h-9"
                  >
                    <Users className="w-4 h-4" />
                    {t("Assign Selected")} ({selectedClientIds.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="gap-2 rounded-lg h-9"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("Export")}</span>
                </Button>
                <Button
                  onClick={() => openClient(null)}
                  size="sm"
                  className="rounded-lg h-9 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t("Add Client")}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 container max-w-6xl">
          <section className="gap-3 sm:gap-4 grid grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("Total Clients")} value={stats.total} />
            <StatCard
              label={t("For Sale")}
              value={stats.sale}
              tone="emerald"
            />
            <StatCard label={t("For Rent")} value={stats.rent} tone="sky" />
            <StatCard
              label={t("Upcoming Follow-ups")}
              value={stats.followUps}
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
                  placeholder={t("Search by name or phone...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background ps-9 h-10"
                />
              </div>

              <div className="flex sm:flex-row flex-col gap-2">
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
                    <SelectTrigger className="bg-background w-full sm:w-[200px] h-10">
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
                ) : null}

                <FilterChips
                  activeFilters={filterState}
                  statuses={statuses}
                  marketingChannels={marketingChannels}
                  employees={employees}
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
                    value="All"
                    className="gap-2 data-[state=active]:bg-background px-4 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                  >
                    <User className="w-4 h-4" />
                    {t("All")}
                    <span className="bg-muted/80 data-[state=active]:bg-primary/10 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums">
                      {allClients.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="Sale"
                    className="gap-2 data-[state=active]:bg-background px-4 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                  >
                    <Home className="w-4 h-4" />
                    {t("For Sale")}
                    <span className="bg-muted/80 data-[state=active]:bg-primary/10 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums">
                      {saleClients.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="Rent"
                    className="gap-2 data-[state=active]:bg-background px-4 sm:px-6 rounded-lg h-9 data-[state=active]:shadow-sm"
                  >
                    <Key className="w-4 h-4" />
                    {t("For Rent")}
                    <span className="bg-muted/80 data-[state=active]:bg-primary/10 px-1.5 py-0.5 rounded-md font-medium text-[11px] tabular-nums">
                      {rentClients.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <p className="text-muted-foreground text-sm">
                  {t("clients_showing_count", { count: currentListings.length })}
                </p>
              </div>

              <TabsContent value="All" className="mt-0 outline-none">
                {renderGrid("All", allClients)}
              </TabsContent>

              <TabsContent value="Sale" className="mt-0 outline-none">
                {renderGrid("Sale", saleClients)}
              </TabsContent>

              <TabsContent value="Rent" className="mt-0 outline-none">
                {renderGrid("Rent", rentClients)}
              </TabsContent>
            </Tabs>
          </section>

          <BulkAssignModal
            isOpen={isBulkModalOpen}
            onClose={() => setIsBulkModalOpen(false)}
            onConfirm={handleBulkAssign}
            employees={employees}
            statuses={statuses}
            selectedCount={selectedClientIds.length}
          />
        </div>
      </main>
    </>
  );
};

export default ClientsPage;
