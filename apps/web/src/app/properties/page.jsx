'use client';

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import CompanyAdminHeader from '@/components/CompanyAdminHeader.jsx';
import PropertyCard from '@/components/PropertyCard.jsx';
import PropertyDetailModal from '@/components/PropertyDetailModal.jsx';
import DealCompletedModal from '@/components/DealCompletedModal.jsx';
import FilterPanel from '@/components/FilterPanel.jsx';
import FilterChips from '@/components/FilterChips.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Home, Key, Trash2, Filter, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
const STATUS_OPTIONS = ['Available', 'Sold', 'Rented', 'Hold', 'Deal Completed'];

const PropertiesPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const [properties, setProperties] = useState([]);

  const [types, setTypes] = useState([]);
  const [owners, setOwners] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [areasDistricts, setAreasDistricts] = useState([]);
  const [allAreasDistricts, setAllAreasDistricts] = useState([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);

  const [activeTab, setActiveTab] = useState('Rent');
  const [viewProperty, setViewProperty] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilters, setPriceFilters] = useState({ minPrice: '', maxPrice: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState({
    statusId: null,
    areas: [],
    createdFromDate: null,
    createdToDate: null,
    updatedFromDate: null,
    updatedToDate: null
  });
  const [statusFilter, setStatusFilter] = useState('All');

  const [openForm, setOpenForm] = useState(false);
  const [dealProperty, setDealProperty] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [imagesFiles, setImagesFiles] = useState([]);

  const [formData, setFormData] = useState({
    listing_type: 'Rent', type: '', land_area: '', building_area: '',
    emirate: 'Dubai', area_district: '', area: '', owner_id: '', price: '', commission_percentage: '',
    employee_id: currentUser?.role === 'company_employee' ? currentUser.id : '', title: '', description: '', status: 'Available',
    advertising_permit_number: ''
  });

  const propertyStatuses = STATUS_OPTIONS.map(s => ({ id: s, name: t(s) }));

  const fetchData = async () => {
    if (!company?.id || !currentUser?.id) return;
    try {
      let filterStr = `company_id = "${company.id}"`;

      // Strict data filtering based on employee role
      if (currentUser.role === 'company_employee') {
        filterStr += ` && employee_id = "${currentUser.id}"`;
      }

      if (statusFilter && statusFilter !== 'All') {
        filterStr += ` && status = "${statusFilter}"`;
      }

      if (filterState.areas && filterState.areas.length > 0) {
        const areaFilterStr = filterState.areas.map(id => `area_district = "${id}"`).join(' || ');
        filterStr += ` && (${areaFilterStr})`;
      }

      if (filterState.createdFromDate) {
        const d = new Date(filterState.createdFromDate); d.setHours(0,0,0,0);
        filterStr += ` && created >= "${d.toISOString().replace('T', ' ')}"`;
      }
      if (filterState.createdToDate) {
        const d = new Date(filterState.createdToDate); d.setHours(23,59,59,999);
        filterStr += ` && created <= "${d.toISOString().replace('T', ' ')}"`;
      }
      if (filterState.updatedFromDate) {
        const d = new Date(filterState.updatedFromDate); d.setHours(0,0,0,0);
        filterStr += ` && updated >= "${d.toISOString().replace('T', ' ')}"`;
      }
      if (filterState.updatedToDate) {
        const d = new Date(filterState.updatedToDate); d.setHours(23,59,59,999);
        filterStr += ` && updated <= "${d.toISOString().replace('T', ' ')}"`;
      }

      const [props, typ, own, emp, allAreas] = await Promise.all([
        pb.collection('properties').getFullList({ filter: filterStr, expand: 'type,employee_id,area_district,owner_id', sort: '-created', $autoCancel: false }),
        pb.collection('property_types').getFullList({ filter: `company_id = "${company.id}"`, $autoCancel: false }),
        pb.collection('owners').getFullList({ filter: `company_id = "${company.id}"`, $autoCancel: false }),
        pb.collection('company_employees').getFullList({ filter: `companyId = "${company.id}"`, $autoCancel: false }),
        pb.collection('areas_districts').getFullList({ filter: `company_id = "${company.id}"`, sort: 'name', $autoCancel: false })
      ]);

      const processedProps = props.map(p => ({
        ...p,
        status: p.status || 'Available'
      }));

      setProperties(processedProps);
      setTypes(typ);
      setOwners(own);
      setEmployees(emp);
      setAllAreasDistricts(allAreas);
    } catch (err) {
      toast.error(t('Failed to load data.'));
    }
  };

  useEffect(() => {
    fetchData();
  }, [company?.id, currentUser?.id, statusFilter, filterState, t]);

  const fetchAreas = async (emirate) => {
    if (!company?.id || !emirate) return;
    setIsLoadingAreas(true);
    try {
      const res = await pb.collection('areas_districts').getList(1, 50, {
        filter: `company_id="${company.id}" && emirate="${emirate}"`,
        $autoCancel: false,
        sort: 'name'
      });
      setAreasDistricts(res.items);
    } catch (err) {
      console.error(err);
      toast.error(t('Failed to load areas for selected emirate.'));
    } finally {
      setIsLoadingAreas(false);
    }
  };

  useEffect(() => {
    if (openForm && formData.emirate) {
      fetchAreas(formData.emirate);
    }
  }, [openForm, formData.emirate]);

  const handleEmirateChange = (newEmirate) => {
    setFormData(prev => ({
      ...prev,
      emirate: newEmirate,
      area_district: ''
    }));
  };

  const handleRemoveFilter = (key, valueToRemove) => {
    setFilterState(prev => {
      const newState = { ...prev };
      if (key === 'areas' && valueToRemove) {
        newState.areas = newState.areas.filter(id => id !== valueToRemove);
      } else {
        newState[key] = null;
      }
      return newState;
    });
    if (key === 'statusId') {
      setStatusFilter('All');
    }
  };

  const generateCode = async (listingType) => {
    const typePrefix = listingType === 'Sale' ? 'S' : 'R';
    const prefix = `${company.companyCode}-${typePrefix}-`;
    const records = await pb.collection('properties').getFullList({
        filter: `company_id = "${company.id}" && code ~ "${prefix}"`,
        sort: '-code',
        $autoCancel: false
    });
    if (records.length === 0) return `${prefix}0001`;
    const lastCode = records[0].code;
    const lastNum = parseInt(lastCode.split('-').pop() || '0', 10);
    return `${prefix}${(lastNum + 1).toString().padStart(4, '0')}`;
  };

  const handleSave = async () => {
    if (!formData.title || !formData.type || !formData.owner_id || !formData.price || !formData.employee_id) {
      toast.error(t('Please fill all required fields.'));
      return;
    }

    setIsSubmitting(true);
    try {
      let code = editId ? properties.find(p => p.id === editId)?.code : await generateCode(formData.listing_type);

      const payload = new FormData();
      payload.append('code', code);
      payload.append('company_id', company.id);
      payload.append('listing_type', formData.listing_type);
      payload.append('type', formData.type);
      payload.append('emirate', formData.emirate);
      payload.append('area_district', formData.area_district || '');
      payload.append('area', formData.area || '');
      payload.append('owner_id', formData.owner_id);
      payload.append('title', formData.title);
      payload.append('description', formData.description || '');
      payload.append('status', formData.status || 'Available');
      payload.append('price', Number(formData.price));
      payload.append('advertising_permit_number', formData.advertising_permit_number || '');

      // Auto-assign to current user if employee adding new record
      const finalEmployeeId = (!editId && currentUser?.role === 'company_employee') ? currentUser.id : formData.employee_id;
      payload.append('employee_id', finalEmployeeId);

      if(formData.land_area) payload.append('land_area', Number(formData.land_area));
      if(formData.building_area) payload.append('building_area', Number(formData.building_area));
      if(formData.commission_percentage) payload.append('commission_percentage', Number(formData.commission_percentage));

      Array.from(imagesFiles).forEach((file) => {
        payload.append('images', file);
      });

      if (editId) {
        let updatedProp;
        try {
          updatedProp = await pb.collection('properties').update(editId, payload, { $autoCancel: false });
        } catch (updateErr) {
          throw updateErr;
        }

        if (updatedProp && updatedProp.id) {
          toast.success(t('Property updated.'));
          setOpenForm(false);
          resetForm();
          fetchData();
        }
      } else {
        let newProp;
        try {
          newProp = await pb.collection('properties').create(payload, { $autoCancel: false });
        } catch (createErr) {
          throw createErr;
        }

        if (newProp && newProp.id) {
          try {
            await pb.collection('property_status_history').create({
              property_id: newProp.id,
              status: formData.status || 'Available',
              note: 'Initial property creation',
              created_by: currentUser.id,
              created_by_name: currentUser.name || currentUser.firstName || currentUser.email || 'Unknown User',
              company_id: company.id
            }, { $autoCancel: false });
          } catch (historyErr) {
            console.warn("Secondary operation failed (status history):", historyErr);
          }

          toast.success(t('Property added successfully'));
          setOpenForm(false);
          resetForm();
          fetchData();
        }
      }
    } catch (err) {
      console.error("PocketBase Property Save Error details:", err.response || err);
      toast.error(err.response?.message || err.message || t('Error saving property.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if(!editId || !window.confirm(t('Delete this property? This cannot be undone.'))) return;
    try {
      await pb.collection('properties').delete(editId, { $autoCancel: false });
      toast.success(t('Property deleted.'));
      setOpenForm(false);
      fetchData();
    } catch (e) {
      toast.error(t('Error deleting property.'));
    }
  };

  const handleQuickStatusChange = async (propertyId, newStatus) => {
    if (newStatus === 'Deal Completed') {
      const prop = properties.find(p => p.id === propertyId);
      setDealProperty(prop);
      return;
    }

    try {
      const updatedProp = await pb.collection('properties').update(propertyId, { status: newStatus }, { $autoCancel: false });
      if (updatedProp && updatedProp.id) {
        try {
          await pb.collection('property_status_history').create({
            property_id: propertyId,
            status: newStatus,
            note: 'Quick status update from list view',
            created_by: currentUser.id,
            created_by_name: currentUser.name || currentUser.firstName || currentUser.email || 'Unknown User',
            company_id: company.id
          }, { $autoCancel: false });
        } catch (historyErr) {
          console.warn("Secondary operation failed (status history):", historyErr);
        }

        toast.success(t('Property status updated successfully'));
        fetchData();
      }
    } catch (err) {
      console.error("PocketBase Status Quick Update Error:", err.response || err);
      toast.error(err.response?.message || err.message || t('Failed to update status'));
    }
  };

  const openEditForm = (p = null) => {
    if (p) {
      setEditId(p.id);
      setFormData({
        listing_type: p.listing_type, type: p.type, land_area: p.land_area || '',
        building_area: p.building_area || '', emirate: p.emirate || 'Dubai',
        area_district: p.area_district || '', area: p.area || '',
        owner_id: p.owner_id, price: p.price, commission_percentage: p.commission_percentage || '',
        employee_id: p.employee_id, title: p.title, description: p.description, status: p.status || 'Available',
        advertising_permit_number: p.advertising_permit_number || ''
      });
      setImagesFiles([]);
    } else {
      resetForm();
      setFormData(prev => ({...prev, listing_type: activeTab}));
    }
    setOpenForm(true);
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      listing_type: 'Rent', type: '', land_area: '', building_area: '',
      emirate: 'Dubai', area_district: '', area: '', owner_id: '', price: '', commission_percentage: '',
      employee_id: currentUser?.role === 'company_employee' ? currentUser.id : '', title: '', description: '', status: 'Available',
      advertising_permit_number: ''
    });
    setImagesFiles([]);
    setAreasDistricts([]);
  };

  const renderGrid = (listType) => {
    const filtered = properties.filter(p => {
      // 1. Listing Type Match
      if (p.listing_type !== listType) return false;

      // 2. Real-time Search by Code
      if (searchQuery && !p.code?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 3. Real-time Price Filtering
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

    if (filtered.length === 0) {
      return (
        <div className="py-20 text-center text-muted-foreground bg-card rounded-2xl border border-dashed flex flex-col items-center">
          {listType === 'Rent' ? <Key className="h-12 w-12 opacity-20 mb-4 text-primary" /> : <Home className="h-12 w-12 opacity-20 mb-4 text-primary" />}
          <p className="text-lg font-medium text-foreground">{t(`No ${listType} Properties found`)}</p>
          <p className="text-sm mt-1">{t('Adjust your filters or click "Add Property" to create a new listing.')}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(p => (
          <PropertyCard
            key={p.id}
            property={p}
            onEdit={openEditForm}
            onView={setViewProperty}
            onStatusChange={handleQuickStatusChange}
          />
        ))}
      </div>
    );
  };

  const isEmployee = currentUser?.role === 'company_employee';

  return (
    <>
      <Helmet>
        <title>{t('Properties')} | MANDERA CRM</title>
      </Helmet>
      <CompanyAdminHeader />

      <main className="min-h-[calc(100vh-80px)] bg-muted/20 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-outfit">{t('Properties')}</h1>
              <p className="text-muted-foreground mt-1">{t('Manage your complete real estate portfolio.')}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                    placeholder={t('Search code (e.g. COMPO01)...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-background w-full"
                 />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`gap-2 h-9 w-full sm:w-auto ${showFilters ? 'bg-muted' : 'bg-background'}`}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? t('Hide Filters') : t('Filters')}
              </Button>
              <Button onClick={() => openEditForm()} className="w-full sm:w-auto gap-2 shadow-sm rounded-xl h-9 shrink-0">
                 <Plus className="h-4 w-4" /> {t('Add Property')}
              </Button>
            </div>
          </div>

          <div className="mb-6 space-y-3">
            {showFilters && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                 <FilterPanel
                    statuses={propertyStatuses}
                    areas={allAreasDistricts}
                    showPriceFilters={true}
                    onPriceChange={setPriceFilters}
                    onApplyFilters={(filters) => {
                       setFilterState(filters);
                       setStatusFilter(filters.statusId || 'All');
                    }}
                    onClearFilters={() => {
                       setFilterState({
                         statusId: null,
                         areas: [],
                         createdFromDate: null,
                         createdToDate: null,
                         updatedFromDate: null,
                         updatedToDate: null
                       });
                       setStatusFilter('All');
                       setPriceFilters({ minPrice: '', maxPrice: '' });
                    }}
                 />
              </div>
            )}

            <FilterChips
               activeFilters={filterState}
               statuses={propertyStatuses}
               areas={allAreasDistricts}
               onRemoveFilter={handleRemoveFilter}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted p-1 rounded-xl">
              <TabsTrigger value="Rent" className="rounded-lg px-8"><Key className="w-4 h-4 mr-2" /> {t('For Rent')}</TabsTrigger>
              <TabsTrigger value="Sale" className="rounded-lg px-8"><Home className="w-4 h-4 mr-2" /> {t('For Sale')}</TabsTrigger>
            </TabsList>

            <TabsContent value="Rent" className="mt-0 outline-none">
              {renderGrid('Rent')}
            </TabsContent>

            <TabsContent value="Sale" className="mt-0 outline-none">
              {renderGrid('Sale')}
            </TabsContent>
          </Tabs>

          <Dialog open={openForm} onOpenChange={(val) => { setOpenForm(val); if (!val) resetForm(); }}>
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-background">
              <DialogHeader className="p-6 border-b bg-muted/30 flex flex-row items-center justify-between">
                <DialogTitle className="text-xl font-outfit">
                  {editId ? `${t('Edit Property')} (${properties.find(p=>p.id===editId)?.code})` : t('Add Property')}
                </DialogTitle>
                {editId && (
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 -mr-2" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </DialogHeader>

              <Tabs defaultValue="basic" className="flex flex-col h-[75vh]">
                <div className="px-6 pt-4 border-b">
                  <TabsList className="grid w-full grid-cols-2 max-w-sm">
                    <TabsTrigger value="basic">{t('Basic Info')}</TabsTrigger>
                    <TabsTrigger value="details">{t('Details & Media')}</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <TabsContent value="basic" className="mt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2 col-span-1 md:col-span-2 bg-muted/40 p-4 rounded-xl border border-border/50">
                        <Label className="mb-2 block">{t('Listing Type')} *</Label>
                        <RadioGroup
                          value={formData.listing_type}
                          onValueChange={v => setFormData({...formData, listing_type: v})}
                          className="flex space-x-6"
                          disabled={!!editId}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Sale" id="r-sale" />
                            <Label htmlFor="r-sale" className="font-normal cursor-pointer">{t('For Sale')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Rent" id="r-rent" />
                            <Label htmlFor="r-rent" className="font-normal cursor-pointer">{t('For Rent')}</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('Property Type')} *</Label>
                        <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder={t('Select Type')} /></SelectTrigger>
                          <SelectContent>
                            {types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('Status')}</Label>
                        <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder={t('Select Status')} /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{t(s)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label>{t('Advertising Permit Number')} <span className="text-muted-foreground font-normal">({t('Optional')})</span></Label>
                        <Input
                          value={formData.advertising_permit_number}
                          onChange={e => setFormData({...formData, advertising_permit_number: e.target.value})}
                          placeholder={t('e.g. 1234567890')}
                        />
                      </div>

                      <div className="space-y-2 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl border border-border/50 bg-card">
                        <div className="space-y-2">
                          <Label>{t('Emirate')} *</Label>
                          <Select value={formData.emirate} onValueChange={handleEmirateChange}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder={t('Select Emirate')} /></SelectTrigger>
                            <SelectContent>
                              {EMIRATES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            {t('Area / District')}
                            {isLoadingAreas && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                          </Label>
                          <Select value={formData.area_district} onValueChange={v => setFormData({...formData, area_district: v})}>
                            <SelectTrigger className="bg-background" disabled={isLoadingAreas || !formData.emirate}>
                              <SelectValue placeholder={areasDistricts.length === 0 && !isLoadingAreas ? t('No areas available') : t('Select Area')} />
                            </SelectTrigger>
                            <SelectContent>
                              {areasDistricts.length === 0 ? (
                                <SelectItem value="none" disabled>{t('No configured areas')}</SelectItem>
                              ) : (
                                areasDistricts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 col-span-1 md:col-span-2">
                          <Label>{t('Specific Address/Sub-area')} <span className="text-muted-foreground font-normal">({t('Optional')})</span></Label>
                          <Input value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} placeholder={t('e.g. Building 4, Street 12')} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('Land Area')} (sqft)</Label>
                        <Input type="number" value={formData.land_area} onChange={e => setFormData({...formData, land_area: e.target.value})} />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('Building Area (sqft)')}</Label>
                        <Input type="number" value={formData.building_area} onChange={e => setFormData({...formData, building_area: e.target.value})} />
                      </div>

                      <div className="space-y-2 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t">
                        <div className="space-y-2">
                          <Label>{t('Owner')} *</Label>
                          <Select value={formData.owner_id} onValueChange={v => setFormData({...formData, owner_id: v})}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder={t('Select Owner')} /></SelectTrigger>
                            <SelectContent>
                              {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.name} ({o.phone})</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('Assigned Agent')} *</Label>
                          <Select
                            value={formData.employee_id}
                            onValueChange={v => setFormData({...formData, employee_id: v})}
                            disabled={isEmployee}
                          >
                            <SelectTrigger className="bg-background"><SelectValue placeholder={t('Select Agent')} /></SelectTrigger>
                            <SelectContent>
                              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name || e.email}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('Price (AED)')} *</Label>
                          <Input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="font-semibold text-primary" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('Commission %')}</Label>
                          <Input type="number" step="0.01" value={formData.commission_percentage} onChange={e => setFormData({...formData, commission_percentage: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="mt-0 space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t('Listing Title')} *</Label>
                        <span className="text-xs text-muted-foreground">{formData.title?.length || 0}/150</span>
                      </div>
                      <Input maxLength={150} required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="font-medium" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t('Description')}</Label>
                        <span className="text-xs text-muted-foreground">{formData.description?.length || 0}/1000</span>
                      </div>
                      <Textarea maxLength={1000} className="min-h-[160px] resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div className="space-y-2 bg-muted/40 p-4 rounded-xl border border-border/50">
                      <Label>{t('Property Images (Max 12)')}</Label>
                      <div className="mt-2">
                        <Input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            if(e.target.files.length > 12) {
                              toast.warning(t('Maximum 12 images allowed.'));
                              e.target.value = '';
                              setImagesFiles([]);
                            } else {
                              setImagesFiles(e.target.files);
                            }
                          }}
                          className="bg-background file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:mr-4 file:px-4 file:py-1 hover:file:bg-primary/20 transition-colors"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {imagesFiles.length > 0 ? `${imagesFiles.length} ${t('file(s) selected for upload.')}` : t('Select up to 12 images. High quality (870x600px recommended).')}
                      </p>
                    </div>
                  </TabsContent>
                </div>

                <div className="p-4 border-t bg-card flex justify-end">
                  <Button onClick={handleSave} disabled={isSubmitting} size="lg" className="w-full sm:w-auto px-8 rounded-xl">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('Saving...')}</> : t('Save Property')}
                  </Button>
                </div>
              </Tabs>
            </DialogContent>
          </Dialog>

          <PropertyDetailModal
            property={viewProperty}
            isOpen={!!viewProperty}
            onClose={() => setViewProperty(null)}
            onStatusUpdated={fetchData}
          />

          <DealCompletedModal
            isOpen={!!dealProperty}
            onClose={() => setDealProperty(null)}
            property={dealProperty}
            onSuccess={() => {
              setDealProperty(null);
              fetchData();
            }}
          />

        </div>
      </main>
    </>
  );
};

export default PropertiesPage;
