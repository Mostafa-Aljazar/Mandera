"use client";

import React, { useState, useEffect } from "react";
import DocumentHead from "@/components/DocumentHead";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useClients,
  useClientStatuses,
  useClientStatusHistory,
  useCreateClient,
  useUpdateClient,
  useBulkAssignClients,
  getClientsExportData,
} from "@/hooks/queries/useClients";
import { useProperties, useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { useMarketingChannels } from "@/hooks/queries/useOwners";
import CompanyAdminHeader from "@/components/CompanyAdminHeader";
import ClientDetailModal from "@/components/ClientDetailModal";
import FilterPanel from "@/components/FilterPanel";
import FilterChips from "@/components/FilterChips";
import BulkAssignModal from "@/components/BulkAssignModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Users,
  User,
  Phone,
  MapPin,
  MessageCircle,
  Megaphone,
  Filter,
  CalendarClock,
  Download,
  Loader2,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { toast } from "sonner";
import { generateCSV, downloadCSV } from "@/utils/csvExport";
import type {
  ClientWithRelations as Client,
  CompanyEmployee,
  PropertyWithRelations as Property,
  ClientStatus,
  ClientStatusHistory,
  MarketingChannelRecord,
} from "@/types/supabase-entities.types";

// Mirrors ClientDetailModal's internal ClientFormData shape so the
// onSaveInfo callback prop is structurally compatible.
interface ClientSaveFormData {
  name: string;
  phone: string;
  country_code: string;
  interest_type: string;
  interested_properties: string[];
  employee_id: string;
  marketing_channel: string;
}

interface ClientFilterState {
  statusId: string | null;
  marketingChannel: string | null;
  createdFromDate: Date | null;
  createdToDate: Date | null;
  updatedFromDate: Date | null;
  updatedToDate: Date | null;
  employeeId: string | null;
}

const ClientsPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();

  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { data: clientsData, isLoading, refetch: refetchClients } = useClients(
    company?.id,
    clientFilters,
  );
  const clients = clientsData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const employees = employeesData ?? [];
  const { data: propertiesData } = useProperties(company?.id);
  const properties = propertiesData ?? [];
  const { data: statusesData } = useClientStatuses(company?.id);
  const statuses = statusesData ?? [];
  const { data: marketingChannelsData } = useMarketingChannels(company?.id);
  const marketingChannels = marketingChannelsData ?? [];
  const { data: historyData } = useClientStatusHistory(
    isModalOpen ? activeClient?.id : undefined,
  );
  const history = historyData ?? [];

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const bulkAssignMutation = useBulkAssignClients();

  const fetchData = () => refetchClients();

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

  const handleOpenModal = (client: Client | null = null) => {
    setActiveClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveClient(null);
  };

  const handleSaveClientInfo = async (formData: ClientSaveFormData) => {
    setIsSubmitting(true);
    try {
      if (activeClient?.id) {
        const result = await updateClientMutation.mutateAsync({
          id: activeClient.id,
          ...formData,
        });
        if (result.error) throw new Error(result.error);
        setActiveClient(result.data as unknown as Client);
        toast.success(t("Client updated successfully."));
      } else {
        const result = await createClientMutation.mutateAsync({
          companyId: company!.id,
          ...formData,
        });
        if (result.error) throw new Error(result.error);
        setActiveClient(result.data as unknown as Client);
        toast.success(t("Client created successfully."));
      }
    } catch (err: any) {
      console.error("Client Save Error details:", err);
      toast.error(err.message || t("Error saving client."));
    } finally {
      setIsSubmitting(false);
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

  const renderFollowUpBadge = (client: Client) => {
    if (!client.follow_up_date) return null;

    const dateStr = client.follow_up_date.split(" ")[0];
    const timeStr = client.follow_up_time || "00:00";
    const followUpDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const isOverdue = isBefore(followUpDateTime, new Date());

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`absolute top-4 left-4 h-2.5 w-2.5 rounded-full ring-4 ring-background shadow-sm z-10 cursor-pointer ${isOverdue ? "bg-status-overdue" : "bg-status-upcoming"}`}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(client);
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <div className="flex items-center gap-1.5 mb-1 font-medium">
              <CalendarClock className="w-3.5 h-3.5" />
              {isOverdue ? t("Overdue") : t("Upcoming")}
            </div>
            <p className="text-muted-foreground">
              {format(followUpDateTime, "MMM d, yyyy")} at{" "}
              {client.follow_up_time || "00:00"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      <DocumentHead title={`${t("Clients")} | MANDERA CRM`} />
      <CompanyAdminHeader />

      <main className="bg-muted/20 py-8 min-h-[calc(100vh-80px)]">
        <div className="mx-auto px-4 container">
          <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="font-outfit font-bold text-3xl tracking-tight">
                {t("Client Directory")}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {t(
                  "Manage leads, inquiries, and track their pipeline lifecycle.",
                )}
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

              {selectedClientIds.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary"
                >
                  <Users className="w-4 h-4" /> {t("Assign Selected")} (
                  {selectedClientIds.length})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 ${showFilters ? "bg-muted" : "bg-background"}`}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? t("Hide Filters") : t("Filter Clients")}
              </Button>
              <Button
                onClick={() => handleOpenModal(null)}
                className="gap-2 shadow-sm rounded-xl"
              >
                <Plus className="w-4 h-4" /> {t("Add Client")}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 bg-card shadow-sm px-3 py-1.5 border rounded-lg text-muted-foreground text-sm">
              <span className="font-semibold text-foreground">
                {clients.length}
              </span>{" "}
              {t("clients found")}
              {filterState.employeeId && (
                <Badge variant="secondary" className="ms-2 font-normal">
                  {t("Filtered by Employee")}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-8">
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

          {isLoading ? (
            <div className="flex flex-col justify-center items-center bg-card shadow-sm py-24 border border-dashed rounded-2xl text-muted-foreground">
              <Loader2 className="mb-4 w-10 h-10 text-primary animate-spin" />
              <p className="font-medium text-foreground text-lg">
                {t("Loading clients...")}
              </p>
              <p className="mt-1 text-sm">
                {t("Please wait while we retrieve the data.")}
              </p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center bg-card py-24 border border-dashed rounded-2xl text-muted-foreground text-center">
              <Users className="opacity-20 mb-4 w-14 h-14 text-primary" />
              <p className="font-medium text-foreground text-lg">
                {t("No clients found")}
              </p>
              <p className="mt-1 text-sm">
                {t("Adjust your filters or add a new client.")}
              </p>
            </div>
          ) : (
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clients.map((c) => {
                const cleanPhone = c.phone.replace(/\D/g, "");
                const isSelected = selectedClientIds.includes(c.id);

                return (
                  <Card
                    key={c.id}
                    className={`group cursor-pointer hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col relative ${isSelected ? "border-primary ring-1 ring-primary/20" : "border-border/60 hover:border-primary/40"}`}
                    onClick={() => handleOpenModal(c)}
                  >
                    {renderFollowUpBadge(c)}

                    <div
                      className="top-3 left-3 z-20 absolute"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleClientSelection(c.id)}
                        className={`data-[state=checked]:bg-primary data-[state=checked]:border-primary ${!isSelected && "opacity-0 group-hover:opacity-100"} transition-opacity bg-background/80 backdrop-blur-sm`}
                      />
                    </div>

                    <CardContent className="relative flex flex-col flex-1 p-5 pt-8">
                      <div className="top-4 right-4 absolute flex flex-col items-end gap-2">
                        <Badge
                          variant="secondary"
                          className={`shadow-sm ${c.interest_type === "Sale" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"}`}
                        >
                          {t(c.interest_type)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mt-2 mb-4">
                        <div className="flex justify-center items-center bg-primary/10 rounded-full w-10 h-10 font-outfit font-bold text-primary shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="pr-12">
                          <h3 className="font-semibold group-hover:text-primary text-lg line-clamp-1 transition-colors">
                            {c.name}
                          </h3>
                          <div className="flex items-center gap-1 text-muted-foreground text-xs">
                            <User className="w-3 h-3" /> {t("Agent")}:{" "}
                            {c.employee?.name || t("Unassigned")}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 mt-2 pt-4 border-t text-muted-foreground text-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 shrink-0" />
                            <span className="line-clamp-1">{c.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${cleanPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-muted hover:bg-primary/10 p-1.5 rounded-md hover:text-primary transition-colors"
                              title={t("Call")}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="bg-muted hover:bg-[#25D366]/10 p-1.5 rounded-md hover:text-[#25D366] transition-colors"
                              title={t("WhatsApp")}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>{c.country_code}</span>
                        </div>
                        {c.marketing_channel && (
                          <div className="flex items-center gap-2 text-xs">
                            <Megaphone className="w-4 h-4 shrink-0" />
                            <span>
                              {t("Source")}:{" "}
                              <span className="font-medium text-foreground/80">
                                {c.marketing_channel}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <div className="bg-muted/30 group-hover:bg-primary/5 p-3 border-border/40 border-t text-muted-foreground text-xs text-center transition-colors">
                      {c.interested_properties?.length || 0}{" "}
                      {t("Interested Properties")} •{" "}
                      {t("Click to view details")}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <ClientDetailModal
            client={activeClient}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSaveInfo={handleSaveClientInfo}
            onStatusAdded={() => {
              fetchData();
            }}
            properties={properties}
            statuses={statuses}
            history={history}
            employees={employees}
            marketingChannels={marketingChannels}
            isSubmitting={isSubmitting}
          />

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
