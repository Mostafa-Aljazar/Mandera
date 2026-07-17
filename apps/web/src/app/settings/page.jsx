'use client';

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import CompanyAdminHeader from '@/components/CompanyAdminHeader.jsx';
import OwnerStatusesTab from '@/components/OwnerStatusesTab.jsx';
import AreasDistrictsTab from '@/components/AreasDistrictsTab.jsx';
import MarketingChannelsTab from '@/components/MarketingChannelsTab.jsx';
import EmployeeDeletionDialog from '@/components/EmployeeDeletionDialog.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Trash2, Plus, Users, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SettingsPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const isSuperAdmin = currentUser?.role === 'company_super_admin';

  const [propertyTypes, setPropertyTypes] = useState([]);
  const [clientStatuses, setClientStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [openPropertyType, setOpenPropertyType] = useState(false);
  const [openClientStatus, setOpenClientStatus] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', priority_order: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline editing state for client statuses
  const [editingPriorityId, setEditingPriorityId] = useState(null);
  const [editingPriorityValue, setEditingPriorityValue] = useState('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  // Employee Deletion State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, [company?.id]);

  const fetchData = async () => {
    if (!company?.id) return;
    try {
      const [ptData, csData, empData] = await Promise.all([
        pb.collection('property_types').getFullList({ filter: `company_id = "${company.id}"`, $autoCancel: false }),
        pb.collection('client_statuses').getFullList({ filter: `company_id = "${company.id}"`, sort: 'priority_order,created', $autoCancel: false }),
        pb.collection('company_employees').getFullList({ filter: `companyId = "${company.id}"`, $autoCancel: false })
      ]);
      setPropertyTypes(ptData);
      setClientStatuses(csData);
      setEmployees(empData);
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to load settings data.'));
    }
  };

  const handleSave = async (collection, setOpen) => {
    if (!formData.name.trim()) return;

    const payload = { name: formData.name, company_id: company.id };

    if (collection === 'client_statuses') {
      if (!formData.priority_order || formData.priority_order < 1) {
        toast.error(t('Priority order must be a positive number.'));
        return;
      }
      payload.priority_order = parseInt(formData.priority_order, 10);
    }

    setIsSubmitting(true);
    try {
      if (editItem) {
        await pb.collection(collection).update(editItem.id, payload, { $autoCancel: false });
        toast.success(t('Updated successfully.'));
      } else {
        await pb.collection(collection).create(payload, { $autoCancel: false });
        toast.success(t('Created successfully.'));
      }
      setOpen(false);
      setEditItem(null);
      setFormData({ name: '', priority_order: 1 });
      fetchData();
    } catch (error) {
      toast.error(error.message || t('An error occurred.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (collection, id) => {
    if (!window.confirm(t('Are you sure you want to delete this item?'))) return;
    try {
      await pb.collection(collection).delete(id, { $autoCancel: false });
      toast.success(t('Deleted successfully.'));
      fetchData();
    } catch (error) {
      toast.error(t('Failed to delete. It might be in use.'));
    }
  };

  const handleInlinePrioritySave = async (id) => {
    const newPriority = parseInt(editingPriorityValue, 10);
    if (isNaN(newPriority) || newPriority < 1) {
      toast.error(t('Priority must be a positive number.'));
      setEditingPriorityId(null);
      return;
    }

    setIsUpdatingPriority(true);
    try {
      await pb.collection('client_statuses').update(id, { priority_order: newPriority }, { $autoCancel: false });
      toast.success(t('Priority updated.'));
      setEditingPriorityId(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to update priority.'));
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const openAddClientStatus = () => {
    const nextPriority = clientStatuses.length > 0
      ? Math.max(...clientStatuses.map(s => s.priority_order || 0)) + 1
      : 1;
    setEditItem(null);
    setFormData({ name: '', priority_order: nextPriority });
    setOpenClientStatus(true);
  };

  const initiateEmployeeDeletion = (employee) => {
    if (employee.id === currentUser.id) {
      toast.error(t('You cannot delete your own account.'));
      return;
    }
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleEmployeeDeletedSuccess = () => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeToDelete?.id));
    setIsDeleteDialogOpen(false);
    setEmployeeToDelete(null);
    fetchData();
  };

  const renderTable = (data, collection, setOpen) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t('Name')}</TableHead>
            <TableHead className="w-[150px] text-right">{t('Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                {t('No items found. Create one to get started.')}
              </TableCell>
            </TableRow>
          ) : (
            data.map(item => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditItem(item); setFormData({ name: item.name }); setOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(collection, item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderClientStatusTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[100px]">{t('Priority')}</TableHead>
            <TableHead>{t('Name')}</TableHead>
            <TableHead className="w-[150px] text-right">{t('Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientStatuses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                {t('No items found. Create one to get started.')}
              </TableCell>
            </TableRow>
          ) : (
            clientStatuses.map(item => (
              <TableRow key={item.id} className="hover:bg-muted/30">
                <TableCell>
                  {editingPriorityId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        className="w-16 h-8 px-2 py-1"
                        value={editingPriorityValue}
                        onChange={(e) => setEditingPriorityValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInlinePrioritySave(item.id)}
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary"
                        onClick={() => handleInlinePrioritySave(item.id)}
                        disabled={isUpdatingPriority}
                      >
                        {isUpdatingPriority ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-muted px-2 py-1 rounded inline-block transition-colors"
                      onClick={() => {
                        setEditingPriorityId(item.id);
                        setEditingPriorityValue(item.priority_order || 1);
                      }}
                      title={t('Click to edit priority')}
                    >
                      <span className="font-mono font-medium text-muted-foreground">#{item.priority_order || '-'}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setEditItem(item); setFormData({ name: item.name, priority_order: item.priority_order || 1 }); setOpenClientStatus(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete('client_statuses', item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{t('Settings')} | MANDERA CRM</title>
      </Helmet>
      <CompanyAdminHeader />

      <main className="min-h-[calc(100vh-80px)] bg-muted/30 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-outfit">{t('System Settings')}</h1>
            <p className="text-muted-foreground mt-1">{t('Configure global properties, statuses, locations and employees.')}</p>
          </div>

          <Tabs defaultValue="employees" className="space-y-6">
            <div className="overflow-x-auto pb-2 -mb-2 hide-scrollbar">
              <TabsList className="grid w-full min-w-[900px] grid-cols-6 bg-muted/50 p-1 h-11">
                <TabsTrigger value="employees" className="text-sm">{t('Employees')}</TabsTrigger>
                <TabsTrigger value="property-types" className="text-sm">{t('Property Types')}</TabsTrigger>
                <TabsTrigger value="client-statuses" className="text-sm">{t('Client Status')}</TabsTrigger>
                <TabsTrigger value="owner-statuses" className="text-sm">{t('Owner Status')}</TabsTrigger>
                <TabsTrigger value="areas-districts" className="text-sm">{t('Areas')}</TabsTrigger>
                <TabsTrigger value="marketing-channels" className="text-sm">{t('Marketing')}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="employees" className="mt-4 outline-none">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> {t('Manage Employees')}
                    </CardTitle>
                    <CardDescription>{t('View and manage company employees.')}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>{t('Name')}</TableHead>
                          <TableHead>{t('Email')}</TableHead>
                          <TableHead>{t('Role')}</TableHead>
                          <TableHead className="w-[120px] text-right">{t('Actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              {t('Loading...')}
                            </TableCell>
                          </TableRow>
                        ) : (
                          employees.map(emp => (
                            <TableRow key={emp.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{emp.name || t('Unnamed')}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{emp.email}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                                  {emp.role === 'company_super_admin' ? t('Admin') : t('Employee')}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {isSuperAdmin && emp.id !== currentUser.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => initiateEmployeeDeletion(emp)}
                                    title={t('Delete Employee')}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="property-types" className="mt-4 outline-none">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t('Property Types')}</CardTitle>
                    <CardDescription>{t('Manage types of properties (e.g. Villa, Apartment).')}</CardDescription>
                  </div>
                  <Dialog open={openPropertyType} onOpenChange={(open) => { setOpenPropertyType(open); if(!open) { setEditItem(null); setFormData({name:''}); }}}>
                    <DialogTrigger asChild>
                      <Button className="gap-2"><Plus className="h-4 w-4" /> {t('Add Type')}</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editItem ? t('Edit') : t('Add')} {t('Property Type')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t('Name')}</Label>
                          <Input value={formData.name} onChange={e => setFormData({name: e.target.value})} placeholder={t('e.g. Villa')} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button disabled={isSubmitting} onClick={() => handleSave('property_types', setOpenPropertyType)}>
                          {isSubmitting ? t('Saving...') : t('Save')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {renderTable(propertyTypes, 'property_types', setOpenPropertyType)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="client-statuses" className="mt-4 outline-none">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{t('Client Statuses')}</CardTitle>
                    <CardDescription>{t('Manage stages for client pipeline.')}</CardDescription>
                  </div>
                  <Dialog open={openClientStatus} onOpenChange={(open) => { setOpenClientStatus(open); if(!open) { setEditItem(null); setFormData({name:'', priority_order: 1}); }}}>
                    <DialogTrigger asChild>
                      <Button onClick={openAddClientStatus} className="gap-2"><Plus className="h-4 w-4" /> {t('Add Status')}</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editItem ? t('Edit') : t('Add')} {t('Client Status')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t('Name')}</Label>
                          <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t('e.g. Hot Lead')} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('Priority Order')}</Label>
                          <Input type="number" min="1" value={formData.priority_order} onChange={e => setFormData({...formData, priority_order: e.target.value})} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button disabled={isSubmitting} onClick={() => handleSave('client_statuses', setOpenClientStatus)}>
                          {isSubmitting ? t('Saving...') : t('Save')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {renderClientStatusTable()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="owner-statuses" className="mt-4 outline-none">
              <OwnerStatusesTab />
            </TabsContent>

            <TabsContent value="areas-districts" className="mt-4 outline-none">
              <AreasDistrictsTab />
            </TabsContent>

            <TabsContent value="marketing-channels" className="mt-4 outline-none">
              <MarketingChannelsTab />
            </TabsContent>

          </Tabs>
        </div>
      </main>

      <EmployeeDeletionDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        employeeToDelete={employeeToDelete}
        onSuccess={handleEmployeeDeletedSuccess}
      />
    </>
  );
};

export default SettingsPage;
