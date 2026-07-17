'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ListPlus, CalendarPlus as CalendarIcon, Clock, Loader2, ShieldAlert, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useStatusUpdate } from '@/hooks/useStatusUpdate';

const PROPERTY_STATUS_OPTIONS = ['Available', 'Sold', 'Rented', 'Hold', 'Deal Completed'];

type EntityType = 'client' | 'owner' | 'property';

interface StatusUpdateEntity {
  id: string;
  employee_id?: string;
  assigned_employee_id?: string;
}

interface StatusUpdateModalProps {
  entityType: EntityType;
  entityData: StatusUpdateEntity;
  statuses?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

interface StatusForm {
  status_id: string;
  status_name: string;
  note: string;
  follow_up_date: Date | null;
  follow_up_time: string;
}

const StatusUpdateModal = ({ entityType, entityData, statuses = [], onSuccess }: StatusUpdateModalProps) => {
  const { t } = useTranslation();
  const { currentUser } = useCompanyAuth();
  const { canUpdate, updateStatus, isLoading } = useStatusUpdate();

  const [form, setForm] = useState<StatusForm>({
    status_id: '',
    status_name: '',
    note: '',
    follow_up_date: null,
    follow_up_time: ''
  });

  const hasPermission = canUpdate(entityType, entityData);

  if (!hasPermission) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center flex flex-col items-center justify-center">
        <ShieldAlert className="h-10 w-10 text-destructive/60 mb-3" />
        <h4 className="text-destructive font-semibold text-base mb-1">
          {t('You cannot update the status of this item - it is not assigned to you.')}
        </h4>
        <p className="text-sm text-destructive/80">
          {t('Only assigned agents or administrators can add status updates.')}
        </p>
      </div>
    );
  }

  const handleSubmit = async () => {
    // Validation
    if (entityType === 'property' && !form.status_name) {
      toast.error(t('Please select a status.'));
      return;
    }
    if ((entityType === 'client' || entityType === 'owner') && !form.status_id) {
      toast.error(t('Please select a status.'));
      return;
    }

    try {
      // Find status name for relations if needed
      let statusName = form.status_name;
      if (form.status_id && entityType !== 'property') {
        const found = statuses.find(s => s.id === form.status_id);
        if (found) statusName = found.name;
      }

      const updatePayload = {
        ...form,
        status_name: statusName,
        follow_up_date: form.follow_up_date ? form.follow_up_date.toISOString() : null
      };

      console.log(`--- DEBUG: StatusUpdateModal preparing payload for ${entityType} ---`);
      console.log('Payload:', JSON.stringify(updatePayload, null, 2));

      await updateStatus(entityType, entityData, updatePayload);

      toast.success(t('Status updated successfully'));
      setForm({ status_id: '', status_name: '', note: '', follow_up_date: null, follow_up_time: '' });
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4 bg-muted/30 rounded-xl p-5 border border-border/50 h-fit">
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-1">
        <h4 className="text-base font-semibold flex items-center gap-2 font-outfit">
          <ListPlus className="h-4 w-4 text-primary" /> {t('New Update')}
        </h4>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background px-2 py-1 rounded-md border shadow-sm">
          <User className="h-3 w-3" />
          <span className="font-medium truncate max-w-[120px]">{currentUser?.name}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('Status')} *</Label>
          
          {entityType === 'property' ? (
            <Select value={form.status_name} onValueChange={v => setForm({...form, status_name: v})}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={t('Select Status...')} /></SelectTrigger>
              <SelectContent>
                {PROPERTY_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{t(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Select value={form.status_id} onValueChange={v => setForm({...form, status_id: v})}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={statuses?.length === 0 ? t("No statuses available") : t("Select Status...")} />
              </SelectTrigger>
              <SelectContent>
                {statuses?.length === 0 ? (
                  <SelectItem value="none" disabled>{t('No statuses configured')}</SelectItem>
                ) : (
                  statuses?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Date/Time pickers primarily relevant for clients, but useful generally */}
        {entityType === 'client' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('Follow-up Date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background px-3 text-xs",
                      !form.follow_up_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {form.follow_up_date ? format(form.follow_up_date, "MMM d, yyyy") : <span className="truncate">{t('Pick date')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.follow_up_date ?? undefined}
                    onSelect={(date) => setForm({...form, follow_up_date: date ?? null})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('Follow-up Time')}</Label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  type="time" 
                  value={form.follow_up_time} 
                  onChange={e => setForm({...form, follow_up_time: e.target.value})}
                  className="pl-8 rtl:pr-8 rtl:pl-3 text-xs bg-background"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-xs text-muted-foreground">{t('Interaction Note')}</Label>
            <span className="text-[10px] text-muted-foreground">{form.note.length}/300</span>
          </div>
          <Textarea 
            placeholder={t('Enter details about this update...')} 
            maxLength={300}
            value={form.note}
            onChange={e => setForm({...form, note: e.target.value})}
            className="bg-background min-h-[100px] resize-none text-sm"
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full mt-2" 
          disabled={isLoading || (entityType !== 'property' && statuses?.length === 0)}
        >
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('Saving...')}</> : t('Save Status Update')}
        </Button>
      </div>
    </div>
  );
};

export default StatusUpdateModal;