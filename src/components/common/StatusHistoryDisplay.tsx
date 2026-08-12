'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import {
  History,
  Trash2,
  Loader2,
  CalendarClock,
  MessageSquare,
} from 'lucide-react';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { canEditActivityHistory } from '@/lib/permissions';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { bilingualLabel } from '@/lib/bilingualLabel';
import { format, isToday, isYesterday, type Locale } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useStatusHistory, useDeleteStatusHistoryRecord } from '@/hooks/queries/useStatusHistory';

type HistoryEntityType = 'client' | 'owner' | 'property';

interface HistoryRecord {
  id: string;
  created: string;
  created_by: string;
  created_by_name?: string;
  created_by_name_en?: string | null;
  created_by_name_ar?: string | null;
  note?: string;
  status?: string;
  follow_up_date?: string;
}

interface StatusHistoryDisplayProps {
  entityType: HistoryEntityType;
  entityId?: string;
  refreshTrigger?: number;
  hideStatus?: boolean;
}

function formatRelativeDate(
  date: Date,
  t: (key: string) => string,
  locale: Locale,
) {
  const time = format(date, 'HH:mm', { locale });
  if (isToday(date)) return `${t('Today')} · ${time}`;
  if (isYesterday(date)) return `${t('Yesterday')} · ${time}`;
  return format(date, 'MMM d, yyyy · HH:mm', { locale });
}

const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  Sold: 'bg-blue-500/10 text-blue-700 border-blue-200',
  Rented: 'bg-purple-500/10 text-purple-700 border-purple-200',
  Hold: 'bg-amber-500/10 text-amber-700 border-amber-200',
  'Deal Completed': 'bg-slate-500/10 text-slate-700 border-slate-200',
};

