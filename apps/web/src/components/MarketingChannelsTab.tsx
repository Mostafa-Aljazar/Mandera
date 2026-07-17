'use client';

import React, { useState, useEffect } from 'react';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Trash2, Plus, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { MarketingChannelRecord } from '../../types/pocketbase.types';

const MarketingChannelsTab = () => {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();

  const [channels, setChannels] = useState<MarketingChannelRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketingChannelRecord | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, [company?.id]);

  const fetchChannels = async () => {
    if (!company?.id) return;
    try {
      const records = await pb.collection('marketing_channels').getFullList({
        filter: `company_id = "${company.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setChannels(records as unknown as MarketingChannelRecord[]);
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to load marketing channels.'));
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t('Name is required.'));
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        company_id: company!.id
      };
      
      if (editItem) {
        await pb.collection('marketing_channels').update(editItem.id, payload, { $autoCancel: false });
        toast.success(t('Marketing channel updated successfully.'));
      } else {
        await pb.collection('marketing_channels').create(payload, { $autoCancel: false });
        toast.success(t('Marketing channel created successfully.'));
      }
      
      setOpen(false);
      setEditItem(null);
      setFormData({ name: '' });
      fetchChannels();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || t('An error occurred.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this channel?'))) return;
    
    try {
      await pb.collection('marketing_channels').delete(id, { $autoCancel: false });
      toast.success(t('Channel deleted successfully.'));
      fetchChannels();
    } catch (error) {
      console.error(error);
      toast.error(t('Failed to delete. This channel might be in use.'));
    }
  };

  const resetForm = () => {
    setEditItem(null);
    setFormData({ name: '' });
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> {t('Marketing Channels')}
          </CardTitle>
          <CardDescription>
            {t('Manage marketing sources for clients and owners.')}
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}>
              <Plus className="h-4 w-4" /> {t('Add New Channel')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? t('Edit Channel') : t('Add Channel')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('Name')}</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder={t('e.g. Google Ads')} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={isSubmitting} onClick={handleSave}>
                {isSubmitting ? t('Saving...') : t('Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t('Name')}</TableHead>
                <TableHead className="w-[150px] text-right">{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                    {t('No marketing channels configured yet.')}
                  </TableCell>
                </TableRow>
              ) : (
                channels.map(item => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary" 
                          onClick={() => { 
                            setEditItem(item); 
                            setFormData({ name: item.name }); 
                            setOpen(true); 
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                          onClick={() => handleDelete(item.id)}
                        >
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
      </CardContent>
    </Card>
  );
};

export default MarketingChannelsTab;