import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useTranslation } from 'react-i18next';

interface OwnerStatusBadge {
  color: string;
  text: string;
  icon: 'loader' | 'check' | 'warning' | 'help';
  isOld: boolean;
}

export const useOwnerStatusBadge = (ownerId?: string, companyId?: string) => {
  const { t } = useTranslation();
  const [badge, setBadge] = useState<OwnerStatusBadge>({ color: 'bg-muted text-muted-foreground', text: t('Checking...'), icon: 'loader', isOld: false });

  useEffect(() => {
    if (!ownerId || !companyId) return;
    
    let isMounted = true;
    
    const fetchStatus = async () => {
      try {
        const records = await pb.collection('owner_status_history').getList(1, 1, {
          filter: `owner_id="${ownerId}" && company_id="${companyId}"`,
          sort: '-created',
          $autoCancel: false
        });
        
        if (!isMounted) return;

        if (records.items.length > 0) {
          const lastUpdate = new Date(records.items[0].created);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 30) {
            setBadge({ color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', text: t('Updated'), icon: 'check', isOld: false });
          } else {
            setBadge({ color: 'bg-rose-500/10 text-rose-600 border-rose-200', text: t('Outdated'), icon: 'warning', isOld: true });
          }
        } else {
          setBadge({ color: 'bg-rose-500/10 text-rose-600 border-rose-200', text: t('Outdated'), icon: 'warning', isOld: true });
        }
      } catch (e) {
        console.error("Error fetching owner status badge:", e);
        if (isMounted) {
          setBadge({ color: 'bg-muted text-muted-foreground', text: t('Unknown'), icon: 'help', isOld: true });
        }
      }
    };
    
    fetchStatus();
    
    return () => {
      isMounted = false;
    };
  }, [ownerId, companyId]);

  return badge;
};