export default function StatusHistoryDisplay({ entityType, entityId, refreshTrigger, hideStatus = false }: StatusHistoryDisplayProps) {
  const { currentUser, company } = useCompanyAuth();
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === 'ar' ? ar : enUS;

  const {
    data: historyData,
    isLoading,
    refetch,
  } = useStatusHistory(entityType, entityId, company?.id);
  const deleteRecord = useDeleteStatusHistoryRecord();

  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  const history: HistoryRecord[] = (historyData ?? []).map((h) => ({
    id: h.id,
    created: h.created_at,
    created_by: h.created_by ?? '',
    created_by_name: h.created_by_name ?? undefined,
    created_by_name_en: h.created_by_name_en ?? null,
    created_by_name_ar: h.created_by_name_ar ?? null,
    note: h.note ?? undefined,
    status: hideStatus
      ? undefined
      : bilingualLabel(
          {
            name_en: h.status_name_en,
            name_ar: h.status_name_ar,
            name: h.status_name ?? h.status,
          },
          language,
        ) || undefined,
    follow_up_date: h.follow_up_date ?? undefined,
  }));

  const creatorDisplayName = (h: HistoryRecord) =>
    bilingualLabel(
      {
        name_en: h.created_by_name_en,
        name_ar: h.created_by_name_ar,
        name: h.created_by_name,
      },
      language,
    ) || h.created_by_name || t('Unknown');

  const translateHistoryNote = (note: string) => {
    const approved = note.match(
      /^Approved final status change to (.+)$/i,
    );
    if (approved) {
      const status = approved[1].trim();
      return t("Approved final status change to {{status}}", {
        status: i18n.exists(status) ? t(status) : status,
      });
    }
    if (i18n.exists(note)) return t(note);
    return note;
  };

  const canDeleteHistory = canEditActivityHistory(currentUser?.role);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const requestDelete = (recordId: string) => {
    if (!canDeleteHistory || !company?.id) {
      toast.error(t('You do not have permission to delete this record.'));
      return;
    }
    setPendingDeleteId(recordId);
  };

  const handleDelete = async () => {
    if (!pendingDeleteId || !company?.id) return;

    try {
      const result = await deleteRecord.mutateAsync({
        entityType,
        recordId: pendingDeleteId,
        companyId: company.id,
      });
      if (result.error) throw new Error(result.error);
      setPendingDeleteId(null);
      toast.success(t('Record deleted successfully'));
    } catch {
      toast.error(t('Failed to delete record.'));
    }
  };

  const renderStatusBadge = (h: HistoryRecord) => {
    let statusText = t('Updated');
    if (entityType === 'property') {
      statusText = h.status ? t(h.status) : statusText;
    } else {
      statusText = h.status || statusText;
    }

    const colorClass =
      entityType === 'property' && h.status
        ? STATUS_COLORS[h.status] || 'bg-primary/10 text-primary border-primary/20'
        : 'bg-primary/10 text-primary border-primary/20';

    return (
      <Badge variant="outline" className={cn('font-medium text-xs shadow-sm shrink-0', colorClass)}>
        {statusText}
      </Badge>
    );
  };

  return (
    <div className="@container/status-history flex flex-col bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden h-full min-h-[280px] sm:min-h-[320px] max-h-[min(65vh,560px)] xl:max-h-none xl:min-h-full">
      <div className="relative flex items-start @[360px]/status-history:items-center justify-between gap-2.5 bg-gradient-to-br from-primary/[0.07] via-muted/25 to-transparent px-4 sm:px-5 py-3.5 sm:py-4 border-border/50 border-b shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="flex justify-center items-center bg-primary/10 rounded-xl w-9 h-9 text-primary shrink-0">
            <History className="w-4 h-4" />
          </span>
          <div className="min-w-0 text-start">
            <h4 className="font-outfit font-semibold text-foreground text-sm truncate">
              {t('Activity Timeline')}
            </h4>
            <p className="text-muted-foreground text-[11px] leading-snug line-clamp-2">
              {t('Status changes and notes history')}
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary tabular-nums text-[11px] shrink-0">
            {history.length}
          </Badge>
        )}
      </div>

      <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-muted-foreground text-xs">{t('Loading history...')}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col justify-center items-center bg-muted/20 px-4 py-12 sm:py-14 border border-border/50 border-dashed rounded-xl text-center h-full min-h-[220px]">
            <div className="flex justify-center items-center bg-muted/50 mb-3 rounded-full w-12 h-12">
              <History className="opacity-40 w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground/80 text-sm">
              {t('No activity history')}
            </p>
            <p className="mt-1 max-w-[240px] text-muted-foreground text-xs leading-relaxed">
              {t("Updates to this item's status will appear here.")}
            </p>
          </div>
        ) : (
          <div className="relative">
            {history.map((h, index) => {
              const canModify = canDeleteHistory;
              const isLast = index === history.length - 1;
              const createdDate = new Date(h.created);

              return (
                <div
                  key={h.id}
                  className="group relative flex gap-3 sm:gap-4 pb-5 last:pb-0"
                >
                  <div className="flex flex-col items-center shrink-0 w-7 sm:w-8">
                    <div
                      className={cn(
                        'z-10 flex justify-center items-center rounded-full w-7 h-7 sm:w-8 sm:h-8 ring-4 ring-background shrink-0',
                        index === 0
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground border border-border/60',
                      )}
                    >
                      {h.note ? (
                        <MessageSquare className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                      ) : (
                        <History className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                      )}
                    </div>
                    {!isLast && (
                      <div className="flex-1 bg-border/70 mt-1.5 w-px min-h-[16px]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 bg-muted/20 hover:bg-muted/35 group-hover:border-primary/20 p-3.5 sm:p-4 border border-border/50 rounded-xl transition-colors">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between sm:items-start mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderStatusBadge(h)}
                      </div>
                      <div className="flex items-center gap-1.5 self-start">
                        <time
                          className="text-muted-foreground text-[11px] font-medium whitespace-nowrap"
                          dateTime={h.created}
                          dir="ltr"
                        >
                          {formatRelativeDate(createdDate, t, dateLocale)}
                        </time>
                        {canModify && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-destructive/10 -me-1 w-7 h-7 text-destructive sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            onClick={() => requestDelete(h.id)}
                            title={t('Delete Record')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {h.note && (
                      <p className="mb-3 text-foreground/85 text-sm leading-relaxed whitespace-pre-wrap text-start">
                        {translateHistoryNote(h.note)}
                      </p>
                    )}

                    {h.follow_up_date && (
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 mb-3 px-2.5 py-1 border border-amber-200/50 rounded-md font-medium text-amber-700 text-xs">
                        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {t('Follow-up scheduled:')}{' '}
                          <span dir="ltr">
                            {format(new Date(h.follow_up_date), 'MMM d, yyyy', {
                              locale: dateLocale,
                            })}
                          </span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2.5 border-border/40 border-t">
                      <div className="flex justify-center items-center bg-primary/10 rounded-full w-6 h-6 font-semibold text-primary text-[10px] shrink-0 overflow-hidden">
                        {creatorDisplayName(h).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-muted-foreground text-xs min-w-0">
                        {t('Updated by:')}{' '}
                        <span
                          className="font-medium text-foreground/80"
                          dir={language === 'ar' ? 'auto' : 'ltr'}
                        >
                          {creatorDisplayName(h)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title={t('Delete this record?')}
        description={t(
          'This status history entry will be removed permanently. This cannot be undone.',
        )}
        confirmLabel={t('Delete record')}
        isSubmitting={deleteRecord.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
};
