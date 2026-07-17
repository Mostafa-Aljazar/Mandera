'use client';

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import pb from '@/lib/pocketbaseClient';
import CompanyAdminHeader from '@/components/CompanyAdminHeader';
import ClientDetailModal from '@/components/ClientDetailModal';
import FilterPanel from '@/components/FilterPanel';
import FilterChips from '@/components/FilterChips';
import BulkAssignModal from '@/components/BulkAssignModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, User, Phone, MapPin, MessageCircle, Megaphone, Filter, CalendarClock, Download, Loader2 } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { generateCSV, downloadCSV } from '@/utils/csvExport';
import type { Client, CompanyEmployee, Property, ClientStatus, ClientStatusHistory, MarketingChannelRecord } from '../../../types/pocketbase.types';

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

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [statuses, setStatuses] = useState<ClientStatus[]>([]);
  const [history, setHistory] = useState<ClientStatusHistory[]>([]);
  const [marketingChannels, setMarketingChannels] = useState<MarketingChannelRecord[]>([]);

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
    employeeId: null
  });

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const fetchData = async () => {
    if (!company?.id || !currentUser?.id) return;

    setIsLoading(true);
    try {
      const [emp, prop, stat, mchRes] = await Promise.all([
        pb.collection('company_employees').getFullList<CompanyEmployee>({ filter: `companyId = "${company.id}"`, $autoCancel: false }),
        pb.collection('properties').getFullList<Property>({ filter: `company_id = "${company.id}"`, $autoCancel: false }),
        pb.collection('client_statuses').getFullList<ClientStatus>({ filter: `company_id = "${company.id}"`, sort: 'created', $autoCancel: false }),
        pb.collection('marketing_channels').getFullList<MarketingChannelRecord>({ filter: `company_id="${company.id}"`, $autoCancel: false })
      ]);

      setEmployees(emp);
      setProperties(prop);
      setStatuses(stat);
      setMarketingChannels(mchRes);

      let filterParts = [`company_id = "${company.id}"`];

      // Strict data filtering based on employee role
      if (currentUser.role === 'company_employee') {
        filterParts.push(`employee_id = "${currentUser.id}"`);
      } else if (filterState.employeeId) {
        filterParts.push(`employee_id = "${filterState.employeeId}"`);
      }

      if (filterState.marketingChannel) {
        filterParts.push(`marketing_channel = "${filterState.marketingChannel}"`);
      }

      if (filterState.createdFromDate) {
        const d = new Date(filterState.createdFromDate);
        d.setHours(0, 0, 0, 0);
        filterParts.push(`created >= "${d.toISOString().replace('T', ' ')}"`);
      }
      if (filterState.createdToDate) {
        const d = new Date(filterState.createdToDate);
        d.setHours(23, 59, 59, 999);
        filterParts.push(`created <= "${d.toISOString().replace('T', ' ')}"`);
      }
      if (filterState.updatedFromDate) {
        const d = new Date(filterState.updatedFromDate);
        d.setHours(0, 0, 0, 0);
        filterParts.push(`updated >= "${d.toISOString().replace('T', ' ')}"`);
      }
      if (filterState.updatedToDate) {
        const d = new Date(filterState.updatedToDate);
        d.setHours(23, 59, 59, 999);
        filterParts.push(`updated <= "${d.toISOString().replace('T', ' ')}"`);
      }

      const finalFilter = filterParts.join(' && ');

      const fetchedClients = await pb.collection('clients').getFullList<Client>({
        filter: finalFilter,
        expand: 'employee_id,interested_properties',
        sort: '-created',
        $autoCancel: false
      });

      // If status filter is applied, we fetch the status history in parallel
      // to determine the *latest* status for each client
      let allHistories: ClientStatusHistory[] | null = null;
      if (filterState.statusId) {
        allHistories = await pb.collection('client_status_history').getFullList<ClientStatusHistory>({
          filter: `company_id = "${company.id}"`,
          sort: '-created',
          fields: 'client_id,status_id',
          $autoCancel: false
        });
      }

      let processedClients = fetchedClients;

      if (filterState.statusId && allHistories) {
        const latestStatusMap: Record<string, string> = {};
        for (const h of allHistories) {
          // Since history is sorted by -created, the first one encountered is the latest
          if (!latestStatusMap[h.client_id]) {
            latestStatusMap[h.client_id] = h.status_id;
          }
        }

        processedClients = processedClients.filter(
          c => latestStatusMap[c.id] === filterState.statusId
        );
      }

      setClients(processedClients);
    } catch (err) {
      console.error(err);
      toast.error(t('Failed to load clients data.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [company?.id, currentUser?.id, filterState, t]);

  const loadHistory = async (clientId: string | null | undefined) => {
    if(!clientId) {
      setHistory([]);
      return;
    }
    try {
      const hist = await pb.collection('client_status_history').getFullList<ClientStatusHistory>({
        filter: `client_id = "${clientId}"`,
        expand: 'status_id,created_by',
        sort: '-created',
        $autoCancel: false
      });
      setHistory(hist);
    } catch(err) {
      console.error(err);
    }
  };

  const handleExportCSV = async () => {
    if (clients.length === 0) {
      toast.info(t('No data to export'));
      return;
    }

    const loadingToast = toast.loading(t('Exporting CSV...'));
    try {
      // Fetch status histories in bulk to map statuses correctly
      const histories = await pb.collection('client_status_history').getFullList<ClientStatusHistory & { expand?: { status_id?: ClientStatus } }>({
        filter: `company_id="${company?.id}"`,
        sort: '-created',
        expand: 'status_id',
        $autoCancel: false
      });

      const statusMap: Record<string, ClientStatusHistory & { expand?: { status_id?: ClientStatus } }> = {};
      histories.forEach(h => {
        if (!statusMap[h.client_id]) statusMap[h.client_id] = h;
      });

      const headers = ['اسم العميل', 'رقم الهاتف', 'البريد الإلكتروني', 'الموظف المسؤول', 'قناة التسويق', 'الحالة', 'تاريخ الإنشاء'];
      const columns = [
        (c: Client) => c.name || '',
        (c: Client) => c.phone || '',
        (c: Client & { email?: string }) => c.email || 'N/A',
        (c: Client) => c.expand?.employee_id?.name || c.expand?.employee_id?.email || 'غير مسند',
        (c: Client) => c.marketing_channel || '',
        (c: Client) => statusMap[c.id]?.expand?.status_id?.name || 'بدون حالة',
        (c: Client) => c.created ? format(new Date(c.created), 'dd/MM/yyyy') : ''
      ];

      const csvString = generateCSV(clients, columns, headers);
      downloadCSV(csvString, `clients_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      toast.success(t('Exported successfully'), { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error(t('Export error'), { id: loadingToast });
    }
  };

  const handleOpenModal = (client: Client | null = null) => {
    setActiveClient(client);
    if (client) loadHistory(client.id);
    else setHistory([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveClient(null);
    setHistory([]);
  };

  const handleSaveClientInfo = async (formData: ClientSaveFormData) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        company_id: company!.id
      };

      if (!payload.marketing_channel) {
        delete payload.marketing_channel;
      }

      console.log('--- DEBUG: ClientsPage EXACT REQUEST START ---');
      console.log(`Collection: clients | Operation: ${activeClient?.id ? 'update' : 'create'}`);
      console.log('Auth token present:', !!pb.authStore.token);
      console.log('Payload:', JSON.stringify(payload, null, 2));

      let savedClient: Client;
      if (activeClient?.id) {
        try {
          savedClient = await pb.collection('clients').update<Client>(activeClient.id, payload, { expand: 'employee_id,interested_properties', $autoCancel: false });
          console.log('Success:', savedClient.id);
          toast.success(t('Client updated successfully.'));
        } catch (updateErr: any) {
          console.error('PocketBase Error:', updateErr.status, updateErr.message, updateErr.response);
          throw updateErr;
        }
      } else {
        try {
          savedClient = await pb.collection('clients').create<Client>(payload, { expand: 'employee_id,interested_properties', $autoCancel: false });
          console.log('Success:', savedClient.id);
          toast.success(t('Client created successfully.'));
        } catch (createErr: any) {
          console.error("PocketBase Client Create Error:", createErr.status, createErr.message, createErr.response);
          if (createErr.status === 400 || createErr.status === 403) {
             throw new Error(t('Permission denied or validation failed. Ensure you are allowed to create clients for this employee.'));
          }
          throw createErr;
        }
      }
      setActiveClient(savedClient);
      fetchData();
    } catch (err: any) {
      console.error("PocketBase Client Save Error details:", err.response || err);
      let errorMsg = err.message || t('Error saving client.');

      if (err.response?.data) {
        const fieldErrors = Object.entries(err.response.data)
          .map(([k, v]: [string, any]) => `${k}: ${v.message}`)
          .join(', ');
        if (fieldErrors) errorMsg += ` (${fieldErrors})`;
      } else if (err.response?.message) {
        errorMsg = err.response.message;
      }

      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFilter = (key: keyof ClientFilterState) => {
    setFilterState(prev => ({ ...prev, [key]: null }));
  };

  const toggleClientSelection = (id: string) => {
    setSelectedClientIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async ({ employeeId, statusId }: { employeeId: string; statusId?: string | null }) => {
    try {
      const selectedClientsData = clients.filter(c => selectedClientIds.includes(c.id));
      const newEmployee = employees.find(e => e.id === employeeId);

      for (const client of selectedClientsData) {
        await pb.collection('clients').update(client.id, {
          employee_id: employeeId
        }, { $autoCancel: false });

        let resolvedStatusId = statusId;

        if (!resolvedStatusId) {
          try {
            const latestHistory = await pb.collection('client_status_history').getFirstListItem<ClientStatusHistory>(`client_id="${client.id}"`, {
              sort: '-created',
              $autoCancel:false
            });
            resolvedStatusId = latestHistory.status_id;
          } catch (err) {
            resolvedStatusId = statuses.length > 0 ? statuses[0].id : null;
          }
        }

        if (resolvedStatusId) {
          const oldEmpName = client.expand?.employee_id?.name || client.expand?.employee_id?.email || 'Unassigned';
          const newEmpName = newEmployee?.name || newEmployee?.email || 'Unknown';
          const adminName = currentUser?.name || currentUser?.email || 'Admin';

          const note = `Transferred from ${oldEmpName} to ${newEmpName} by ${adminName}`;

          await pb.collection('client_status_history').create({
            client_id: client.id,
            status_id: resolvedStatusId,
            note: note,
            created_by: currentUser!.id,
            created_by_name: adminName,
            company_id: company!.id,
            transferred_from_employee: client.employee_id,
            transferred_to_employee: employeeId
          }, { $autoCancel: false });
        }
      }

      toast.success(t('Successfully reassigned clients.', { count: selectedClientIds.length }));
      setSelectedClientIds([]);
      setIsBulkModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(t('An error occurred during bulk assignment. Some clients may not have been updated.'));
    }
  };

  const renderFollowUpBadge = (client: Client) => {
    if (!client.follow_up_date) return null;

    const dateStr = client.follow_up_date.split(' ')[0];
    const timeStr = client.follow_up_time || '00:00';
    const followUpDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const isOverdue = isBefore(followUpDateTime, new Date());

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`absolute top-4 left-4 h-2.5 w-2.5 rounded-full ring-4 ring-background shadow-sm z-10 cursor-pointer ${isOverdue ? 'bg-status-overdue' : 'bg-status-upcoming'}`}
              onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
            />
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            <div className="flex items-center gap-1.5 font-medium mb-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {isOverdue ? t('Overdue') : t('Upcoming')}
            </div>
            <p className="text-muted-foreground">
              {format(followUpDateTime, 'MMM d, yyyy')} at {client.follow_up_time || '00:00'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      <Helmet>
        <title>{t('Clients')} | MANDERA CRM</title>
      </Helmet>
      <CompanyAdminHeader />

      <main className="min-h-[calc(100vh-80px)] bg-muted/20 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-outfit">{t('Client Directory')}</h1>
              <p className="text-muted-foreground mt-1">{t('Manage leads, inquiries, and track their pipeline lifecycle.')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {currentUser?.role === 'company_super_admin' && (
                <Select
                  value={filterState.employeeId || 'all'}
                  onValueChange={(val) => setFilterState(prev => ({...prev, employeeId: val === 'all' ? null : val}))}
                >
                  <SelectTrigger className="w-[200px] bg-background">
                    <SelectValue placeholder={t('All Employees')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Employees')}</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="gap-2 bg-background"
                title={t('Export to CSV')}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t('Export')}</span>
              </Button>

              {selectedClientIds.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                >
                  <Users className="h-4 w-4" /> {t('Assign Selected')} ({selectedClientIds.length})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 ${showFilters ? 'bg-muted' : 'bg-background'}`}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? t('Hide Filters') : t('Filter Clients')}
              </Button>
              <Button onClick={() => handleOpenModal(null)} className="gap-2 shadow-sm rounded-xl">
                <Plus className="h-4 w-4" /> {t('Add Client')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="text-sm text-muted-foreground bg-card px-3 py-1.5 rounded-lg border shadow-sm flex items-center gap-2">
              <span className="font-semibold text-foreground">{clients.length}</span> {t('clients found')}
              {filterState.employeeId && (
                <Badge variant="secondary" className="font-normal ms-2">
                  {t('Filtered by Employee')}
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-8 space-y-3">
            {showFilters && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <FilterPanel
                  statuses={statuses}
                  marketingChannels={marketingChannels}
                  onApplyFilters={(filters) => setFilterState(prev => ({ ...prev, ...filters }))}
                  onClearFilters={() => setFilterState(prev => ({
                    ...prev, statusId: null, marketingChannel: null, createdFromDate: null, createdToDate: null, updatedFromDate: null, updatedToDate: null
                  }))}
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
            <div className="py-24 flex flex-col items-center justify-center text-muted-foreground bg-card rounded-2xl border border-dashed shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-foreground">{t('Loading clients...')}</p>
              <p className="text-sm mt-1">{t('Please wait while we retrieve the data.')}</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground bg-card rounded-2xl border border-dashed flex flex-col items-center">
              <Users className="h-14 w-14 opacity-20 mb-4 text-primary" />
              <p className="text-lg font-medium text-foreground">{t('No clients found')}</p>
              <p className="text-sm mt-1">{t('Adjust your filters or add a new client.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {clients.map(c => {
                const cleanPhone = c.phone.replace(/\D/g, '');
                const isSelected = selectedClientIds.includes(c.id);

                return (
                  <Card
                    key={c.id}
                    className={`group cursor-pointer hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col relative ${isSelected ? 'border-primary ring-1 ring-primary/20' : 'border-border/60 hover:border-primary/40'}`}
                    onClick={() => handleOpenModal(c)}
                  >
                    {renderFollowUpBadge(c)}

                    <div
                      className="absolute top-3 left-3 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleClientSelection(c.id)}
                        className={`data-[state=checked]:bg-primary data-[state=checked]:border-primary ${!isSelected && 'opacity-0 group-hover:opacity-100'} transition-opacity bg-background/80 backdrop-blur-sm`}
                      />
                    </div>

                    <CardContent className="p-5 flex-1 flex flex-col relative pt-8">
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        <Badge variant="secondary" className={`shadow-sm ${c.interest_type==='Sale' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}`}>
                          {t(c.interest_type)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mb-4 mt-2">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold font-outfit shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="pr-12">
                          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">{c.name}</h3>
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <User className="h-3 w-3" /> {t('Agent')}: {c.expand?.employee_id?.name || t('Unassigned')}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm text-muted-foreground mt-2 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span className="line-clamp-1">{c.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${cleanPhone}`}
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 bg-muted rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                              title={t('Call')}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 bg-muted rounded-md hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors"
                              title={t('WhatsApp')}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{c.country_code}</span>
                        </div>
                        {c.marketing_channel && (
                          <div className="flex items-center gap-2 text-xs">
                            <Megaphone className="h-4 w-4 shrink-0" />
                            <span>{t('Source')}: <span className="font-medium text-foreground/80">{c.marketing_channel}</span></span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <div className="bg-muted/30 p-3 text-xs text-center text-muted-foreground group-hover:bg-primary/5 transition-colors border-t border-border/40">
                      {c.interested_properties?.length || 0} {t('Interested Properties')} • {t('Click to view details')}
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
              loadHistory(activeClient?.id);
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
