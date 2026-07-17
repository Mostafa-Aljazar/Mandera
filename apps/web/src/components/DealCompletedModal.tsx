'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Loader2, CheckCircle2, Banknote, Check, ChevronsUpDown } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { CompanyEmployee, Client, Property } from '../../types/pocketbase.types';

interface DealPropertyData extends Property {
  expand?: {
    owner_id?: { name?: string };
    area_district?: { name?: string };
  };
}

interface DealCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: DealPropertyData | null;
  onSuccess: () => void;
}

const DealCompletedModal = ({ isOpen, onClose, property, onSuccess }: DealCompletedModalProps) => {
  const { company } = useCompanyAuth();
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    employee_id: '',
    client_id: '',
    commission_value: ''
  });

  useEffect(() => {
    if (isOpen && company?.id && property) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [empRes, cliRes] = await Promise.all([
            pb.collection('company_employees').getFullList({ filter: `companyId="${company!.id}"`, $autoCancel: false }),
            pb.collection('clients').getFullList({ filter: `company_id="${company!.id}"`, sort: 'name', $autoCancel: false })
          ]);
          setEmployees(empRes as unknown as CompanyEmployee[]);
          setClients(cliRes as unknown as Client[]);

          const defaultCommission = (property.price || 0) * (property.commission_percentage || 0) / 100;
          
          setFormData({
            employee_id: property.employee_id || '',
            client_id: '',
            commission_value: defaultCommission ? defaultCommission.toString() : ''
          });
        } catch (err) {
          toast.error(t("Failed to load necessary data for deal completion."));
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, company?.id, property, t]);

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.client_id) {
      toast.error(t('Please select both an employee and a client.'));
      return;
    }

    setSubmitting(true);
    try {
      const selectedEmp = employees.find(e => e.id === formData.employee_id)!;
      const selectedCli = clients.find(c => c.id === formData.client_id)!;
      const ownerName = property?.expand?.owner_id?.name || 'Unknown';
      const areaName = property?.expand?.area_district?.name || property!.area || '';

      const updatePayload = { status: 'Deal Completed' };
      console.log('--- DEBUG: DealCompletedModal EXACT REQUEST START ---');
      console.log('Collection: properties | Operation: update');
      console.log('Auth token present:', !!pb.authStore.token);
      console.log('Payload:', JSON.stringify(updatePayload, null, 2));

      let updatedProp;
      try {
        updatedProp = await pb.collection('properties').update(property!.id, updatePayload, { $autoCancel: false });
        console.log('Success:', updatedProp.id);
      } catch (error) {
        const e = error as { status?: number; message?: string; response?: unknown };
        console.error('PocketBase Error:', e.status, e.message, e.response);
        throw error;
      }

      if (updatedProp && updatedProp.id) {

        // 2. SECONDARY OPERATIONS: Revenues and History
        try {
          const revenueData = {
            property_code: property!.code,
            emirate: property!.emirate,
            area_district: areaName,
            commission_value: Number(formData.commission_value) || 0,
            employee_id: selectedEmp.id,
            employee_name: selectedEmp.name || selectedEmp.email,
            deal_completion_date: new Date().toISOString(),
            client_id: selectedCli.id,
            client_name: selectedCli.name,
            owner_name: ownerName,
            company_id: company!.id
          };

          console.log('--- DEBUG: DealCompletedModal EXACT REQUEST START ---');
          console.log('Collection: revenues | Operation: create');
          console.log('Auth token present:', !!pb.authStore.token);
          console.log('Payload:', JSON.stringify(revenueData, null, 2));

          const revResult = await pb.collection('revenues').create(revenueData, { $autoCancel: false });
          console.log('Success:', revResult.id);
        } catch (revErr) {
          const e = revErr as { status?: number; message?: string; response?: unknown };
          console.error('PocketBase Error (revenues):', e.status, e.message, e.response);
          console.warn("Secondary operation failed (revenues):", revErr);
        }

        try {
          const authModel = pb.authStore.model as unknown as { id: string; name?: string; email?: string } | null;
          const historyData = {
            property_id: property!.id,
            status: 'Deal Completed',
            note: `Deal completed with client ${selectedCli.name}`,
            created_by: authModel?.id,
            created_by_name: authModel?.name || authModel?.email || 'System',
            company_id: company!.id
          };

          console.log('--- DEBUG: DealCompletedModal EXACT REQUEST START ---');
          console.log('Collection: property_status_history | Operation: create');
          console.log('Auth token present:', !!pb.authStore.token);
          console.log('Payload:', JSON.stringify(historyData, null, 2));

          const histResult = await pb.collection('property_status_history').create(historyData, { $autoCancel: false });
          console.log('Success:', histResult.id);
        } catch (histErr) {
          const e = histErr as { status?: number; message?: string; response?: unknown };
          console.error('PocketBase Error (status_history):', e.status, e.message, e.response);
          console.warn("Secondary operation failed (status history):", histErr);
        }

        toast.success(t('Property status updated successfully'));
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Primary operation failed:", err);
      toast.error((err as Error).message || t('Error saving deal completion.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            {t('Complete Deal')}
          </DialogTitle>
          <DialogDescription>
            {t('Finalize this deal to update the property status and record revenue.')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-3 rounded-lg border border-border/50 text-sm flex justify-between">
              <span className="text-muted-foreground">{t('Property:')}</span>
              <span className="font-semibold">{property?.code}</span>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label>{t('Closing Agent *')}</Label>
              <Select value={formData.employee_id} onValueChange={v => setFormData({...formData, employee_id: v})}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t('Select Employee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name || e.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label>{t('Purchasing/Renting Client *')}</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="w-full justify-between bg-background font-normal"
                  >
                    {formData.client_id
                      ? (clients.find(c => c.id === formData.client_id)?.name + ' (' + clients.find(c => c.id === formData.client_id)?.phone + ')')
                      : t('Search and select client...')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 pointer-events-auto z-50" align="start">
                  <Command>
                    <CommandInput placeholder={t('Search by name or phone...')} />
                    <CommandList>
                      <CommandEmpty>{t('No client found.')}</CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.phone}`}
                            onSelect={() => {
                              setFormData({...formData, client_id: c.id});
                              setClientSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.client_id === c.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {c.name} ({c.phone})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4" /> {t('Commission Value (AED)')}
              </Label>
              <Input 
                type="number" 
                value={formData.commission_value} 
                onChange={e => setFormData({...formData, commission_value: e.target.value})}
                placeholder={t('Enter commission amount')}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>{t('Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting || loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('Processing...')}</> : t('Confirm Deal')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DealCompletedModal;