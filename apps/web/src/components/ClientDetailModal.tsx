'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { X, User, Save, Home, Phone, MessageCircle, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import StatusUpdateModal from '@/components/StatusUpdateModal';
import StatusHistoryDisplay from '@/components/StatusHistoryDisplay';
import { cn } from '@/lib/utils';
import pb from '@/lib/pocketbaseClient';
import type { Client, Property, ClientStatus, CompanyEmployee, MarketingChannelRecord } from '../../types/pocketbase.types';

type SelectableEmployee = CompanyEmployee & { firstName?: string };

const COUNTRIES = ['UAE', 'Saudi Arabia', 'Qatar', 'Oman', 'Bahrain', 'Kuwait', 'UK', 'USA'];
const MARKETING_CHANNELS = ['Google', 'Facebook', 'Instagram', 'TikTok', 'Snapchat', 'X', 'LinkedIn', 'Property Finder', 'Bayut', 'Dubizzle', 'Marjan', 'OpenSouk', 'Website'];

export interface ClientFormData {
  name: string;
  phone: string;
  country_code: string;
  interest_type: string;
  interested_properties: string[];
  employee_id: string;
  marketing_channel: string;
}

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveInfo: (data: ClientFormData) => void | Promise<void>;
  onStatusAdded?: () => void;
  properties?: Property[];
  statuses?: ClientStatus[];
  employees?: SelectableEmployee[];
  isSubmitting?: boolean;
  // Not read by this component (it calls onStatusAdded instead) — some callers
  // (e.g. FollowUpCalendarWidget) still pass these; kept optional so those
  // call sites typecheck without changing this component's actual behavior.
  onAddStatus?: (statusForm: { status_id: string; note?: string; follow_up_date?: string; follow_up_time?: string }) => void | Promise<void>;
  history?: unknown[];
  marketingChannels?: MarketingChannelRecord[];
}

