import { useTranslation } from 'react-i18next';
import { useOwnerLatestStatus } from '@/hooks/queries/useOwners';

interface OwnerStatusBadge {
  color: string;
  text: string;
  icon: 'loader' | 'check' | 'warning' | 'help';
  isOld: boolean;
}

export const useOwnerStatusBadge = (ownerId?: string, companyId?: string): OwnerStatusBadge => {
  const { t } = useTranslation();
  const { data: latest, isLoading, isError } = useOwnerLatestStatus(ownerId, companyId);

  if (isLoading) {
    return { color: 'bg-muted text-muted-foreground', text: t('Checking...'), icon: 'loader', isOld: false };
  }

  if (isError) {
    return { color: 'bg-muted text-muted-foreground', text: t('Unknown'), icon: 'help', isOld: true };
  }

  if (!latest) {
    return { color: 'bg-rose-500/10 text-rose-600 border-rose-200', text: t('Outdated'), icon: 'warning', isOld: true };
  }

  const lastUpdate = new Date(latest.created_at);
  const now = new Date();
  const diffDays = Math.ceil(Math.abs(now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) {
    return { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', text: t('Updated'), icon: 'check', isOld: false };
  }
  return { color: 'bg-rose-500/10 text-rose-600 border-rose-200', text: t('Outdated'), icon: 'warning', isOld: true };
};
