"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, isBefore } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Clock, User, Loader2, RefreshCw } from "lucide-react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import ClientDetailModal, {
  type ClientFormData,
} from "@/components/ClientDetailModal";
import { cn } from "@/lib/utils";
import {
  useUpcomingFollowUps,
  useClientStatuses,
  useClientStatusHistory,
  useUpdateClient,
  useAddClientStatus,
} from "@/hooks/queries/useClients";
import { useProperties, useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import type {
  ClientWithRelations as Client,
} from "@/types/supabase-entities.types";

interface ProcessedClient extends Client {
  followUpDateTime: Date;
  statusName: string;
  isOverdue: boolean;
}

// Helper to generate a consistent background color for statuses
const getStatusColorClass = (statusName?: string) => {
  if (!statusName) return "bg-slate-500";
  const colorClasses = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-violet-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
    "bg-indigo-600",
    "bg-teal-600",
  ];
  let hash = 0;
  for (let i = 0; i < statusName.length; i++) {
    hash = statusName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorClasses[Math.abs(hash) % colorClasses.length];
};

const FollowUpCalendarWidget = () => {
  const { t, i18n } = useTranslation();
  const { company, currentUser } = useCompanyAuth();

  const [activeClient, setActiveClient] = useState<ProcessedClient | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const restrictToEmployeeId =
    currentUser?.role !== "company_super_admin" ? currentUser?.id : undefined;

  const {
    data: followUpsData,
    isLoading,
    isError: hasError,
    refetch: refetchFollowUps,
  } = useUpcomingFollowUps(company?.id, restrictToEmployeeId);

  const { data: propertiesData } = useProperties(isModalOpen ? company?.id : undefined);
  const properties = propertiesData ?? [];
  const { data: statusesData } = useClientStatuses(isModalOpen ? company?.id : undefined);
  const statuses = statusesData ?? [];
  const { data: employeesData } = useCompanyEmployeesLookup(isModalOpen ? company?.id : undefined);
  const employees = employeesData ?? [];
  const { data: historyData } = useClientStatusHistory(
    isModalOpen ? activeClient?.id : undefined,
  );
  const history = historyData ?? [];

  const updateClientMutation = useUpdateClient();
  const addClientStatusMutation = useAddClientStatus();

  const now = new Date();
  const followUps: ProcessedClient[] = (followUpsData ?? [])
    .map((client) => {
      const followUpDateTime = new Date(client.follow_up_date as string);
      return {
        ...(client as unknown as Client),
        followUpDateTime,
        statusName: client.latest_status_name || t("Unknown"),
        isOverdue: isBefore(followUpDateTime, now),
      };
    })
    .sort((a, b) => a.followUpDateTime.getTime() - b.followUpDateTime.getTime());

  const fetchFollowUps = () => refetchFollowUps();

  const handleClientClick = (client: ProcessedClient) => {
    setActiveClient(client);
    setIsModalOpen(true);
  };

  const handleSaveClientInfo = async (formData: ClientFormData) => {
    try {
      const result = await updateClientMutation.mutateAsync({
        id: activeClient!.id,
        ...formData,
      });
      if (result.error) throw new Error(result.error);
      fetchFollowUps();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStatus = async (statusForm: {
    status_id: string;
    note?: string;
    follow_up_date?: string;
    follow_up_time?: string;
  }) => {
    try {
      const result = await addClientStatusMutation.mutateAsync({
        clientId: activeClient!.id,
        companyId: company!.id,
        statusId: statusForm.status_id,
        note: statusForm.note,
        followUpDate: statusForm.follow_up_date || null,
        createdByUserId: currentUser!.id,
        employeeId: activeClient?.employee_id,
      });
      if (result.error) throw new Error(result.error);

      // Keep client synced with the follow-up date/time
      const followUpResult = await updateClientMutation.mutateAsync({
        id: activeClient!.id,
        name: activeClient!.name,
        phone: activeClient!.phone,
        country_code: activeClient!.country_code,
        interest_type: activeClient!.interest_type,
        interested_properties: activeClient!.interested_properties ?? [],
        employee_id: activeClient!.employee_id,
        marketing_channel: activeClient!.marketing_channel,
      });
      if (followUpResult.error) throw new Error(followUpResult.error);

      fetchFollowUps();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return (
    <>
      <Card className="flex flex-col shadow-sm border-border/60 h-full overflow-hidden">
        <CardHeader className="bg-muted/20 pb-3 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="w-5 h-5 text-primary" />
            {t("Upcoming Follow-ups")}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-0 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-muted-foreground/50 animate-spin" />
            </div>
          ) : hasError ? (
            <div className="flex flex-col justify-center items-center px-4 py-12 text-center">
              <p className="mb-4 font-medium text-destructive text-sm">
                {t("Failed to load follow-ups.")}
              </p>
              <Button
                onClick={fetchFollowUps}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t("Retry")}
              </Button>
            </div>
          ) : followUps.length === 0 ? (
            <div className="px-4 py-12 text-muted-foreground text-center">
              <CalendarClock className="opacity-20 mx-auto mb-3 w-12 h-12" />
              <p className="font-medium text-sm">
                {t("No scheduled follow-ups")}
              </p>
              <p className="mx-auto mt-1 max-w-[200px] text-xs">
                {t(
                  "Set follow-up dates when updating client statuses to see them here.",
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {followUps.map((client) => {
                const statusColor = getStatusColorClass(client.statusName);

                return (
                  <div
                    key={client.id}
                    className={cn(
                      "group relative flex flex-col gap-2 hover:bg-muted/40 p-4 transition-colors cursor-pointer",
                      client.isOverdue &&
                        "bg-destructive/5 hover:bg-destructive/10",
                    )}
                    onClick={() => handleClientClick(client)}
                  >
                    {/* Left border indicator for overdue items */}
                    {client.isOverdue && (
                      <div className="top-0 bottom-0 left-0 absolute bg-destructive w-1" />
                    )}

                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-2 font-semibold text-foreground/90 group-hover:text-primary text-sm transition-colors">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="max-w-[150px] sm:max-w-[200px] truncate">
                          {client.name}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={cn(
                          "inline-flex justify-center items-center shadow-sm px-2 py-0.5 rounded-md font-semibold text-[10px] text-white whitespace-nowrap shrink-0",
                          statusColor,
                        )}
                      >
                        {client.statusName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-0.5 text-muted-foreground text-xs">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 font-medium",
                          client.isOverdue
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {format(client.followUpDateTime, "MMM d, yyyy", {
                          locale: dateLocale,
                        })}
                      </div>

                      {currentUser?.role === "company_super_admin" &&
                        client.employee && (
                          <div className="flex items-center gap-1 rtl:pr-3 pl-3 rtl:pl-0 rtl:border-r border-l rtl:border-l-0">
                            {t("Agent:")}{" "}
                            {client.employee.name}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientDetailModal
        client={activeClient}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveInfo={handleSaveClientInfo}
        onAddStatus={handleAddStatus}
        properties={properties}
        statuses={statuses}
        history={history}
        employees={employees}
      />
    </>
  );
};

export default FollowUpCalendarWidget;