const ClientDetailModal = ({
  client, isOpen, onClose, onSaveInfo, onStatusAdded,
  properties = [], statuses = [], employees = [], isSubmitting = false
}: ClientDetailModalProps) => {
  const { t } = useTranslation();
  const { currentUser, company } = useCompanyAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [propertySearchOpen, setPropertySearchOpen] = useState(false);

  const [formData, setFormData] = useState<ClientFormData>({
    name: client?.name || '',
    phone: client?.phone || '',
    country_code: client?.country_code || 'UAE',
    interest_type: client?.interest_type || 'Sale',
    interested_properties: client?.interested_properties || [],
    employee_id: client?.employee_id || (currentUser?.role === 'company_employee' ? currentUser.id : ''),
    marketing_channel: client?.marketing_channel || ''
  });

  React.useEffect(() => {
    if (client && isOpen) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        country_code: client.country_code || 'UAE',
        interest_type: client.interest_type || 'Sale',
        interested_properties: client.interested_properties || [],
        employee_id: client.employee_id || '',
        marketing_channel: client.marketing_channel || ''
      });
      setActiveTab('info');
      setPropertySearchOpen(false);
    } else if (!isOpen) {
      setFormData({ 
        name: '', 
        phone: '', 
        country_code: 'UAE', 
        interest_type: 'Sale', 
        interested_properties: [], 
        employee_id: currentUser?.role === 'company_employee' ? currentUser.id : '', 
        marketing_channel: '' 
      });
    }
  }, [client, isOpen, currentUser]);

  if (!isOpen) return null;

  const handlePropertySelect = (propertyId: string) => {
    if (formData.interested_properties.includes(propertyId)) return;
    if (formData.interested_properties.length >= 4) {
      toast.warning(t('Maximum 4 properties can be selected.'));
      return;
    }
    setFormData(prev => ({ ...prev, interested_properties: [...prev.interested_properties, propertyId] }));
  };

  const removeProperty = (propertyId: string) => {
    setFormData(prev => ({
      ...prev,
      interested_properties: prev.interested_properties.filter(id => id !== propertyId)
    }));
  };

  const handleSaveInfo = () => {
    if (!formData.name || !formData.phone || !formData.employee_id) {
      toast.error(t('Name, phone, and assigned agent are required.'));
      return;
    }
    const finalData = { ...formData };
    if (!client?.id && currentUser?.role === 'company_employee') {
      finalData.employee_id = currentUser.id as string;
    }
    
    console.log('--- DEBUG: ClientDetailModal Triggering onSaveInfo ---');
    console.log('Payload Data to Save:', JSON.stringify(finalData, null, 2));

    onSaveInfo(finalData);
  };

  const handleStatusSuccess = () => {
    setHistoryRefreshTrigger(prev => prev + 1);
    if (onStatusAdded) onStatusAdded();
  };

  const cleanPhone = formData.phone.replace(/\D/g, '');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg flex items-center gap-2 font-outfit">
            <User className="h-5 w-5 text-primary" />
            {client ? `${t('Client')}: ${client.name}` : t('Add New Client')}
          </DialogTitle>
          {client && client.marketing_channel && (
            <Badge variant="secondary" className="mr-6 bg-primary/10 text-primary border-primary/20 rtl:ml-6 rtl:mr-0">
              {t('Source')}: {client.marketing_channel}
            </Badge>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col max-h-[85vh]">
          <div className="px-4 pt-2 border-b overflow-x-auto">
            <TabsList className="grid w-full grid-cols-3 min-w-[300px] max-w-md bg-muted/50 h-9">
              <TabsTrigger value="info" className="text-xs">{t('Information')}</TabsTrigger>
              <TabsTrigger value="properties" className="text-xs">{t('Properties')}</TabsTrigger>
              <TabsTrigger value="status" disabled={!client} className="text-xs">{t('Status & History')}</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <TabsContent value="info" className="mt-0 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <Label className="text-xs">{t('Full Name')} *</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t("Client Name")} className="h-9" />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Phone Number')} *</Label>
                  <div className="flex gap-2">
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+971..." className="flex-1 h-9" />
                    {client && cleanPhone && (
                      <>
                        <Button asChild variant="outline" size="icon" className="shrink-0 h-9 w-9 hover:text-primary hover:bg-primary/10 transition-colors">
                          <a href={`tel:${cleanPhone}`} title="Call Client">
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="icon" className="shrink-0 h-9 w-9 hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors border-border">
                          <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" title="WhatsApp Client">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Country Code')}</Label>
                  <Select value={formData.country_code} onValueChange={v => setFormData({...formData, country_code: v})}>
                    <SelectTrigger className="bg-background h-9"><SelectValue placeholder={t('Select Country')} /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Marketing Channel')}</Label>
                  <Select value={formData.marketing_channel} onValueChange={v => setFormData({...formData, marketing_channel: v})}>
                    <SelectTrigger className="bg-background h-9"><SelectValue placeholder={t("Select Source")} /></SelectTrigger>
                    <SelectContent>
                      {MARKETING_CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Assigned Agent')} *</Label>
                  <Select 
                    value={formData.employee_id} 
                    onValueChange={v => setFormData({...formData, employee_id: v})}
                  >
                    <SelectTrigger className="bg-background h-9">
                      <SelectValue placeholder={t("Select Agent")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name || e.firstName || e.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-1 md:col-span-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                  <Label className="mb-2 block text-xs">{t('Primary Interest')}</Label>
                  <RadioGroup 
                    value={formData.interest_type} 
                    onValueChange={v => setFormData({...formData, interest_type: v})} 
                    className="flex space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Sale" id="m-sale" />
                      <Label htmlFor="m-sale" className="font-normal cursor-pointer text-sm">{t('Looking to Buy (Sale)')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Rent" id="m-rent" />
                      <Label htmlFor="m-rent" className="font-normal cursor-pointer text-sm">{t('Looking to Rent')}</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <div className="flex justify-end pt-3 border-t">
                <Button onClick={handleSaveInfo} disabled={isSubmitting} className="gap-2 px-6 h-9 text-sm">
                  <Save className="h-4 w-4" /> {isSubmitting ? t('Saving...') : t('Save Client Info')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="properties" className="mt-0 space-y-5 flex flex-col h-full">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Add Interested Property (Max 4)')}</Label>
                <Popover open={propertySearchOpen} onOpenChange={setPropertySearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={propertySearchOpen}
                      className="w-full justify-between bg-background h-9 font-normal text-muted-foreground"
                    >
                      {t('Search and select a property...')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('Search by code or title...')} />
                      <CommandList>
                        <CommandEmpty>{t('No property found.')}</CommandEmpty>
                        <CommandGroup>
                          {properties
                            .filter(p => p.listing_type === formData.interest_type)
                            .map(p => (
                              <CommandItem
                                key={p.id}
                                value={`${p.code} ${p.title}`}
                                disabled={formData.interested_properties.includes(p.id)}
                                onSelect={() => {
                                  handlePropertySelect(p.id);
                                  setPropertySearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4 shrink-0",
                                    formData.interested_properties.includes(p.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex justify-between w-full text-sm">
                                  <span className="truncate mr-2">{p.code} - {p.title}</span>
                                  <span className="text-muted-foreground shrink-0">AED {p.price?.toLocaleString()}</span>
                                </div>
                              </CommandItem>
                            ))
                          }
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1 bg-muted/20 rounded-lg p-4 border border-dashed">
                <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                  <Home className="h-3.5 w-3.5 text-primary" /> {t('Selected Properties')} ({formData.interested_properties.length}/4)
                </h4>
                {formData.interested_properties.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">{t('No properties selected yet.')}</p>
                ) : (
                  <div className="grid gap-2">
                    {formData.interested_properties.map(id => {
                      const prop = properties.find(p => p.id === id);
                      if (!prop) return null;
                      return (
                        <div key={id} className="flex items-center justify-between bg-card p-3 rounded-lg border shadow-sm hover:border-primary/30 transition-colors">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-primary">{prop.code}</span>
                            <span className="text-xs text-foreground/80 line-clamp-1">{prop.title}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeProperty(id)} className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 rounded-full">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-3 border-t">
                <Button onClick={handleSaveInfo} disabled={isSubmitting} className="gap-2 px-6 h-9 text-sm">
                  <Save className="h-4 w-4" /> {isSubmitting ? t('Saving...') : t('Save Properties')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="status" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
                
                <div className="lg:col-span-5">
                   <StatusUpdateModal
                      entityType="client"
                      entityData={client}
                      statuses={statuses}
                      onSuccess={handleStatusSuccess}
                   />
                </div>

                <div className="lg:col-span-7 h-[500px]">
                   <StatusHistoryDisplay 
                      entityType="client"
                      entityId={client?.id}
                      refreshTrigger={historyRefreshTrigger}
                   />
                </div>
                
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailModal;