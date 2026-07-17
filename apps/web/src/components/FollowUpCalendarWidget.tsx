'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isBefore } from 'date-fns';
import { enUS, ar } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, Clock, User, Loader2, RefreshCw } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import ClientDetailModal, { type ClientFormData } from '@/components/ClientDetailModal';
import { cn } from '@/lib/utils';
import type { Client, ClientStatusHistory, Property, ClientStatus, CompanyEmployee } from '../../types/pocketbase.types';

interface ProcessedClient extends Client {
  latestHistoryRecord: ClientStatusHistory;
  followUpDateTime: Date;
  statusName: string;
  isOverdue: boolean;
}

// Helper to generate a consistent background color for statuses
const getStatusColorClass = (statusName?: string) => {
  if (!statusName) return 'bg-slate-500';
  const colorClasses = [
    'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 
    'bg-amber-600', 'bg-rose-600', 'bg-cyan-600', 
    'bg-indigo-600', 'bg-teal-600'
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
  
  const [followUps, setFollowUps] = useState<ProcessedClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Modal State
  const [activeClient, setActiveClient] = useState<ProcessedClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [statuses, setStatuses] = useState<ClientStatus[]>([]);
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [history, setHistory] = useState<ClientStatusHistory[]>([]);

  const fetchFollowUps = async () => {
    if (!company?.id) return;
    
    setIsLoading(true);
    setHasError(false);

    try {
      // 1. Fetch clients for the current company
      let clientFilter = `company_id="${company.id}"`;
      if (currentUser?.role !== 'company_super_admin') {
        clientFilter += ` && employee_id="${currentUser.id}"`;
      }

      const clientsRes = await pb.collection('clients').getList(1, 500, {
        filter: clientFilter,
        expand: 'employee_id',
        $autoCancel: false
      });

      // 2. Fetch all status histories to group and find the latest for each client
      const historyRes = await pb.collection('client_status_history').getFullList({
        filter: `company_id="${company.id}"`,
        sort: '-created',
        expand: 'status_id',
        $autoCancel: false
      });

      const latestHistoryMap: Record<string, ClientStatusHistory & { expand?: { status_id?: ClientStatus } }> = {};
      historyRes.forEach(record => {
        if (!latestHistoryMap[record.client_id]) {
          latestHistoryMap[record.client_id] = record as unknown as ClientStatusHistory & { expand?: { status_id?: ClientStatus } };
        }
      });

      const now = new Date();

      // 3. Filter clients: Only those where the latest status has a follow_up_date
      const processedClients: ProcessedClient[] = clientsRes.items
        .filter(client => {
          const latest = latestHistoryMap[client.id];
          return latest && latest.follow_up_date && latest.follow_up_date !== "";
        })
        .map(client => {
          const latest = latestHistoryMap[client.id];
          const followUpDateTime = new Date(latest.follow_up_date as string);
          const statusName = latest.expand?.status_id?.name || t('Unknown');

          return {
            ...(client as unknown as Client),
            latestHistoryRecord: latest,
            followUpDateTime,
            statusName,
            isOverdue: isBefore(followUpDateTime, now)
          };
        });

      // 4. Sort filtered clients by follow_up_date ascending
      processedClients.sort((a, b) => a.followUpDateTime.getTime() - b.followUpDateTime.getTime());

      setFollowUps(processedClients);

      // Prepare standard data for the Modal
      const [propRes, statRes, empRes] = await Promise.all([
        pb.collection('properties').getFullList({ filter: `company_id = "${company.id}"`, $autoCancel: false }),
        pb.collection('client_statuses').getFullList({ filter: `company_id = "${company.id}"`, sort: 'created', $autoCancel: false }),
        pb.collection('company_employees').getFullList({ filter: `companyId = "${company.id}"`, $autoCancel: false })
      ]);

      setProperties(propRes as unknown as Property[]);
      setStatuses(statRes as unknown as ClientStatus[]);
      setEmployees(empRes as unknown as CompanyEmployee[]);

    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [company?.id, currentUser?.id]);

  const handleClientClick = async (client: ProcessedClient) => {
    try {
      const hist = await pb.collection('client_status_history').getFullList({
        filter: `client_id = "${client.id}"`,
        expand: 'status_id,created_by',
        sort: '-created',
        $autoCancel: false
      });
      setHistory(hist as unknown as ClientStatusHistory[]);
      setActiveClient(client);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching client history for modal:', err);
    }
  };

  const handleSaveClientInfo = async (formData: ClientFormData) => {
    try {
      await pb.collection('clients').update(activeClient!.id, formData, { $autoCancel: false });
      fetchFollowUps();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStatus = async (statusForm: { status_id: string; note?: string; follow_up_date?: string; follow_up_time?: string }) => {
    try {
      await pb.collection('client_status_history').create({
        client_id: activeClient!.id,
        status_id: statusForm.status_id,
        note: statusForm.note,
        created_by: currentUser!.id,
        company_id: company!.id,
        follow_up_date: statusForm.follow_up_date || null
      }, { $autoCancel: false });

      // Keep client sync'd if needed
      await pb.collection('clients').update(activeClient!.id, {
        follow_up_date: statusForm.follow_up_date || null,
        follow_up_time: statusForm.follow_up_time || ''
      }, { $autoCancel: false });

      fetchFollowUps();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const dateLocale = i18n.language === 'ar' ? ar : enUS;

  return (
    <>
      <Card className="border-border/60 shadow-sm flex flex-col h-full overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-primary" />
            {t('Upcoming Follow-ups')}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm font-medium text-destructive mb-4">
                {t('Failed to load follow-ups.')}
              </p>
              <Button onClick={fetchFollowUps} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t('Retry')}
              </Button>
            </div>
          ) : followUps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground px-4">
              <CalendarClock className="h-12 w-12 mx-auto opacity-20 mb-3" />
              <p className="text-sm font-medium">{t('No scheduled follow-ups')}</p>
              <p className="text-xs mt-1 max-w-[200px] mx-auto">
                {t('Set follow-up dates when updating client statuses to see them here.')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {followUps.map(client => {
                const statusColor = getStatusColorClass(client.statusName);
                
                return (
                  <div 
                    key={client.id} 
                    className={cn(
                      "p-4 hover:bg-muted/40 transition-colors cursor-pointer group flex flex-col gap-2 relative",
                      client.isOverdue && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                    onClick={() => handleClientClick(client)}
                  >
                    {/* Left border indicator for overdue items */}
                    {client.isOverdue && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-sm text-foreground/90 group-hover:text-primary transition-colors flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{client.name}</span>
                      </div>
                      
                      {/* Status Badge */}
                      <span className={cn(
                        "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm shrink-0 whitespace-nowrap",
                        statusColor
                      )}>
                        {client.statusName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <div className={cn(
                        "flex items-center gap-1.5 font-medium",
                        client.isOverdue ? "text-destructive" : "text-muted-foreground"
                      )}>
                        <Clock className="h-3.5 w-3.5" />
                        {format(client.followUpDateTime, 'MMM d, yyyy', { locale: dateLocale })}
                      </div>
                      
                      {currentUser?.role === 'company_super_admin' && client.expand?.employee_id && (
                        <div className="flex items-center gap-1 border-l pl-3 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-3">
                          {t('Agent:')} {client.expand.employee_id.name || client.expand.employee_id.email}
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