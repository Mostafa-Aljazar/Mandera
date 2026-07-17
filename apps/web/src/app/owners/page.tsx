'use client';

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import pb from '@/lib/pocketbaseClient';
import CompanyAdminHeader from '@/components/CompanyAdminHeader';
import OwnerDetailModal from '@/components/OwnerDetailModal';
import FilterPanel from '@/components/FilterPanel';
import FilterChips from '@/components/FilterChips';
import EmployeeReassignmentModal from '@/components/EmployeeReassignmentModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, MapPin, Phone, User, MessageCircle, Filter, CheckCircle2, AlertTriangle, Building2, Users, Download, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useOwnerStatusBadge } from '@/hooks/useOwnerStatusBadge';
import { generateCSV, downloadCSV } from '@/utils/csvExport';
import type { Owner, OwnerStatus, OwnerStatusHistory, CompanyEmployee, MarketingChannelRecord, Property } from '../../../types/pocketbase.types';

const COUNTRIES = ['UAE', 'Saudi Arabia', 'Qatar', 'Oman', 'Bahrain', 'Kuwait', 'UK', 'USA', 'Other'];

interface OwnerFormData {
  name: string;
  phone: string;
  country: string;
  assigned_employee_id: string;
  marketing_channel: string;
}

interface OwnerFilterState {
  statusId: string | null;
  marketingChannel: string | null;
  createdFromDate: Date | null;
  createdToDate: Date | null;
  updatedFromDate: Date | null;
  updatedToDate: Date | null;
  employeeId: string | null;
}

interface OwnerCardProps {
  owner: Owner;
  employees: CompanyEmployee[];
  onEdit: (owner: Owner) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: (owner: Owner) => void;
  isSelected: boolean;
  onToggleSelect: (id: string, checked: boolean | 'indeterminate') => void;
  companyId?: string;
}

const OwnerCard = ({ owner, employees, onEdit, onDelete, onClick, isSelected, onToggleSelect, companyId }: OwnerCardProps) => {
  const { t } = useTranslation();
  const badge = useOwnerStatusBadge(owner.id, companyId);
  const cleanPhone = owner.phone?.replace(/\D/g, '') || '';

  const assignedEmp = employees.find(e => e.id === owner.assigned_employee_id);
  const empName = assignedEmp ? (assignedEmp.name || assignedEmp.email) : t('Unassigned');

  const [propertyCount, setPropertyCount] = useState(0);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const [propsRes, statusRes] = await Promise.all([
          pb.collection('properties').getList(1, 1, { filter: `owner_id="${owner.id}"`, $autoCancel: false }),
          pb.collection('owner_status_history').getList(1, 1, {
            filter: `owner_id="${owner.id}"`,
            sort: '-created',
            expand: 'status_id',
            $autoCancel: false
          })
        ]);

        if (isMounted) {
          setPropertyCount(propsRes.totalItems);
          if (statusRes.items.length > 0 && statusRes.items[0].expand?.status_id) {
            setLatestStatus(statusRes.items[0].expand.status_id.name);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [owner.id]);

  return (
    <Card
      className={`group cursor-pointer hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col relative ${isSelected ? 'border-primary ring-1 ring-primary/20' : 'border-border/60 hover:border-primary/40'}`}
      onClick={() => onClick(owner)}
    >
      <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(owner.id, checked)}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      <div className={`absolute top-3 right-3 z-10 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${badge.color}`}>
        {badge.icon === 'check' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
        {badge.text}
      </div>

      <CardHeader className="pb-3 pt-10 relative">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold font-outfit shrink-0 text-lg">
            {owner.name.charAt(0).toUpperCase()}
          </div>
          <div className="pr-2">
            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">{owner.name}</CardTitle>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">{empName}</span>
            </div>
          </div>
        </div>
        <div className="absolute top-10 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm"
            onClick={(e) => { e.stopPropagation(); onEdit(owner); }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive bg-background/80 backdrop-blur-sm shadow-sm"
            onClick={(e) => { e.stopPropagation(); onDelete(owner.id, e); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
            <Phone className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{owner.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{owner.country || t('N/A')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
            <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{t('Number of properties:')} {propertyCount}</span>
          </div>
          {owner.marketing_channel && (
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
              <Megaphone className="h-4 w-4 shrink-0 text-primary/70" />
              <span className="line-clamp-1">{owner.marketing_channel}</span>
            </div>
          )}
        </div>
      </CardContent>
      <div className="bg-muted/30 p-3 text-xs text-center text-muted-foreground group-hover:bg-primary/5 transition-colors border-t border-border/40 flex justify-between items-center">
        {cleanPhone && (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <a
              href={`tel:${cleanPhone}`}
              className="p-1.5 bg-background rounded-md hover:bg-primary/10 hover:text-primary transition-colors border shadow-sm"
              title={t('Call')}
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-background rounded-md hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors border shadow-sm"
              title={t('WhatsApp')}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
        <span>{t('Click to view details')}</span>
      </div>
    </Card>
  );
};

const OwnersPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [statuses, setStatuses] = useState<OwnerStatus[]>([]);
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [marketingChannels, setMarketingChannels] = useState<MarketingChannelRecord[]>([]);

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Owner | null>(null);
  const [formData, setFormData] = useState<OwnerFormData>({ name: '', phone: '', country: 'UAE', assigned_employee_id: '', marketing_channel: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeOwner, setActiveOwner] = useState<Owner | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<OwnerFilterState>({
    statusId: null,
    marketingChannel: null,
    createdFromDate: null,
    createdToDate: null,
    updatedFromDate: null,
    updatedToDate: null,
    employeeId: null
  });

  const fetchData = async () => {
    if (!company?.id || !currentUser?.id) return;
    try {
      const [statRes, empRes, mchRes] = await Promise.all([
        pb.collection('owner_statuses').getList<OwnerStatus>(1, 100, { filter: `company_id="${company.id}"`, $autoCancel: false }),
        pb.collection('company_employees').getFullList<CompanyEmployee>({ filter: `companyId="${company.id}"`, $autoCancel: false }),
        pb.collection('marketing_channels').getFullList<MarketingChannelRecord>({ filter: `company_id="${company.id}"`, $autoCancel: false })
      ]);
      setStatuses(statRes.items);
      setEmployees(empRes);
      setMarketingChannels(mchRes);

      let filterParts = [`company_id = "${company.id}"`];

      if (currentUser.role === 'company_employee') {
        filterParts.push(`assigned_employee_id = "${currentUser.id}"`);
      } else if (filterState.employeeId) {
        filterParts.push(`assigned_employee_id = "${filterState.employeeId}"`);
      }

      if (filterState.statusId) {
        const histMatches = await pb.collection('owner_status_history').getFullList<OwnerStatusHistory>({
          filter: `company_id = "${company.id}" && status_id = "${filterState.statusId}"`,
          $autoCancel: false
        });
        const matchedOwnerIds = [...new Set(histMatches.map(h => h.owner_id))];

        if (matchedOwnerIds.length === 0) {
          filterParts.push(`id = "no_match"`);
        } else {
          const idConditions = matchedOwnerIds.map(id => `id="${id}"`).join(' || ');
          filterParts.push(`(${idConditions})`);
        }
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

      const data = await pb.collection('owners').getFullList<Owner>({
        filter: finalFilter,
        $autoCancel: false,
        sort: '-created'
      });
      setOwners(data);
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to load owners.'));
    }
  };

  useEffect(() => {
    fetchData();
  }, [company?.id, currentUser?.id, filterState, t]);

  const handleExportCSV = async () => {
    if (owners.length === 0) {
      toast.info(t('No data to export'));
      return;
    }

    const loadingToast = toast.loading(t('Exporting CSV...'));
    try {
      const histories = await pb.collection('owner_status_history').getFullList<OwnerStatusHistory & { expand?: { status_id?: OwnerStatus } }>({
        filter: `company_id="${company?.id}"`,
        sort: '-created',
        expand: 'status_id',
        $autoCancel: false
      });
      const props = await pb.collection('properties').getFullList<Property>({
        filter: `company_id="${company?.id}"`,
        $autoCancel: false
      });

      const statusMap: Record<string, OwnerStatusHistory & { expand?: { status_id?: OwnerStatus } }> = {};
      histories.forEach(h => {
        if (!statusMap[h.owner_id]) statusMap[h.owner_id] = h;
      });

      const propsCountMap: Record<string, number> = {};
      props.forEach(p => {
        propsCountMap[p.owner_id] = (propsCountMap[p.owner_id] || 0) + 1;
      });

      const headers = ['اسم المالك', 'رقم الهاتف', 'الموظف المسؤول', 'قناة التسويق', 'الحالة', 'عدد العقارات', 'تاريخ آخر تحديث للحالة', 'مؤشر الحالة', 'تاريخ الإنشاء'];
      const columns = [
        (o: Owner) => o.name || '',
        (o: Owner) => o.phone || '',
        (o: Owner) => employees.find(e => e.id === o.assigned_employee_id)?.name || 'غير مسند',
        (o: Owner) => o.marketing_channel || '',
        (o: Owner) => statusMap[o.id]?.expand?.status_id?.name || 'لا يوجد',
        (o: Owner) => propsCountMap[o.id] || 0,
        (o: Owner) => statusMap[o.id] ? format(new Date(statusMap[o.id].created), 'dd/MM/yyyy') : 'لا يوجد',
        (o: Owner) => {
          const lastDate = statusMap[o.id] ? new Date(statusMap[o.id].created) : null;
          if (!lastDate) return 'محدث';
          const daysDiff = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff > 30 ? 'قديم' : 'محدث';
        },
        (o: Owner) => o.created ? format(new Date(o.created), 'dd/MM/yyyy') : ''
      ];

      const csvString = generateCSV(owners, columns, headers);
      downloadCSV(csvString, `owners_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      toast.success(t('Exported successfully'), { id: loadingToast });
    } catch(err) {
      console.error(err);
      toast.error(t('Export error'), { id: loadingToast });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.assigned_employee_id || !formData.marketing_channel) {
      toast.error(t('Please fill all required fields.'));
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { ...formData, company_id: company!.id };

      console.log('--- DEBUG: OwnersPage EXACT REQUEST START ---');
      console.log(`Collection: owners | Operation: ${editItem ? 'update' : 'create'}`);
      console.log('Auth token present:', !!pb.authStore.token);
      console.log('Payload:', JSON.stringify(payload, null, 2));

      if (editItem) {
        try {
          const result = await pb.collection('owners').update(editItem.id, payload, { $autoCancel: false });
          console.log('Success:', result.id);
          toast.success(t('Owner updated successfully.'));
        } catch (updateErr: any) {
          console.error('PocketBase Error:', updateErr.status, updateErr.message, updateErr.response);
          throw updateErr;
        }
      } else {
        try {
          const result = await pb.collection('owners').create(payload, { $autoCancel: false });
          console.log('Success:', result.id);
          toast.success(t('Owner added successfully.'));
        } catch (createErr: any) {
          console.error('PocketBase Error:', createErr.status, createErr.message, createErr.response);
          throw createErr;
        }
      }
      setOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("PocketBase Owner Save Error details:", err.response || err);
      toast.error(err.response?.message || err.message || t('Error saving owner.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('Delete this owner?'))) return;
    try {
      await pb.collection('owners').delete(id, { $autoCancel: false });
      toast.success(t('Owner deleted.'));
      setSelectedOwners(prev => prev.filter(ownerId => ownerId !== id));
      fetchData();
    } catch (error) {
      toast.error(t('Could not delete. Owner might be linked to properties.'));
    }
  };

  const handleBulkReassign = async (targetEmployeeId: string) => {
    setIsReassigning(true);
    try {
      const promises = selectedOwners.map(id =>
        pb.collection('owners').update(id, { assigned_employee_id: targetEmployeeId }, { $autoCancel: false })
      );
      await Promise.all(promises);
      toast.success(t('Owners reassigned successfully.'));
      setSelectedOwners([]);
      setIsReassignModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(t('Error reassigning owners.'));
    } finally {
      setIsReassigning(false);
    }
  };

  const resetForm = () => {
    setEditItem(null);
    setFormData({
      name: '',
      phone: '',
      country: 'UAE',
      assigned_employee_id: currentUser?.role === 'company_employee' ? currentUser.id : '',
      marketing_channel: ''
    });
  };

  const openEditForm = (owner: Owner) => {
    setEditItem(owner);
    setFormData({
      name: owner.name,
      phone: owner.phone,
      country: owner.country || 'UAE',
      assigned_employee_id: owner.assigned_employee_id || '',
      marketing_channel: owner.marketing_channel || ''
    });
    setOpen(true);
  };

  const openDetailModal = (owner: Owner) => {
    setActiveOwner(owner);
    setIsDetailModalOpen(true);
  };

  const handleRemoveFilter = (key: keyof OwnerFilterState) => {
    setFilterState(prev => ({ ...prev, [key]: null }));
  };

  const toggleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedOwners(owners.map(o => o.id));
    } else {
      setSelectedOwners([]);
    }
  };

  const toggleSelectOwner = (id: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedOwners(prev => [...prev, id]);
    } else {
      setSelectedOwners(prev => prev.filter(ownerId => ownerId !== id));
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('Owners')} | MANDERA CRM</title>
      </Helmet>
      <CompanyAdminHeader />

      <main className="min-h-[calc(100vh-80px)] bg-muted/20 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-outfit">{t('Property Owners')}</h1>
              <p className="text-muted-foreground mt-1">{t('Manage individuals who own your listed properties.')}</p>
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

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 ${showFilters ? 'bg-muted' : 'bg-background'}`}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? t('Hide Filters') : t('Filter Owners')}
              </Button>
              <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl shadow-sm" onClick={resetForm}><Plus className="h-4 w-4" /> {t('Add New Owner')}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editItem ? t('Edit Owner') : t('Add New Owner')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSave} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t('Full Name')} *</Label>
                      <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t('e.g. John Doe')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('Phone Number')} *</Label>
                      <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder={t('+971 50 123 4567')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('Country')}</Label>
                      <Select value={formData.country} onValueChange={v => setFormData({...formData, country: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select Country')} />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('Marketing Channel')} *</Label>
                      <Select
                        value={formData.marketing_channel}
                        onValueChange={v => setFormData({...formData, marketing_channel: v})}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select Channel')} />
                        </SelectTrigger>
                        <SelectContent>
                          {marketingChannels.map(mc => (
                            <SelectItem key={mc.id} value={mc.name}>{mc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('Assigned Employee')} *</Label>
                      <Select
                        value={formData.assigned_employee_id}
                        onValueChange={v => setFormData({...formData, assigned_employee_id: v})}
                        required
                        disabled={currentUser?.role === 'company_employee'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select Employee')} />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('Saving...') : t('Save Owner')}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="text-sm text-muted-foreground bg-card px-3 py-1.5 rounded-lg border shadow-sm flex items-center gap-2">
              <span className="font-semibold text-foreground">{owners.length}</span> {t('owners found')}
              {filterState.employeeId && (
                <Badge variant="secondary" className="font-normal ms-2">
                  {t('Filtered by Employee')}
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-6 space-y-3">
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

          {/* Bulk Actions Bar */}
          <div className="bg-card border rounded-xl p-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={owners.length > 0 && selectedOwners.length === owners.length}
                onCheckedChange={toggleSelectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="cursor-pointer font-medium">
                {t('Select All')}
              </Label>
              {selectedOwners.length > 0 && (
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  {t('Selected')} {selectedOwners.length} {t('Owner')}
                </span>
              )}
            </div>

            {selectedOwners.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOwners([])}
                  className="w-full sm:w-auto"
                >
                  {t('Clear Selection')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsReassignModalOpen(true)}
                  className="w-full sm:w-auto gap-2"
                >
                  <Users className="h-4 w-4" />
                  {t('Reassign Selected')}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {owners.length === 0 && (
              <div className="col-span-full py-24 text-center text-muted-foreground bg-card rounded-2xl border border-dashed">
                <User className="h-14 w-14 mx-auto opacity-20 mb-4 text-primary" />
                <p className="text-lg font-medium text-foreground">{t('No owners found')}</p>
                <p className="text-sm mt-1">{t('Adjust your filters or add a new owner.')}</p>
              </div>
            )}

            {owners.map(owner => (
              <OwnerCard
                key={owner.id}
                owner={owner}
                employees={employees}
                companyId={company?.id}
                isSelected={selectedOwners.includes(owner.id)}
                onToggleSelect={toggleSelectOwner}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onClick={openDetailModal}
              />
            ))}
          </div>

          <OwnerDetailModal
            owner={activeOwner}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              if (filterState.statusId) fetchData();
            }}
          />

          <EmployeeReassignmentModal
            isOpen={isReassignModalOpen}
            onClose={() => setIsReassignModalOpen(false)}
            selectedOwnerIds={selectedOwners}
            onConfirm={handleBulkReassign}
            isProcessing={isReassigning}
          />
        </div>
      </main>
    </>
  );
};

export default OwnersPage;
