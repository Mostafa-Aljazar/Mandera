'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  ListPlus,
  CalendarPlus as CalendarIcon,
  Loader2,
  ShieldAlert,
  User,
  Tag,
  StickyNote,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useStatusUpdate } from '@/hooks/useStatusUpdate';
import { StatusUpdateSchema, type TStatusUpdateSchema } from '@/validations/status-update.schema';

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

export default function StatusUpdateModal({ entityType, entityData, statuses = [], onSuccess }: StatusUpdateModalProps) {
  const { t } = useTranslation();
  const { currentUser } = useCompanyAuth();
  const { canUpdate, updateStatus, isLoading } = useStatusUpdate();

  const form = useForm<TStatusUpdateSchema>({
    resolver: zodResolver(StatusUpdateSchema(t, entityType)),
    defaultValues: {
      status_id: '',
      status_name: '',
      note: '',
      follow_up_date: null,
      follow_up_time: ''
    },
  });

  const hasPermission = canUpdate(entityType, entityData);

  if (!hasPermission) {
    return (
      <div className="flex flex-col justify-center items-center bg-card shadow-[var(--shadow-subtle)] p-8 border border-destructive/20 rounded-xl text-center overflow-hidden">
        <div className="flex justify-center items-center bg-destructive/10 mb-4 rounded-full w-14 h-14">
          <ShieldAlert className="w-7 h-7 text-destructive/70" />
        </div>
        <h4 className="mb-1.5 font-semibold text-destructive text-sm">
          {t('You cannot update the status of this item - it is not assigned to you.')}
        </h4>
        <p className="max-w-[260px] text-destructive/70 text-xs leading-relaxed">
          {t('Only assigned agents or administrators can add status updates.')}
        </p>
      </div>
    );
  }

  const handleSubmit = form.handleSubmit(async (formValues) => {
    try {
      let statusName = formValues.status_name;
      if (formValues.status_id && entityType !== 'property') {
        const found = statuses.find(s => s.id === formValues.status_id);
        if (found) statusName = found.name;
      }

      const updatePayload = {
        ...formValues,
        status_name: statusName,
        follow_up_date: formValues.follow_up_date ? new Date(formValues.follow_up_date).toISOString() : null
      };

      await updateStatus(entityType, entityData, updatePayload);

      toast.success(t('Status updated successfully'));
      form.reset({ status_id: '', status_name: '', note: '', follow_up_date: null, follow_up_time: '' });
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error((err as Error).message);
    }
  });

  return (
    <div className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-xl overflow-hidden h-fit">
      {/* Header */}
      <div className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-primary/[0.06] via-muted/30 to-transparent px-5 py-4 border-border/50 border-b">
        <div className="flex items-center gap-2.5">
          <span className="flex justify-center items-center bg-primary/10 rounded-lg w-8 h-8 text-primary">
            <ListPlus className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-outfit font-semibold text-foreground text-sm">
              {t('New Update')}
            </h4>
            <p className="text-muted-foreground text-[11px]">
              {t('Add a status change or note')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-background/80 shadow-sm px-2.5 py-1 border border-border/60 rounded-full text-muted-foreground text-[11px]">
          <User className="w-3 h-3" />
          <span className="font-medium text-foreground/80 truncate max-w-[100px]">
            {currentUser?.name}
          </span>
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-4 p-5">
          {/* Status select */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <Tag className="w-3 h-3" />
              {t('Status')} *
            </Label>

            {entityType === 'property' ? (
              <FormField
                control={form.control}
                name="status_name"
                render={({ field }) => (
                  <FormItem>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background h-10">
                          <SelectValue placeholder={t('Select Status...')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROPERTY_STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{t(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="status_id"
                render={({ field }) => (
                  <FormItem>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background h-10">
                          <SelectValue
                            placeholder={
                              statuses?.length === 0
                                ? t('No statuses available')
                                : t('Select Status...')
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses?.length === 0 ? (
                          <SelectItem value="none" disabled>
                            {t('No statuses configured')}
                          </SelectItem>
                        ) : (
                          statuses?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Follow-up date/time for clients */}
          {entityType === 'client' && (
            <div className="bg-muted/30 p-3.5 border border-border/40 rounded-lg space-y-3">
              <p className="flex items-center gap-1.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">
                <CalendarIcon className="w-3 h-3" />
                {t('Follow-up Schedule')}
              </p>
              <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{t('Follow-up Date')}</Label>
                  <FormField
                    control={form.control}
                    name="follow_up_date"
                    render={({ field }) => (
                      <FormItem>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  'justify-start bg-background px-3 w-full h-9 font-normal text-xs text-start',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="me-2 w-3.5 h-3.5 shrink-0 text-primary/70" />
                                {field.value ? (
                                  <span dir="ltr">{format(field.value, 'MMM d, yyyy')}</span>
                                ) : (
                                  <span className="truncate">{t('Pick date')}</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="p-0 w-auto z-[100]"
                            align="start"
                            sideOffset={4}
                          >
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={(date) => field.onChange(date ?? null)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{t('Follow-up Time')}</Label>
                  <FormField
                    control={form.control}
                    name="follow_up_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="time"
                            dir="ltr"
                            className="bg-background h-9 text-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                    <StickyNote className="w-3 h-3" />
                    {t('Interaction Note')}
                  </Label>
                  <span className="text-muted-foreground text-[10px] tabular-nums">
                    {(field.value ?? '').length}/300
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    placeholder={t('Enter details about this update...')}
                    maxLength={300}
                    className="bg-background min-h-[110px] resize-none text-sm"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button
            onClick={handleSubmit}
            className="gap-2 w-full h-10"
            disabled={isLoading || (entityType !== 'property' && statuses?.length === 0)}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('Saving...')}
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                {t('Save Status Update')}
              </>
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};
