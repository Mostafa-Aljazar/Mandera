'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import pb from '@/lib/pocketbaseClient';
import { TrendingUp, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { ClientStatus } from '../../types/pocketbase.types';

interface PipelineStatus extends ClientStatus {
  count: number;
}

const ClientPipelineWidget = () => {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const [pipelineData, setPipelineData] = useState<PipelineStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);

  const fetchPipelineData = useCallback(async () => {
    if (!company?.id) return;
    
    try {
      // 1. Fetch statuses ordered by priority_order
      const statusesRes = await pb.collection('client_statuses').getFullList({
        filter: `company_id="${company.id}"`,
        sort: 'priority_order',
        $autoCancel: false
      });

      // 2. Fetch all clients for the company
      const clientsRes = await pb.collection('clients').getFullList({
        filter: `company_id="${company.id}"`,
        $autoCancel: false
      });

      const statusCounts: Record<string, number> = {};
      let totalAssigned = 0;

      // Check if 'status_id' exists directly on the client record
      const hasStatusIdField = clientsRes.some(c => 'status_id' in c);

      if (hasStatusIdField) {
        // Option A: Count directly from client.status_id
        clientsRes.forEach(client => {
          if (client.status_id) {
            statusCounts[client.status_id] = (statusCounts[client.status_id] || 0) + 1;
            totalAssigned++;
          }
        });
      } else {
        // Option B: Fallback to evaluating the latest history record for each client
        const historyRes = await pb.collection('client_status_history').getFullList({
          filter: `company_id="${company.id}"`,
          sort: '-created', // Descending so the first encountered is the latest
          $autoCancel: false
        });

        const latestStatusMap: Record<string, string> = {};
        historyRes.forEach(record => {
          if (record.client_id && !latestStatusMap[record.client_id]) {
            latestStatusMap[record.client_id] = record.status_id;
          }
        });

        // Group and count using the latest mapped status
        clientsRes.forEach(client => {
          const sId = latestStatusMap[client.id];
          if (sId) {
            statusCounts[sId] = (statusCounts[sId] || 0) + 1;
            totalAssigned++;
          }
        });
      }

      setTotalClients(totalAssigned);

      // 3. Map the counts back to the statuses in order
      const dataWithCounts: PipelineStatus[] = statusesRes.map((status) => ({
        ...(status as unknown as ClientStatus),
        count: statusCounts[status.id] || 0
      }));

      setPipelineData(dataWithCounts);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchPipelineData();

    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchPipelineData();
      }, 1000);
    };

    // Listen for changes that affect pipeline counts
    pb.collection('client_statuses').subscribe('*', debouncedFetch);
    pb.collection('client_status_history').subscribe('*', debouncedFetch);
    pb.collection('clients').subscribe('*', debouncedFetch);

    return () => {
      clearTimeout(timeoutId);
      pb.collection('client_statuses').unsubscribe('*');
      pb.collection('client_status_history').unsubscribe('*');
      pb.collection('clients').unsubscribe('*');
    };
  }, [fetchPipelineData]);

  if (isLoading) {
    return (
      <div className="w-full h-[110px] flex justify-center items-center bg-card rounded-xl border shadow-sm mb-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
      </div>
    );
  }

  if (pipelineData.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-1">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold font-outfit text-foreground">
          {t('Client Pipeline')}
        </h2>
      </div>
      
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 gap-3 hide-scrollbar snap-x">
        {pipelineData.map((status, index) => {
          const percentage = totalClients > 0 ? Math.round((status.count / totalClients) * 100) : 0;
          
          return (
            <motion.div
              key={status.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="snap-start shrink-0 min-w-[160px] max-w-[200px] flex-1"
            >
              <div className="h-[115px] p-3 box-border bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 relative group flex flex-col">
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-primary/10 group-hover:bg-primary/30 transition-colors rounded-t-xl" />
                
                {/* Header: Title and Priority */}
                <div className="flex justify-between items-start w-full gap-2 mb-1">
                  <h3 className="font-semibold text-[13px] leading-tight text-foreground truncate" title={status.name}>
                    {status.name}
                  </h3>
                  <span className="text-[10px] font-bold text-muted-foreground/80 bg-muted/80 px-1.5 py-0.5 rounded flex-shrink-0">
                    #{status.priority_order || index + 1}
                  </span>
                </div>
                
                {/* Body: Large Count */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-outfit text-primary tracking-tight tabular-nums leading-none">
                      {status.count}
                    </span>
                  </div>
                </div>
                
                {/* Footer: Percentage and Label */}
                <div className="mt-auto w-full pt-2">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                      <span>{t('clients')}</span>
                      <span>{percentage}%</span>
                    </div>
                    {/* Progress bar indicator */}
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientPipelineWidget;