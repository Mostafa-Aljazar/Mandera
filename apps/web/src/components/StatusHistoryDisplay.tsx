'use client';

import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, User, Trash2, Loader2, CalendarClock } from 'lucide-react';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'sonner';
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

const StatusHistoryDisplay = ({ entityType, entityId, refreshTrigger }: StatusHistoryDisplayProps) => {
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
    } catch (error) {
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

    return (
      <Badge variant="outline" className="bg-background font-medium text-primary border-primary/20 shrink-0 shadow-sm">
        {statusText}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col bg-card border rounded-xl overflow-hidden h-full max-h-[600px]">
      <div className="p-4 border-b bg-muted/20 shrink-0">
        <h4 className="font-semibold flex items-center gap-2 font-outfit">
          <History className="h-4 w-4 text-primary" /> {t('Activity Timeline')}
        </h4>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 hide-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 bg-muted/10 rounded-xl border border-dashed border-border/60 mx-2">
            <History className="h-10 w-10 mx-auto opacity-20 mb-3" />
            <p className="text-sm font-medium text-foreground/70">{t('No activity history')}</p>
            <p className="text-xs mt-1">{t("Updates to this item's status will appear here.")}</p>
          </div>
        ) : (
          history.map((h) => {
            const canModify = currentUser?.role === 'company_super_admin' || currentUser?.id === h.created_by;

            return (
              <div key={h.id} className="relative pl-6 rtl:pl-0 rtl:pr-6 pb-1 border-l-2 rtl:border-l-0 rtl:border-r-2 border-muted last:border-transparent last:pb-0 group">
                <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] rtl:left-auto rtl:-right-[7px] top-1.5 ring-4 ring-background"></div>

                <div className="bg-muted/20 rounded-xl p-4 border border-border/50 shadow-sm hover:border-primary/20 transition-colors">
                  <div className="flex justify-between items-start mb-3 gap-4">
                    {renderStatusBadge(h)}

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap pt-1 font-medium">
                        {format(new Date(h.created), 'MMM d, yyyy HH:mm')}
                      </span>
                      {canModify && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10 -mt-1 -mr-2 rtl:-mr-0 rtl:-ml-2"
                            onClick={() => handleDelete(h.id, h.created_by)}
                            title={t('Delete Record')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {h.note && <p className="text-sm text-foreground/80 mb-3 leading-relaxed whitespace-pre-wrap">{h.note}</p>}

                  {h.follow_up_date && (
                     <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 w-fit px-2 py-1 rounded mb-3">
                       <CalendarClock className="h-3.5 w-3.5" />
                       {t('Follow-up scheduled:')} {format(new Date(h.follow_up_date), 'MMM d, yyyy')}
                     </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t border-border/40 pt-2 mt-1">
                    <User className="h-3.5 w-3.5 opacity-70 shrink-0" />
                    <span>
                      {t('Updated by:')} <span className="font-medium text-foreground/70">{h.created_by_name || t('Unknown')}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StatusHistoryDisplay;
