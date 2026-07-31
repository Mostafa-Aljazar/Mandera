'use client';

import React, { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ListPlus,
  CalendarPlus as CalendarIcon,
  Loader2,
  ShieldAlert,
  User,
  Tag,
  StickyNote,
  Send,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { bilingualLabel, employeeDisplayName, type BilingualName } from '@/lib/bilingualLabel';
import { useStatusUpdate } from '@/hooks/useStatusUpdate';
import { useCompanyEmployeesLookup } from '@/hooks/queries/useProperties';
import { StatusUpdateSchema, type TStatusUpdateSchema } from '@/validations/status-update.schema';
import { PROPERTY_STATUS_OPTIONS, isFinalPropertyStatus, isSalesAgent } from '@/lib/permissions';

type EntityType = 'client' | 'owner' | 'property';

interface StatusUpdateEntity {
  id: string;
  employee_id?: string;
  assigned_employee_id?: string;
}

interface StatusUpdateModalProps {
  entityType: EntityType;
  entityData: StatusUpdateEntity;
  statuses?: Array<{ id: string } & BilingualName>;
  onSuccess?: () => void;
  /** PDF: Sales Agent may add owner notes/follow-ups but not change owner status. */
  notesOnly?: boolean;
}

export default function StatusUpdateModal({
  entityType,
  entityData,
  statuses = [],
  onSuccess,
  notesOnly = false,
}: StatusUpdateModalProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { currentUser, company } = useCompanyAuth();
  const { canUpdate, updateStatus, isLoading } = useStatusUpdate();
  const dateLocale = language === "ar" ? ar : enUS;
  const [noteExpanded, setNoteExpanded] = useState(false);
  const { data: employeesData } = useCompanyEmployeesLookup(company?.id);
  const currentEmployee = employeesData?.find((e) => e.id === currentUser?.id);
  const currentUserDisplayName =
    employeeDisplayName(
      currentEmployee,
      language,
      currentUser?.name || currentUser?.email,
    ) ||
    currentUser?.name ||
    currentUser?.email;

  const form = useForm<TStatusUpdateSchema>({
    resolver: zodResolver(StatusUpdateSchema(t, entityType, { notesOnly })),
    defaultValues: {
      status_id: "",
      status_name: "",
      note: "",
      follow_up_date: null,
      follow_up_time: "",
    },
  });

  const hasPermission = canUpdate(entityType, entityData);

  if (!hasPermission) {
    return (
      <div className="flex flex-col justify-center items-center bg-card shadow-[var(--shadow-subtle)] p-6 sm:p-8 border border-destructive/20 rounded-2xl text-center overflow-hidden h-full">
        <div className="flex justify-center items-center bg-destructive/10 mb-4 rounded-full w-14 h-14">
          <ShieldAlert className="w-7 h-7 text-destructive/70" />
        </div>
        <h4 className="mb-1.5 font-semibold text-destructive text-sm text-balance">
          {t('You cannot update the status of this item - it is not assigned to you.')}
        </h4>
        <p className="max-w-[280px] text-destructive/70 text-xs leading-relaxed">
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
        if (found) statusName = bilingualLabel(found, "en") || bilingualLabel(found, language);
      }

      const updatePayload = {
        ...formValues,
        status_name: statusName,
        follow_up_date: formValues.follow_up_date ? new Date(formValues.follow_up_date).toISOString() : null
      };

      await updateStatus(entityType, entityData, updatePayload);

      if (
        entityType === 'property' &&
        statusName &&
        isFinalPropertyStatus(statusName) &&
        isSalesAgent(currentUser?.role)
      ) {
        toast.success(t('Final status change submitted for approval'));
      } else {
        toast.success(t('Status updated successfully'));
      }
      form.reset({ status_id: '', status_name: '', note: '', follow_up_date: null, follow_up_time: '' });
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error((err as Error).message);
    }
  });

  return (
    <div className="@container/status-update flex flex-col bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden h-full">
      <div className="relative flex flex-col @[380px]/status-update:flex-row @[380px]/status-update:items-center @[380px]/status-update:justify-between gap-2.5 bg-gradient-to-br from-primary/[0.07] via-muted/25 to-transparent px-4 sm:px-5 py-3.5 sm:py-4 border-border/50 border-b">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="flex justify-center items-center bg-primary/10 rounded-xl w-9 h-9 text-primary shrink-0">
            <ListPlus className="w-4 h-4" />
          </span>
          <div className="min-w-0 text-start">
            <h4 className="font-outfit font-semibold text-foreground text-sm truncate">
              {t('New Update')}
            </h4>
            <p className="text-muted-foreground text-[11px] leading-snug line-clamp-2">
              {t('Add a status change or note')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full @[380px]/status-update:w-auto @[380px]/status-update:max-w-[55%] bg-background/90 shadow-sm px-2.5 py-1.5 border border-border/60 rounded-full text-muted-foreground text-[11px] min-w-0">
          <User className="w-3 h-3 shrink-0" />
          <span
            className="font-medium text-foreground/80 truncate min-w-0"
            dir={language === 'ar' ? 'auto' : 'ltr'}
            title={currentUserDisplayName || undefined}
          >
            {currentUserDisplayName}
          </span>
        </div>
      </div>

      <Form {...form}>
        <div className="flex flex-col flex-1 gap-4 p-4 sm:p-5">
          {!notesOnly ? (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
              <Tag className="w-3 h-3 shrink-0" />
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
                            <SelectItem key={s.id} value={s.id}>{bilingualLabel(s, language)}</SelectItem>
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
          ) : null}

          {(entityType === 'client' || notesOnly) && (
            <div className="bg-muted/30 p-3 sm:p-3.5 border border-border/40 rounded-xl space-y-3">
              <p className="flex items-center gap-1.5 font-medium text-muted-foreground text-[11px] uppercase tracking-wide">
                <CalendarIcon className="w-3 h-3 shrink-0" />
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
                                  <span dir="ltr">
                                    {format(field.value, 'MMM d, yyyy', { locale: dateLocale })}
                                  </span>
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
                              locale={dateLocale}
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

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem className="flex flex-col space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <Label className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
                    <StickyNote className="w-3 h-3 shrink-0" />
                    {t('Interaction Note')}
                  </Label>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-muted-foreground text-[10px] tabular-nums">
                      {(field.value ?? '').length}/300
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setNoteExpanded(true)}
                      title={t('Maximize')}
                      aria-label={t('Maximize')}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <FormControl>
                  <Textarea
                    placeholder={t('Enter details about this update...')}
                    maxLength={300}
                    className="bg-background !block min-h-[120px] max-h-[480px] h-[140px] resize-y text-sm text-start leading-relaxed field-sizing-fixed"
                    {...field}
                  />
                </FormControl>

                <Dialog open={noteExpanded} onOpenChange={setNoteExpanded}>
                  <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-2xl max-h-[90vh] overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                      <DialogTitle className="flex items-center gap-2 text-base">
                        <StickyNote className="w-4 h-4 text-primary shrink-0" />
                        {t('Interaction Note')}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col flex-1 gap-3 p-5 min-h-0 overflow-auto">
                      <div className="flex justify-between items-center">
                        <p className="text-muted-foreground text-xs">
                          {t('Drag the corner to resize')}
                        </p>
                        <span className="text-muted-foreground text-[11px] tabular-nums">
                          {(field.value ?? '').length}/300
                        </span>
                      </div>
                      <Textarea
                        autoFocus
                        placeholder={t('Enter details about this update...')}
                        maxLength={300}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        className="bg-muted/20 !block min-h-[220px] max-h-[min(70vh,560px)] h-[min(55vh,420px)] resize-y text-sm text-start leading-relaxed field-sizing-fixed"
                      />
                    </div>
                    <DialogFooter className="px-5 py-4 border-t border-border/60 sm:justify-between">
                      <p className="hidden sm:block text-muted-foreground text-xs">
                        {(field.value ?? '').length}/300
                      </p>
                      <Button
                        type="button"
                        onClick={() => setNoteExpanded(false)}
                        className="gap-2 w-full sm:w-auto"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        {t('Done')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </FormItem>
            )}
          />

          <Button
            onClick={handleSubmit}
            className="gap-2 mt-auto w-full h-10 sm:h-11"
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
