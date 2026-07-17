import { useState, useEffect } from 'react';

type SubscriptionStatus = 'active' | 'unknown' | 'pending' | 'expired' | 'expiring_soon';

export const useSubscriptionStatus = (subscriptionStartDate?: string | Date, subscriptionEndDate?: string | Date) => {
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!subscriptionStartDate || !subscriptionEndDate) {
      setStatus('unknown');
      return;
    }

    const now = new Date();
    const startDate = new Date(subscriptionStartDate);
    const endDate = new Date(subscriptionEndDate);

    if (now < startDate) {
      setStatus('pending');
      return;
    }

    if (now > endDate) {
      setStatus('expired');
      setDaysRemaining(0);
      return;
    }

    const timeDiff = endDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    setDaysRemaining(daysDiff);

    if (daysDiff <= 7) {
      setStatus('expiring_soon');
    } else {
      setStatus('active');
    }
  }, [subscriptionStartDate, subscriptionEndDate]);

  return { status, daysRemaining };
};