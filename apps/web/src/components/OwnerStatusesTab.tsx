'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Edit2, Trash2, Plus, Loader2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useTranslation } from 'react-i18next';
import type { OwnerStatus } from '../../types/pocketbase.types';

const OwnerStatusesTab = () => {
  const { currentUser, company } = useCompanyAuth();
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<OwnerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState<OwnerStatus | null>(null);

  const [formData, setFormData] = useState({ name: '' });

  const fetchStatuses = async () => {
    const companyId = currentUser?.companyId || company?.id;
    if (!companyId) return;
    setIsLoading(true);
    try {
      const res = await pb.collection('owner_statuses').getList(1, 100, {
        filter: `company_id="${companyId}"`,
        $autoCancel: false,
        sort: '-created'
      });
      setStatuses(res.items as unknown as OwnerStatus[]);
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to load owner statuses.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [currentUser?.companyId, company?.id]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t('Name is required.'));
      return;
    }
    
    setIsSubmitting(true);
    try {
      const companyId = currentUser?.companyId || company?.id;

      const payload = {
        name: String(formData.name).trim(),
        company_id: String(companyId).trim(),
      };

      console.log('--- DEBUG: EXACT REQUEST START ---');
      console.log('Collection: owner_statuses');
      console.log('Endpoint URL:', pb.baseUrl + '/api/collections/owner_statuses/records');
      console.log('Headers Authorization Token:', pb.authStore.token ? `Bearer ${pb.authStore.token.substring(0, 15)}...` : 'No Token Available');
      console.log('Payload Data:', JSON.stringify(payload, null, 2));
      console.log('--- DEBUG: EXACT REQUEST END ---');

      let response;
      if (editItem) {
        response = await pb.collection('owner_statuses').update(String(editItem.id), payload, { $autoCancel: false });
        console.log('--- DEBUG: UPDATE RESPONSE ---', response);
        toast.success(t('Owner status updated successfully.'));
      } else {
        response = await pb.collection('owner_statuses').create(payload, { $autoCancel: false });
        console.log('--- DEBUG: CREATE RESPONSE ---', response);
        toast.success(t('Owner status created successfully.'));
      }
      
      setOpenDialog(false);
      resetForm();
      fetchStatuses();
    } catch (err) {
      const error = err as { status?: number; message?: string; response?: { message?: string; data?: Record<string, unknown> } };
      console.error('--- DEBUG: ERROR START ---');
      console.error('Error Status:', error.status);
      console.error('Error Message:', error.message);
      console.error('Error Response Data (Validation details):', JSON.stringify(error.response?.data, null, 2));
      console.error('Full Error Object:', error);
      console.error('--- DEBUG: ERROR END ---');

      const errorMsg = error.response?.message || error.message || t('An error occurred while saving.');
      const validationDetails = error.response?.data && Object.keys(error.response.data).length > 0
        ? JSON.stringify(error.response.data)
        : '';
        
      toast.error(`${errorMsg} ${validationDetails}`.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this status?'))) return;
    try {
      await pb.collection('owner_statuses').delete(String(id), { $autoCancel: false });
      toast.success(t('Status deleted successfully.'));
      fetchStatuses();
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to delete. This status might be in use.'));
    }
  };

  const resetForm = () => {
    setEditItem(null);
    setFormData({ name: '' });
  };

  const openAdd = () => {
    resetForm();
    setOpenDialog(true);
  };

  const openEdit = (item: OwnerStatus) => {
    setEditItem(item);
    setFormData({
      name: item.name || ''
    });
    setOpenDialog(true);
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>{t('Owner Statuses')}</CardTitle>
          <CardDescription>{t('Manage status labels for property owners.')}</CardDescription>
        </div>
        <Dialog open={openDialog} onOpenChange={(open) => { setOpenDialog(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="gap-2 shrink-0"><Plus className="h-4 w-4" /> {t('Add New Status')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? t('Edit Owner Status') : t('Add Owner Status')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status-name">{t('Name')} <span className="text-destructive">*</span></Label>
                <Input 
                  id="status-name"
                  value={formData.name} 
                  onChange={e => setFormData({ name: e.target.value })} 
                  placeholder={t('e.g. VIP Owner')} 
                  required
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('Saving...')}</> : t('Save Status')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t('Status Name')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-12 text-muted-foreground">
                      {t('No owner statuses configured yet.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  statuses.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
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
        )}
      </CardContent>
    </Card>
  );
};

export default OwnerStatusesTab;