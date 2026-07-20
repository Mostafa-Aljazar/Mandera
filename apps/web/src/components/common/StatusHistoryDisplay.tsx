'use client';

import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  History,
  User,
  Trash2,
  Loader2,
  CalendarClock,
  MessageSquare,
} from 'lucide-react';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useTranslation } from 'react-i18next';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useStatusHistory, useDeleteStatusHistoryRecord } from '@/hooks/queries/useStatusHistory';

type HistoryEntityType = 'client' | 'owner' | 'property';

interface HistoryRecord {
  id: string;
  created: string;
  created_by: string;
  created_by_name?: string;
  note?: string;
  status?: string;
  follow_up_date?: string;
}

interface StatusHistoryDisplayProps {
  entityType: HistoryEntityType;
  entityId?: string;
  refreshTrigger?: number;
}

function formatRelativeDate(date: Date, t: (key: string) => string) {
  if (isToday(date)) return `${t('Today')} · ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `${t('Yesterday')} · ${format(date, 'HH:mm')}`;
  return format(date, 'MMM d, yyyy · HH:mm');
}

const STATUS_COLORS: Record<string, string> = {
  Available: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  Sold: 'bg-blue-500/10 text-blue-700 border-blue-200',
  Rented: 'bg-purple-500/10 text-purple-700 border-purple-200',
  Hold: 'bg-amber-500/10 text-amber-700 border-amber-200',
  'Deal Completed': 'bg-slate-500/10 text-slate-700 border-slate-200',
};

export default function StatusHistoryDisplay({ entityType, entityId, refreshTrigger }: StatusHistoryDisplayProps) {
  const { currentUser, company } = useCompanyAuth();
  const { t } = useTranslation();

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
    note: h.note ?? undefined,
    status: h.status ?? h.status_name ?? undefined,
    follow_up_date: h.follow_up_date ?? undefined,
  }));

  const handleDelete = async (recordId: string, creatorId: string) => {
    if (currentUser?.role !== 'company_super_admin' && currentUser?.id !== creatorId) {
      toast.error(t('You do not have permission to delete this record.'));
      return;
    }

    if (!window.confirm(t('Are you sure you want to delete this status history record?'))) return;

    try {
      const result = await deleteRecord.mutateAsync({ entityType, recordId });
      if (result.error) throw new Error(result.error);
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
    <div className="flex flex-col bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-xl overflow-hidden h-full max-h-[600px]">
      {/* Header */}
      <div className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-primary/[0.06] via-muted/30 to-transparent px-5 py-4 border-border/50 border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="flex justify-center items-center bg-primary/10 rounded-lg w-8 h-8 text-primary">
            <History className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-outfit font-semibold text-foreground text-sm">
              {t('Activity Timeline')}
            </h4>
            <p className="text-muted-foreground text-[11px]">
              {t('Status changes and notes history')}
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary tabular-nums text-[11px]">
            {history.length}
          </Badge>
        )}
      </div>

      <div className="flex-1 space-y-0 p-5 overflow-y-auto hide-scrollbar">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-muted-foreground text-xs">{t('Loading history...')}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center bg-muted/20 mx-1 py-14 border border-border/50 border-dashed rounded-xl text-center">
            <div className="flex justify-center items-center bg-muted/50 mb-3 rounded-full w-12 h-12">
              <History className="opacity-40 w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground/80 text-sm">
              {t('No activity history')}
            </p>
            <p className="mt-1 max-w-[220px] text-muted-foreground text-xs leading-relaxed">
              {t("Updates to this item's status will appear here.")}
            </p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {history.map((h, index) => {
              const canModify =
                currentUser?.role === 'company_super_admin' ||
                currentUser?.id === h.created_by;
              const isLast = index === history.length - 1;
              const createdDate = new Date(h.created);

              return (
                <div
                  key={h.id}
                  className="group relative flex gap-4 pb-6 last:pb-0"
                >
                  {/* Timeline rail */}
                  <div className="flex flex-col items-center shrink-0 w-8">
                    <div
                      className={cn(
                        'z-10 flex justify-center items-center rounded-full w-8 h-8 ring-4 ring-background shrink-0',
                        index === 0
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground border border-border/60',
                      )}
                    >
                      {h.note ? (
                        <MessageSquare className="w-3.5 h-3.5" />
                      ) : (
                        <History className="w-3.5 h-3.5" />
                      )}
                    </div>
                    {!isLast && (
                      <div className="flex-1 bg-border/60 mt-1 w-px min-h-[12px]" />
                    )}
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0 bg-muted/20 hover:bg-muted/35 group-hover:border-primary/20 p-4 border border-border/50 rounded-xl transition-colors">
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2.5">
                      {renderStatusBadge(h)}
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">
                          {formatRelativeDate(createdDate, t)}
                        </span>
                        {canModify && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-destructive/10 -me-1 -mt-0.5 w-6 h-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDelete(h.id, h.created_by)}
                            title={t('Delete Record')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {h.note && (
                      <p className="mb-3 text-foreground/85 text-sm leading-relaxed whitespace-pre-wrap">
                        {h.note}
                      </p>
                    )}

                    {h.follow_up_date && (
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 mb-3 px-2.5 py-1 border border-amber-200/50 rounded-md font-medium text-amber-700 text-xs">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {t('Follow-up scheduled:')}{' '}
                        {format(new Date(h.follow_up_date), 'MMM d, yyyy')}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2.5 border-border/40 border-t">
                      <div className="flex justify-center items-center bg-primary/10 rounded-full w-5 h-5 font-semibold text-primary text-[10px]">
                        {(h.created_by_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {t('Updated by:')}{' '}
                        <span className="font-medium text-foreground/75">
                          {h.created_by_name || t('Unknown')}
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
    </div>
  );
};
